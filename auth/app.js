require("dotenv").config();
const express = require("express");
const app = express();
const userlogin = require("./routes/userlogin");
const oauthroutes = require("./routes/oauthroutes");
const { ratelimiter } = require("./middleware/ratelimiter");
const checkAuthentication = require("./middleware/checkauth");
const cookieParser = require("cookie-parser");
const checkrefreshtoken = require("./middleware/refreshtokencheck");
const passport = require("./config/oauthconf");
const cors = require("cors");
const { profile }=require("./controller/user");

app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:4000", "http://127.0.0.1:3000", "http://127.0.0.1:4000"],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use("/user", ratelimiter, userlogin);
app.use("/oauth", oauthroutes);
app.get("/me", checkAuthentication, async (req, res) => {
    return res.status(200).json({ user: req.user });
});
app.get("/user/profile", checkAuthentication, profile);
app.get("/", checkAuthentication, async (req, res) => {
    return res.status(200).json({ message: "Welcome to Collavite", user: req.user });
});

app.post("/refresh", checkrefreshtoken);
module.exports = app;