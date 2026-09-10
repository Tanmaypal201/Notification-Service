const Jwt = require("jsonwebtoken");
const ACCESS_TOKEN_SECRET = "Snehamay&1014";
const REFRESH_TOKEN_SECRET = "Snehamay&1014";

const generateAccessToken = (user) => {
    if (!user) {
        throw new Error("User object is required");
    }
    return Jwt.sign(
        {
            _id: user._id,
            username: user.username,
            email: user.email,
        }, ACCESS_TOKEN_SECRET,
        { expiresIn: "15m", }
    );
};

const generateRefreshToken = (user) => {
    if (!user) {
        throw new Error("User object is required");
    }
    return Jwt.sign(
        { _id: user._id },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d", }
    );
};

const getaccestoken = (accetoken) => {
    if (!accetoken) {
        throw new Error('Token is required');
    }
    try {
        return Jwt.verify(accetoken, ACCESS_TOKEN_SECRET);
    } catch (error) {
        return null;
    }
}

const getrefreshtoken = (refreshtoken) => {
    if (!refreshtoken) {
        throw new Error('Token is required');
    }
    try {
        return Jwt.verify(refreshtoken, REFRESH_TOKEN_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    getaccestoken,
    getrefreshtoken
}