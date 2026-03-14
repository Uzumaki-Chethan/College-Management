const LostItem = require("../models/LostItem");
const Claim    = require("../models/Claim");

// POST /api/items/create
exports.createItem = async (req, res) => {
    try {
        const { name, description, type, location } = req.body;

        if (!name || !description || !type || !location) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const item = new LostItem({
    name, description, location, type,
    image: req.file ? req.file.path : null,
    userId: req.user.id,
});

        await item.save();
        res.json({ message: "Item posted successfully", item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/items/all
exports.getAllItems = async (req, res) => {
    try {
        const items = await LostItem.find()
            .populate("userId", "name email")
            .sort({ createdAt: -1 });
        res.json({ items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/items/search
exports.searchItems = async (req, res) => {
    try {
        const { name, type, location } = req.query;
        let filter = {};

        if (name)     filter.name     = { $regex: name,     $options: "i" };
        if (type)     filter.type     = type;
        if (location) filter.location = { $regex: location, $options: "i" };

        const items = await LostItem.find(filter).populate("userId", "name email");
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/items/claim
exports.claimItem = async (req, res) => {
    try {
        const { itemId } = req.body;

        const existing = await Claim.findOne({ itemId, userId: req.user.id });
        if (existing) {
            return res.status(400).json({ message: "You already submitted a claim for this item." });
        }

        const claim = new Claim({
            itemId,
            userId: req.user.id
        });

        await claim.save();
        res.json({ message: "Claim request submitted", claim });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/items/claims  (admin)
exports.getAllClaims = async (req, res) => {
    try {
        const claims = await Claim.find()
            .populate("itemId")
            .populate("userId", "name email")
            .sort({ createdAt: -1 });
        res.json(claims);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/items/approve  (admin)
exports.approveClaim = async (req, res) => {
    try {
        const { claimId } = req.body;
        const claim = await Claim.findById(claimId);
        if (!claim) return res.status(404).json({ message: "Claim not found" });

        claim.status = "Approved";
        await claim.save();

        // Close the item
        await LostItem.findByIdAndUpdate(claim.itemId, { status: "Claimed" });

        res.json({ message: "Claim approved and item closed." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMyClaims = async (req, res) => {
    try {
        const claims = await Claim.find({ userId: req.user.id })
            .populate("itemId", "name image location");
        res.json({ claims });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.unclaimItem = async (req, res) => {
    try {
        const { claimId } = req.body;
        const claim = await Claim.findOne({ _id: claimId, userId: req.user.id });
        if (!claim) return res.status(404).json({ message: "Claim not found" });
        if (claim.status === "Approved") return res.status(400).json({ message: "Approved claims cannot be withdrawn." });
        await claim.deleteOne();
        res.json({ message: "Claim withdrawn successfully." });
    } catch (err) { res.status(500).json({ error: err.message }); }
};