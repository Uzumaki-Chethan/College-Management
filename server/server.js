require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

// ── CORS ──
const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth",       require("./routes/authRoutes"));
app.use("/api/complaints", require("./routes/complaintRoutes"));
app.use("/api/items",      require("./routes/itemRoutes"));
app.use("/api/dashboard",  require("./routes/dashboardRoutes"));
app.use("/api/settings",   require("./routes/settingsRoutes"));

app.get("/", (req, res) => {
    res.send("CampusDesk API Running ✅");
});

app.use(errorHandler);

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collegeDB";
const PORT      = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.log(err));