const Settings = require("../models/Settings");

// POST /api/settings/update-keys  (admin only)
exports.updateKeys = async (req, res) => {
    try {
        const { adminKey, staffKey } = req.body;

        if (!adminKey || !staffKey) {
            return res.status(400).json({ message: "Both adminKey and staffKey are required." });
        }

        let settings = await Settings.findOne();

        if (!settings) {
            settings = new Settings({ adminKey, staffKey });
        } else {
            settings.adminKey = adminKey;
            settings.staffKey = staffKey;
        }

        await settings.save();

        res.json({ message: "Secret keys updated successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};