const { getaccestoken } = require("../services/authservice");

const checkAuthentication = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken;
        if (!token) {
            req.user = null;
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = getaccestoken(token);
        if (!user) {
            req.user = null;
            return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = user;
        next();
    }
    catch (err) {
        console.log(err);
        req.user = null;
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = checkAuthentication;