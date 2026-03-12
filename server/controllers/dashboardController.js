const Complaint = require("../models/Complaint");
const LostItem  = require("../models/LostItem");

// GET /api/dashboard/stats
exports.getStats = async (req, res) => {
    try {
        const [
            totalComplaints,
            pendingComplaints,
            inProgressComplaints,
            resolvedComplaints,
            totalItems,
            claimedItems,
            openItems
        ] = await Promise.all([
            Complaint.countDocuments(),
            Complaint.countDocuments({ status: "Pending" }),
            Complaint.countDocuments({ status: "In Progress" }),
            Complaint.countDocuments({ status: "Resolved" }),
            LostItem.countDocuments(),
            LostItem.countDocuments({ status: "Claimed" }),
            LostItem.countDocuments({ status: "Open" }),
        ]);

        res.json({
            totalComplaints,
            pendingComplaints,
            inProgressComplaints,
            resolvedComplaints,
            totalItems,
            claimedItems,
            openItems
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/complaints-location
exports.complaintsByLocation = async (req, res) => {
    try {
        const data = await Complaint.aggregate([
            { $group: { _id: "$location", count: { $sum: 1 } } }
        ]);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/dashboard/items-type
exports.itemsByType = async (req, res) => {
    try {
        const data = await LostItem.aggregate([
            { $group: { _id: "$type", count: { $sum: 1 } } }
        ]);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};