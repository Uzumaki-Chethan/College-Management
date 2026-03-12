const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const settings = require("../controllers/settingsController");

router.post("/update-keys", verifyToken, isAdmin, settings.updateKeys);

module.exports = router;