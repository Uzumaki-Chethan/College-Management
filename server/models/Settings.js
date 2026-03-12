const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
    adminKey: String,
    staffKey: String
});

module.exports = mongoose.model("Settings", settingsSchema);