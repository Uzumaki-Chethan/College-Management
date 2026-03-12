const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const itemController = require("../controllers/itemController");

router.post("/create",  verifyToken, upload.single("image"), itemController.createItem);
router.get("/all",      verifyToken, itemController.getAllItems);
router.get("/search",   verifyToken, itemController.searchItems);
router.post("/claim",   verifyToken, itemController.claimItem);
router.get("/claims",   verifyToken, isAdmin, itemController.getAllClaims);
router.post("/approve", verifyToken, isAdmin, itemController.approveClaim);
router.get("/my-claims", verifyToken, itemController.getMyClaims);
router.post("/unclaim",  verifyToken, itemController.unclaimItem);

module.exports = router;