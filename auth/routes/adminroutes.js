const express = require("express");
const { adminlogin, verfiyadminlogin, adminsingup } = require("../controller/admin");
const router = express.Router();

router.post("/singup", adminsingup);
router.post("/login", adminlogin);
router.get("/verify/:token", verfiyadminlogin);
module.exports = router;