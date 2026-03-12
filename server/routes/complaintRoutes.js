const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const complaint = require("../controllers/complaintController");

router.post("/create",  verifyToken, complaint.createComplaint);
router.get("/my",       verifyToken, complaint.getMyComplaints);
router.get("/all",      verifyToken, complaint.getAllComplaints);
router.post("/assign",  verifyToken, complaint.assignComplaint);
router.post("/update",  verifyToken, complaint.updateComplaint);

module.exports = router;