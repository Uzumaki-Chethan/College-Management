const Complaint = require("../models/Complaint");

// POST /api/complaints/create
exports.createComplaint = async (req, res) => {
    try {
        const { title, description, location } = req.body;

        if (!title || !description || !location) {
            return res.status(400).json({ message: "Title, description and location are required." });
        }

        const complaint = new Complaint({
            title,
            description,
            location,
            createdBy: req.user.id
        });

        await complaint.save();

        res.json({ message: "Complaint submitted successfully", complaint });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/complaints/my
exports.getMyComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        res.json({ complaints });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/complaints/all
exports.getAllComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .populate("createdBy",  "name email role")
            .populate("assignedTo", "name email")
            .populate("assignedBy", "name email")
            .sort({ createdAt: -1 });
        res.json({ complaints });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/complaints/assign  (admin assigns to staff)
exports.assignComplaint = async (req, res) => {
    try {
        const { complaintId, staffIds } = req.body;
        console.log("assignComplaint called:", { complaintId, staffIds }); // ← add this

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) return res.status(404).json({ message: "Complaint not found" });

        complaint.assignedTo = staffIds;
        complaint.assignedBy = req.user.id;
        complaint.status = "In Progress";
        await complaint.save();

        res.json({ message: "Assigned successfully", complaint });
    } catch (err) {
        console.error("assignComplaint error:", err.message); // ← add this
        res.status(500).json({ error: err.message });
    }
};
// POST /api/complaints/update  (staff updates status)
exports.updateComplaint = async (req, res) => {
    try {
        const { complaintId, status } = req.body;

        const validStatuses = ["Pending", "In Progress", "Resolved"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value." });
        }

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) return res.status(404).json({ message: "Complaint not found." });

        complaint.status = status;
        await complaint.save();

        res.json({ message: "Complaint updated successfully", complaint });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};