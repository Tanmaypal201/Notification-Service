const User = require("../models/users");
const redis = require("../config/redis");
const bcrypt = require("bcrypt");
const { generateAccessToken, generateRefreshToken, getaccestoken } = require("../services/authservice");
const { sendVerify, sendForget } = require("../services/emailservice");
const { publishUserCreated } = require("../nats/publisher");

const OTP_TTL_USER = 300;
const OTP_TTL_SECONDS = 120;
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge,
});

const sanitizeUser = (userDoc) => {
    const user = userDoc.toObject ? userDoc.toObject() : userDoc;
    const { password, refreshToken, ...safeUser } = user;
    console.log(safeUser);
    return safeUser;
};

const signupuser = async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    console.log("username", username)
    console.log("email", email)
    console.log("password", password)

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("hashedPassword", hashedPassword);
        await redis.set(
            `signup:user:${email}`,
            JSON.stringify({ username, email, password: hashedPassword }),
            "EX",
            OTP_TTL_USER
        );
        console.log("redis", JSON.stringify({ username, email, password: hashedPassword }))

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(otp);
        await redis.set(`signup:otp:${email}`, otp, "EX", OTP_TTL_SECONDS);
        console.log("redis", JSON.stringify({ otp }))

        await sendVerify(email, otp);

        return res.status(201).json({ message: "Signup initiated. Please check your email for the OTP." });
    } catch (err) {
        console.error("signupuser error:", err);
        return res.status(500).json({ message: "Something went wrong during signup" });
    }
};

const loginuser = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (!existingUser) {
            return res.status(400).json({ message: "User not found" });
        }

        const passwordMatch = await bcrypt.compare(password, existingUser.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const accessToken = generateAccessToken(existingUser);
        const refreshToken = generateRefreshToken(existingUser);
        await User.findOneAndUpdate({ _id: existingUser._id }, { refreshToken });

        res.cookie("accessToken", accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
        res.cookie("refreshToken", refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

        return res.status(200).json({
            message: "User logged in successfully",
            user: sanitizeUser(existingUser),
        });
    } catch (err) {
        console.error("loginuser error:", err);
        return res.status(500).json({ message: "Something went wrong during login" });
    }
};

const verficationcode = async (req, res) => {
    const { otp, email } = req.body;
    if (!otp || !email) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const storedOtp = await redis.get(`signup:otp:${email}`);
        if (!storedOtp) {
            return res.status(400).json({ message: "OTP not found or expired" });
        }
        if (storedOtp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const userJson = await redis.get(`signup:user:${email}`);
        if (!userJson) {
            return res.status(400).json({ message: "User data not found or expired, please sign up again" });
        }

        const parsedUser = JSON.parse(userJson);
        const newUser = await User.create(parsedUser);

        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser);
        await User.findOneAndUpdate({ _id: newUser._id }, { refreshToken });

        res.cookie("accessToken", accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
        res.cookie("refreshToken", refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

        await redis.del(`signup:user:${email}`);
        await redis.del(`signup:otp:${email}`);

        await publishUserCreated(newUser);

        return res.status(201).json({
            message: "User created successfully",
            user: sanitizeUser(newUser),
        });
    } catch (err) {
        console.error("verficationcode error:", err);
        return res.status(500).json({ message: "Something went wrong during verification" });
    }
};

const resendotp = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    try {
        const userJson = await redis.get(`signup:user:${email}`);
        if (!userJson) {
            return res.status(400).json({ message: "User data not found or expired, please sign up again" });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await redis.set(`signup:otp:${email}`, otp, "EX", OTP_TTL_SECONDS);
        await sendVerify(email, otp);
        return res.status(200).json({ message: "OTP resent successfully" });
    } catch (err) {
        console.error("resendotp error:", err);
        return res.status(500).json({ message: "Something went wrong during resend OTP" });
    }

}

const forgetpassword = async (req, res) => {
    const { email } = req.body;
    const exists = await User.findOne({ email })
    if (!exists) {
        return res.status(400).json({ message: "User not found" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`forget:otp:${email}`, otp, "EX", 300);
    await sendForget(email, otp);
    return res.status(200).json({ message: "OTP sent successfully" });
}

const verifyforgetotp = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ message: "All fields are required" });
    }
    try {
        const storedOtp = await redis.get(`forget:otp:${email}`);
        if (!storedOtp) {
            return res.status(400).json({ message: "OTP not found or expired" });
        }
        if (storedOtp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }
        await redis.del(`forget:otp:${email}`);
        await redis.set(`verify:forgetotp:${email}`, "true", "EX", 600);
        return res.status(200).json({ message: "OTP verified successfully" });
    } catch (err) {
        console.error("verifyforgetotp error:", err);
        return res.status(500).json({ message: "Something went wrong during verification" });
    }
}

const updatepassword = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    try {
        const verified = await redis.get(`verify:forgetotp:${email}`);
        if (verified !== "true") {
            return res.status(400).json({ message: "You are not verified" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findOneAndUpdate({ email }, { password: hashedPassword });
        await redis.del(`verify:forgetotp:${email}`);
        return res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("updatepassword error:", err);
        return res.status(500).json({ message: "Something went wrong during update password" });
    }
}

const logoutuser = async (req, res) => {
    try {
        const { userId } = req.body || {};
        let idToClear = userId;

        if (!idToClear && req.cookies?.accessToken) {
            const decoded = getaccestoken(req.cookies.accessToken);
            if (decoded?._id) {
                idToClear = decoded._id;
            }
        }

        if (idToClear) {
            await User.findOneAndUpdate({ _id: idToClear }, { refreshToken: null });
        }

        const clearOpts = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
        };

        res.clearCookie("accessToken", clearOpts);
        res.clearCookie("refreshToken", clearOpts);

        return res.status(200).json({ message: "User logged out successfully" });
    } catch (err) {
        console.error("logoutuser error:", err);
        return res.status(500).json({ message: "Something went wrong during logout" });
    }
};

const loginwithgooleController = async (profile) => {
    const email = profile.emails[0].value;
    const googleId = profile.id;
    const profilePicture = profile.photos?.[0]?.value || null;
    console.log(profilePicture);

    const buildGoogleUsername = async () => {
        const rawBase = (email.split("@")[0] || "user")
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[^a-z0-9._]/g, "");

        const base = rawBase || "user";
        let candidate = base;
        let counter = 1;
        while (await User.findOne({ username: candidate })) {
            candidate = `${base}${counter}`;
            counter += 1;
        }
        return candidate;
    };

    let user = await User.findOne({ email: email });
    if (!user) {
        const generatedUsername = await buildGoogleUsername();
        user = await User.create({
            username: generatedUsername,
            email: email,
            googleId: googleId,
            password: null,
            isVerified: true,
            profilepicture: profilePicture,
        });
    } else {
        if (!user.googleId) {
            user.googleId = googleId;
            if (!user.profilepicture && profilePicture) {
                user.profilepicture = profilePicture;
            }
            await user.save();
        } else if (!user.profilepicture && profilePicture) {
            user.profilepicture = profilePicture;
            await user.save();
        }
    }
    console.log("user", user);
    return user;
};

const profile= async(req,res)=>{
    try {
        const userId = req.user?._id;
        const user = await User.findById(userId).select("username email profilepicture");
        console.log(user);
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}

module.exports = { signupuser, loginuser, verficationcode, resendotp, forgetpassword, verifyforgetotp, updatepassword, logoutuser, loginwithgooleController , profile };