const express = require("express");
const passport = require("../config/oauthconf");
const { generateAccessToken, generateRefreshToken, getaccestoken, getrefreshtoken } = require("../services/authservice");
const User = require("../models/users");

const router = express.Router();

router.get("/google", passport.authenticate("google", {
    scope: ["profile", "email"],
}));

router.get("/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login", session: false
    }),
    async (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.redirect("/");
            }
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);
            res.cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 15 * 60 * 1000,
            });
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            await User.findOneAndUpdate({ _id: user._id }, { refreshToken });
            return res.redirect("http://localhost:3000/");
        }
        catch (err) {
            console.error("Error in Google OAuth callback:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
);

module.exports = router;