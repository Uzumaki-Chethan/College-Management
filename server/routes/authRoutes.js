const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const auth = require("../controllers/authController");
router.get("/staff-list", verifyToken, isAdmin, auth.getStaffList);

router.post("/signup",               auth.signup);
router.post("/login",                auth.login);
router.get("/profile",  verifyToken, auth.getProfile);
router.post("/update-password",      verifyToken, auth.updatePassword);
router.post("/admin-reset-password", verifyToken, isAdmin, auth.adminResetPassword);

module.exports = router;