const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const dashboard = require("../controllers/dashboardController");

router.get("/stats",                verifyToken, isAdmin, dashboard.getStats);
router.get("/complaints-location",  verifyToken, isAdmin, dashboard.complaintsByLocation);
router.get("/items-type",           verifyToken, isAdmin, dashboard.itemsByType);

module.exports = router;