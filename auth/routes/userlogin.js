const express = require("express");
const router = express.Router();
const { signupuser, loginuser, verficationcode, resendotp, updatepassword, verifyforgetotp, forgetpassword, logoutuser} = require("../controller/user");
const checkAuthentication = require("../middleware/checkauth");


router.post("/signup", signupuser);
router.post("/login", loginuser)
router.post("/verify", verficationcode);
router.post("/resend", resendotp)
router.post("/forget", forgetpassword)
router.post("/verifyforgetotp", verifyforgetotp)
router.post("/updatepassword", updatepassword)
router.post("/logout", logoutuser);
module.exports = router;