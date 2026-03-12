const User     = require("../models/User");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const Settings = require("../models/Settings");

// Helper — get active keys (MongoDB first, fallback to .env)
const getActiveKeys = async () => {
    const settings = await Settings.findOne();
    return {
        staffKey: settings?.staffKey || process.env.STAFF_SECRET,
        adminKey: settings?.adminKey || process.env.ADMIN_SECRET,
    };
};

exports.signup = async (req, res) => {
    try {
        const { name, email, password, role, secretKey } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        let userRole = "student";

        if (role === "staff" || role === "admin") {
            const { staffKey, adminKey } = await getActiveKeys();

            if (role === "staff") {
                if (secretKey !== staffKey) {
                    return res.status(403).json({ message: "Invalid staff key" });
                }
                userRole = "staff";
            }

            if (role === "admin") {
                if (secretKey !== adminKey) {
                    return res.status(403).json({ message: "Invalid admin key" });
                }
                userRole = "admin";
            }
        }

        const hashed = await bcrypt.hash(password, 10);

        const user = new User({ name, email, password: hashed, role: userRole });
        await user.save();

        res.json({ message: "User registered successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.role !== role) {
            return res.status(403).json({ message: "Invalid credentials for selected role" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ message: "Login successful", token, user });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Password updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getStaffList = async (req, res) => {
    try {
        const staff = await User.find({ role: "staff" }).select("_id name email");
        res.json({ staff });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.adminResetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Password reset by admin successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};