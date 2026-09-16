const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/users");
const redis = require("../config/redis");
const { generateAccessToken, generateRefreshToken } = require("../services/authservice");
const { sendVerifyAdmin } = require("../services/emailservice");
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;
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
    return safeUser;
};

const adminsingup = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        if (!email || !username || !password) {
            return res.status(400).json({ message: "All field required" })
        }
        const existingAdmin = await User.findOne({ $or: [{ username }, { email }] });

        if (existingAdmin) {
            return res.status(400).json({
                message: "Admin with this username or email already exists"
            });
        }

        const newAdmin = await User.create({
            username,
            email,
            password: await bcrypt.hash(password, 10),
            role: "admin"
        });

        return res.status(200).json({
            message: "Admin created successfully",
            admin: sanitizeUser(newAdmin)
        });

    } catch (err) {
        console.error("adminsingup error:", err);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}

const adminlogin = async (req, res) => {
    try {
        const { password, username } = req.body;
        if (!password || !username) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        const admin = await User.findOne({ username });
        if (!admin || admin.role !== "admin") {
            return res.status(400).json({
                message: "Admin not found"
            });
        }

        const passwordmatch = await bcrypt.compare(password, admin.password);
        if (!passwordmatch) {
            return res.status(400).json({
                message: "Incorrect password"
            });
        }

        const token = crypto.randomBytes(32).toString("hex");

        await redis.set(`admin:verify:${token}`, admin._id.toString(), "EX", 60 * 5);
        await sendVerifyAdmin(admin.email, token);

        return res.status(200).json({
            message: "Verification email sent. Please check your inbox and click the verification link to log in."
        });
    } catch (err) {
        console.error("adminlogin error:", err);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

const verfiyadminlogin = async (req, res) => {
    try {
        const token = req.params.token;
        if (!token) {
            return res.status(400).json({
                message: "Token not found"
            });
        }
        const adminid = await redis.get(`admin:verify:${token}`);
        if (!adminid) {
            return res.status(400).json({
                message: "Token is invalid or has expired"
            });
        }
        await redis.del(`admin:verify:${token}`);
        const admin = await User.findById(adminid);
        if (!admin) {
            return res.status(400).json({
                message: "Admin not found"
            });
        }
        const accessToken = generateAccessToken(admin, "admin");
        const refreshToken = generateRefreshToken(admin, "admin");

        await User.findOneAndUpdate({ _id: admin._id }, { refreshToken, role: "admin" });

        res.cookie("accessToken", accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
        res.cookie("refreshToken", refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

        return res.status(200).json({
            message: "Admin logged in successfully",
            admin: sanitizeUser(admin)
        });
    } catch (err) {
        console.error("verfiyadminlogin error:", err);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

module.exports = {
    adminlogin,
    verfiyadminlogin,
    adminsingup,
};