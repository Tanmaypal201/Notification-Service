const User = require("../models/users");
const { getrefreshtoken, generateAccessToken } = require("../services/authservice");

const checkRefreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        console.log(refreshToken);

        if (!refreshToken) {
            return res.status(401).json({
                message: "Refresh token not found"
            });
        }
        const decoded = getrefreshtoken(refreshToken);
        console.log(decoded);
        if (!decoded) {
            return res.status(401).json({
                message: "Invalid refresh token"
            });
        }

        const user = await User.findById(decoded._id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.refreshToken != refreshToken) {
            return res.status(401).json({
                message: "Invalid refresh token"
            });
        }

        const accessToken = generateAccessToken(user);
        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: 15 * 60 * 1000,
        });

        return res.status(200).json({
            message: "Access token refreshed",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
            },
        });

    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }
};

module.exports = checkRefreshToken;