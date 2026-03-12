import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function CreateComplaintPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ title: "", location: "", description: "" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.title.trim() || !form.location.trim() || !form.description.trim()) {
            setError("All fields are required.");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            await axios.post(
                "/api/complaints/create",
                form,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setSuccess("Complaint submitted successfully!");
            setTimeout(() => navigate("/student/dashboard"), 1500);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit complaint.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            {/* Top bar */}
            <div className="h-16 flex items-center px-6 gap-4"
                style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
                <button onClick={() => navigate("/student/dashboard")}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </button>
                <div className="w-px h-5 bg-slate-200"></div>
                <span className="text-sm font-semibold text-slate-800">New Complaint</span>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-6 py-10">

                {/* Header */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
                        style={{ background: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Submit a Complaint
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">What's the issue?</h1>
                    <p className="text-sm text-slate-500">Describe your complaint clearly. Our team will review and respond promptly.</p>
                </div>

                {/* Card */}
                <div className="rounded-2xl p-8" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

                    {/* Success */}
                    {success && (
                        <div className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                            style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", color: "#065f46" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            {success}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Complaint Title <span className="text-red-400">*</span>
                            </label>
                            <input type="text" name="title" value={form.title} onChange={handleChange}
                                placeholder="e.g. Broken lights in Block B corridor"
                                className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 outline-none transition-all"
                                style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                                onFocus={e => e.target.style.borderColor = "#6366f1"}
                                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Location <span className="text-red-400">*</span>
                            </label>
                            <input type="text" name="location" value={form.location} onChange={handleChange}
                                placeholder="e.g. Block B, Room 204"
                                className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 outline-none transition-all"
                                style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                                onFocus={e => e.target.style.borderColor = "#6366f1"}
                                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Description <span className="text-red-400">*</span>
                            </label>
                            <textarea name="description" value={form.description} onChange={handleChange} rows={5}
                                placeholder="Describe the issue in detail — when it started, how it affects you..."
                                className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 outline-none transition-all resize-none"
                                style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                                onFocus={e => e.target.style.borderColor = "#6366f1"}
                                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                            />
                            <p className="mt-1 text-xs text-slate-400">{form.description.length} characters</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => navigate("/student/dashboard")}
                                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 transition-all"
                                style={{ background: "white", border: "1.5px solid #e2e8f0" }}>
                                Cancel
                            </button>
                            <button type="submit" disabled={loading}
                                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                                style={{
                                    background: loading ? "#a5b4fc" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                    boxShadow: loading ? "none" : "0 4px 15px rgba(99,102,241,0.35)",
                                    cursor: loading ? "not-allowed" : "pointer",
                                }}>
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                        </svg>
                                        Submitting...
                                    </span>
                                ) : "Submit Complaint"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Info note */}
                <div className="mt-4 px-4 py-3 rounded-xl flex items-start gap-2"
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Your complaint will be reviewed by the admin team. You can track its status from <strong className="text-slate-500">My Complaints</strong>. Typical response time is 1–3 working days.
                    </p>
                </div>
            </div>
        </div>
    );
}