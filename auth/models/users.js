const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
    "username": {
        type: String,
        require: true
    },
    "email": {
        type: String,
        require: true
    },
    "password": {
        type: String,
        require: false
    },
    "profilepicture": {
        type: String,
        require: false
    },
    "googleId": {
        type: String,
        require: false
    },
    "refreshToken": {
        type: String,
        require: false
    },
    "role": {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
}, { timestamps: true })

const User = mongoose.model("users", UserSchema);

module.exports = User;