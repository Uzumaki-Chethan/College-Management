import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const STATUS_STYLE = {
    "Pending": { bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
    "In Progress": { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
    "Resolved": { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
};

const NAV = [
    { icon: "📊", label: "Dashboard",  key: "dashboard" },
    { icon: "📋", label: "Complaints", key: "complaints" },
    { icon: "🔍", label: "Lost & Found", key: "lostfound" },
    { icon: "📈", label: "Analytics",  key: "analytics" },
    { icon: "⚙️", label: "Settings",   key: "settings" },
];

const EyeIcon = ({ show }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {!show
            ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
            : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
        }
    </svg>
);

// ── Donut Chart (pure SVG) ──
function DonutChart({ segments, centerLabel = "total", size = 130 }) {
    const total = segments.reduce((s, i) => s + i.value, 0);
    if (total === 0) return (
        <div className="flex items-center justify-center h-32 text-xs text-slate-400">No data yet</div>
    );
    const r = 44, cx = 60, cy = 60, sw = 14, circ = 2 * Math.PI * r;
    let offset = 0;
    return (
        <div className="flex items-center gap-6">
            <svg width={size} height={size} viewBox="0 0 120 120">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
                {segments.map((s, i) => {
                    if (!s.value) return null;
                    const dash = (s.value / total) * circ;
                    const el = (
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                            stroke={s.color} strokeWidth={sw}
                            strokeDasharray={`${dash} ${circ - dash}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="butt"
                            style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
                        />
                    );
                    offset += dash;
                    return el;
                })}
                <text x={cx} y={cy - 5} textAnchor="middle" fontSize="20" fontWeight="800" fill="#0f172a">{total}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8">{centerLabel}</text>
            </svg>
            <div className="space-y-2.5">
                {segments.map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                        <span className="text-xs text-slate-500">{s.label}</span>
                        <span className="text-xs font-bold text-slate-900 ml-auto pl-4">{s.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Bar Chart (pure SVG, fixed 500px viewBox so bars scale with data count) ──
function BarChart({ data, color = "#6366f1" }) {
    if (!data.length) return <p className="text-xs text-slate-400">No data yet</p>;
    const max = Math.max(...data.map(d => d.value), 1);
    const svgW = 500, chartH = 100, labelH = 30;
    const total = data.length;
    const gap = svgW / (total * 4);
    const barW = (svgW - gap * (total + 1)) / total;
    return (
        <svg width="100%" viewBox={`0 0 ${svgW} ${chartH + labelH}`} style={{ overflow: "visible" }}>
            {data.map((d, i) => {
                const barH = Math.max((d.value / max) * chartH, 4);
                const x = gap + i * (barW + gap);
                const y = chartH - barH;
                return (
                    <g key={d.label}>
                        <rect x={x} y={y} width={barW} height={barH} rx="4"
                            fill={color} opacity="0.85" />
                        <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                            fontSize="10" fontWeight="700" fill="#0f172a">{d.value}</text>
                        <text x={x + barW / 2} y={chartH + 16} textAnchor="middle"
                            fontSize="9" fill="#64748b">
                            {d.label.length > 9 ? d.label.slice(0, 8) + "…" : d.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [stats, setStats] = useState(null);
    const [complaints, setComplaints] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [claims, setClaims] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingComplaints, setLoadingComplaints] = useState(true);
    const [loadingClaims, setLoadingClaims] = useState(true);
    const [assigning, setAssigning] = useState(null);
    const [approvingId, setApprovingId] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState({});
    const [toast, setToast] = useState("");
    const [toastType, setToastType] = useState("success");

    // Settings state
    const [settings, setSettings] = useState({ staffKey: "", adminKey: "" });
    const [currentPass, setCurrentPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [savingKeys, setSavingKeys] = useState(false);
    const [savingPass, setSavingPass] = useState(false);
    const [showKeys, setShowKeys] = useState({ staff: false, admin: false });
    const [showPasses, setShowPasses] = useState({ current: false, new: false, confirm: false });

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchStats();
        fetchComplaints();
        fetchStaff();
        fetchClaims();
    }, []);

    const fetchStats = async () => {
        try {
            const { data } = await axios.get("${import.meta.env.VITE_API_URL}/api/dashboard/stats", { headers });
            setStats(data);
        } catch { }
        finally { setLoadingStats(false); }
    };

    const fetchComplaints = async () => {
        setLoadingComplaints(true);
        try {
            const { data } = await axios.get("${import.meta.env.VITE_API_URL}/api/complaints/all", { headers });
            setComplaints(data.complaints || []);
        } catch { }
        finally { setLoadingComplaints(false); }
    };

    const fetchStaff = async () => {
        try {
            const { data } = await axios.get("${import.meta.env.VITE_API_URL}/api/auth/staff-list", { headers });
            setStaffList(data.staff || []);
        } catch { }
    };

    const fetchClaims = async () => {
        setLoadingClaims(true);
        try {
            const { data } = await axios.get("${import.meta.env.VITE_API_URL}/api/items/claims", { headers });
            setClaims(data || []);
        } catch { }
        finally { setLoadingClaims(false); }
    };

    const toggleStaff = (complaintId, staffId) => {
        setSelectedStaff(prev => {
            const current = prev[complaintId] || [];
            const exists = current.includes(staffId);
            return {
                ...prev,
                [complaintId]: exists ? current.filter(id => id !== staffId) : [...current, staffId],
            };
        });
    };

    const handleAssign = async (complaintId) => {
        const staffIds = selectedStaff[complaintId] || [];
        if (staffIds.length === 0) { showToast("Please select at least one staff member.", "error"); return; }
        setAssigning(complaintId);
        try {
            await axios.post("${import.meta.env.VITE_API_URL}/api/complaints/assign", { complaintId, staffIds }, { headers });
            showToast(`Assigned to ${staffIds.length} staff member${staffIds.length > 1 ? "s" : ""}!`, "success");
            setSelectedStaff(prev => ({ ...prev, [complaintId]: [] }));
            fetchComplaints();
        } catch (err) {
            showToast(err.response?.data?.message || "Assignment failed.", "error");
        } finally { setAssigning(null); }
    };

    const handleApproveClaim = async (claimId) => {
        setApprovingId(claimId);
        try {
            await axios.post("${import.meta.env.VITE_API_URL}/api/items/approve", { claimId }, { headers });
            showToast("Claim approved! Item is now closed.", "success");
            fetchClaims();
            fetchStats();
        } catch (err) {
            showToast(err.response?.data?.message || "Approval failed.", "error");
        } finally { setApprovingId(null); }
    };

    const handleUpdateKeys = async () => {
        if (!settings.staffKey && !settings.adminKey) {
            showToast("Enter at least one key to update.", "error"); return;
        }
        setSavingKeys(true);
        try {
            await axios.post("${import.meta.env.VITE_API_URL}/api/settings/update-keys", settings, { headers });
            showToast("Secret keys updated successfully!", "success");
            setSettings({ staffKey: "", adminKey: "" });
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to update keys.", "error");
        } finally { setSavingKeys(false); }
    };

    const handleChangePassword = async () => {
        if (!currentPass || !newPass || !confirmPass) {
            showToast("Please fill in all password fields.", "error"); return;
        }
        if (newPass !== confirmPass) {
            showToast("New passwords do not match.", "error"); return;
        }
        if (newPass.length < 6) {
            showToast("Password must be at least 6 characters.", "error"); return;
        }
        setSavingPass(true);
        try {
            await axios.post("${import.meta.env.VITE_API_URL}/api/auth/update-password",
                { currentPassword: currentPass, newPassword: newPass }, { headers });
            showToast("Password updated successfully!", "success");
            setCurrentPass(""); setNewPass(""); setConfirmPass("");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to update password.", "error");
        } finally { setSavingPass(false); }
    };

    const showToast = (msg, type = "success") => {
        setToast(msg); setToastType(type);
        setTimeout(() => setToast(""), 3000);
    };

    const pendingComplaints    = complaints.filter(c => c.status === "Pending");
    const inProgressComplaints = complaints.filter(c => c.status === "In Progress");
    const resolvedComplaints   = complaints.filter(c => c.status === "Resolved");
    const pendingClaims        = claims.filter(c => c.status === "Pending");
    const approvedClaims       = claims.filter(c => c.status === "Approved");

    // ── Analytics derived data ──
    const complaintResolutionRate = complaints.length > 0
        ? Math.round((resolvedComplaints.length / complaints.length) * 100)
        : 0;

    const locationCounts = complaints.reduce((acc, c) => {
        const loc = c.location?.trim() || "Unknown";
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
    }, {});
    const locationData = Object.entries(locationCounts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);

    const staffWorkload = staffList.map(s => ({
        label: s.name?.split(" ")[0] || "Staff",
        value: complaints.filter(c =>
            Array.isArray(c.assignedTo) && c.assignedTo.some(st => st._id === s._id)
        ).length,
    })).filter(s => s.value > 0).sort((a, b) => b.value - a.value);

    return (
        <div className="min-h-screen bg-slate-50 flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            {/* ── Mobile Backdrop ── */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.5)" }}
                    onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Sidebar (mobile: fixed slide-in, desktop: static) ── */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-64 shrink-0 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
                style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)", minHeight: "100vh" }}>

                <div className="flex items-center justify-between px-6 py-5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-white font-semibold text-sm tracking-tight">CampusDesk</span>
                            <div className="text-xs" style={{ color: "#6366f1" }}>Admin Panel</div>
                        </div>
                    </div>
                    <button className="lg:hidden text-slate-400 hover:text-white p-1" onClick={() => setSidebarOpen(false)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV.map(item => {
                        const badge = item.key === "complaints" ? pendingComplaints.length
                                    : item.key === "lostfound"  ? pendingClaims.length
                                    : 0;
                        return (
                            <button key={item.key} onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                                style={{
                                    background: activeTab === item.key ? "rgba(99,102,241,0.15)" : "transparent",
                                    color:      activeTab === item.key ? "#a5b4fc" : "#64748b",
                                    border:     activeTab === item.key ? "1px solid rgba(99,102,241,0.25)" : "1px solid transparent",
                                }}>
                                <span>{item.icon}</span>
                                <span className="flex-1">{item.label}</span>
                                {badge > 0 && (
                                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#ef4444", color: "white", minWidth: 18, textAlign: "center" }}>
                                        {badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                            {user?.name?.[0]?.toUpperCase() || "A"}
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{user?.name || "Admin"}</div>
                            <div className="text-xs text-slate-500 truncate">{user?.email || ""}</div>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                        style={{ color: "#94a3b8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 overflow-auto">

                <div className="h-16 flex items-center justify-between px-6"
                    style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
                    <div className="flex items-center gap-3">
                        <button className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                            style={{ background: "#f1f5f9" }} onClick={() => setSidebarOpen(true)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-base font-bold text-slate-900">
                                {activeTab === "dashboard"  ? "Admin Dashboard"
                                 : activeTab === "complaints" ? "All Complaints"
                                 : activeTab === "lostfound"  ? "Lost & Found Claims"
                                 : activeTab === "analytics"  ? "Analytics"
                                 : "Settings"}
                            </h1>
                            <p className="text-xs text-slate-400">Welcome, {user?.name?.split(" ")[0] || "Admin"} 👋</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: "#eef2ff", color: "#6366f1", border: "1px solid #c7d2fe" }}>
                        🛡️ Administrator
                    </div>
                </div>

                <div className="px-6 py-8">

                    {/* ── DASHBOARD TAB ── */}
                    {activeTab === "dashboard" && (
                        <div className="max-w-5xl">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                {loadingStats ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="rounded-2xl p-5 animate-pulse"
                                            style={{ background: "white", border: "1px solid #e2e8f0", height: 100 }} />
                                    ))
                                ) : [
                                    { label: "Total Complaints", value: stats?.totalComplaints ?? 0,    color: "#6366f1", bg: "#eef2ff", icon: "📊" },
                                    { label: "Pending",          value: stats?.pendingComplaints ?? 0,  color: "#f59e0b", bg: "#fffbeb", icon: "⏳" },
                                    { label: "In Progress",      value: stats?.inProgressComplaints ?? 0, color: "#3b82f6", bg: "#eff6ff", icon: "🔧" },
                                    { label: "Resolved",         value: stats?.resolvedComplaints ?? 0, color: "#10b981", bg: "#ecfdf5", icon: "✅" },
                                ].map(s => (
                                    <div key={s.label} className="rounded-2xl p-5"
                                        style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xl">{s.icon}</span>
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                                                <div className="w-2 h-2 rounded-full" style={{ background: s.color }}></div>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 mb-0.5">{s.value}</div>
                                        <div className="text-xs text-slate-500 font-medium">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {stats && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    {[
                                        { label: "Total Items",   value: stats.totalItems ?? 0,   color: "#8b5cf6", bg: "#f5f3ff", icon: "📦" },
                                        { label: "Open Items",    value: stats.openItems ?? 0,    color: "#f59e0b", bg: "#fffbeb", icon: "🔍" },
                                        { label: "Claimed Items", value: stats.claimedItems ?? 0, color: "#10b981", bg: "#ecfdf5", icon: "🤝" },
                                    ].map(s => (
                                        <div key={s.label} className="rounded-2xl p-5"
                                            style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xl">{s.icon}</span>
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                                                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }}></div>
                                                </div>
                                            </div>
                                            <div className="text-2xl font-bold text-slate-900 mb-0.5">{s.value}</div>
                                            <div className="text-xs text-slate-500 font-medium">{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                                {[
                                    { label: "Assign Complaints", sub: `${pendingComplaints.length} pending · ${staffList.length} staff`, icon: "👥", tab: "complaints" },
                                    { label: "Review Claims",     sub: `${pendingClaims.length} pending approval`,                       icon: "🤝", tab: "lostfound" },
                                ].map(a => (
                                    <button key={a.tab} onClick={() => setActiveTab(a.tab)}
                                        className="group flex items-center gap-4 p-5 rounded-2xl text-left transition-all hover:shadow-md"
                                        style={{ background: "white", border: "1.5px solid #e2e8f0" }}>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl group-hover:scale-110 transition-all"
                                            style={{ background: "#eef2ff", border: "1.5px solid #c7d2fe" }}>
                                            {a.icon}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 mb-0.5">{a.label}</div>
                                            <div className="text-xs text-slate-500">{a.sub}</div>
                                        </div>
                                        <svg className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── COMPLAINTS TAB ── */}
                    {activeTab === "complaints" && (
                        <div className="max-w-5xl">
                            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                                <div className="flex gap-2 flex-wrap text-xs">
                                    {[
                                        `All (${complaints.length})`,
                                        `Pending (${pendingComplaints.length})`,
                                        `In Progress (${inProgressComplaints.length})`,
                                        `Resolved (${resolvedComplaints.length})`,
                                    ].map(label => (
                                        <span key={label} className="px-3 py-1.5 rounded-xl font-medium"
                                            style={{ background: "white", border: "1.5px solid #e2e8f0", color: "#64748b" }}>
                                            {label}
                                        </span>
                                    ))}
                                </div>
                                <button onClick={fetchComplaints}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                                    style={{ background: "white", border: "1.5px solid #e2e8f0", color: "#64748b" }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="23 4 23 10 17 10" />
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                    </svg>
                                    Refresh
                                </button>
                            </div>

                            {loadingComplaints ? (
                                <div className="flex items-center justify-center py-16">
                                    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                </div>
                            ) : complaints.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                                    style={{ background: "white", border: "1px dashed #e2e8f0" }}>
                                    <span className="text-4xl mb-3">📭</span>
                                    <p className="text-sm font-medium text-slate-600">No complaints yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {complaints.map(c => {
                                        const s = STATUS_STYLE[c.status] || STATUS_STYLE["Pending"];
                                        const chosen = selectedStaff[c._id] || [];
                                        return (
                                            <div key={c._id} className="rounded-2xl p-5"
                                                style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

                                                <div className="flex items-start gap-3 mb-3 flex-wrap">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <span className="text-sm font-bold text-slate-900">{c.title}</span>
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                                                                style={{ background: s.bg, color: s.color }}>
                                                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: s.dot }}></span>
                                                                {c.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mb-2">{c.description}</p>
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f1f5f9", color: "#64748b" }}>
                                                                📍 {c.location}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                By: <strong className="text-slate-600">{c.createdBy?.name || "Unknown"}</strong>
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {c.assignedTo?.length > 0 && (
                                                    <div className="mb-3 px-3 py-2 rounded-xl text-xs flex items-start gap-2"
                                                        style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af" }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                            <circle cx="12" cy="7" r="4" />
                                                        </svg>
                                                        <div>
                                                            Assigned to: <strong>{c.assignedTo.map(s => s.name).join(", ")}</strong>
                                                            <span className="ml-1 text-blue-400">· reassign below</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-3 mt-1" style={{ borderTop: "1px solid #f1f5f9" }}>
                                                    <p className="text-xs font-medium text-slate-600 mb-2">
                                                        Select staff to assign
                                                        {chosen.length > 0 && (
                                                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold"
                                                                style={{ background: "#eef2ff", color: "#6366f1" }}>
                                                                {chosen.length} selected
                                                            </span>
                                                        )}
                                                    </p>
                                                    {staffList.length === 0 ? (
                                                        <p className="text-xs text-slate-400 italic">No staff accounts found.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                                            {staffList.map(staff => {
                                                                const isSelected = chosen.includes(staff._id);
                                                                return (
                                                                    <button key={staff._id} type="button"
                                                                        onClick={() => toggleStaff(c._id, staff._id)}
                                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                                                                        style={{
                                                                            background: isSelected ? "#eef2ff" : "#f8fafc",
                                                                            border: `1.5px solid ${isSelected ? "#6366f1" : "#e2e8f0"}`,
                                                                            boxShadow: isSelected ? "0 0 0 2px #6366f120" : "none",
                                                                        }}>
                                                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                                                            style={{ background: isSelected ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#cbd5e1" }}>
                                                                            {staff.name?.[0]?.toUpperCase() || "S"}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-xs font-semibold truncate" style={{ color: isSelected ? "#4338ca" : "#1e293b" }}>
                                                                                {staff.name}
                                                                            </div>
                                                                            <div className="text-xs truncate" style={{ color: "#94a3b8" }}>{staff.email}</div>
                                                                        </div>
                                                                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                                                                            style={{ background: isSelected ? "#6366f1" : "white", border: `1.5px solid ${isSelected ? "#6366f1" : "#d1d5db"}` }}>
                                                                            {isSelected && (
                                                                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                                                    <polyline points="20 6 9 17 4 12" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    <button onClick={() => handleAssign(c._id)}
                                                        disabled={assigning === c._id || chosen.length === 0}
                                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                                                        style={{
                                                            background: chosen.length === 0 || assigning === c._id ? "#a5b4fc" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                                            boxShadow: chosen.length > 0 && assigning !== c._id ? "0 4px 12px rgba(99,102,241,0.3)" : "none",
                                                            cursor: chosen.length === 0 || assigning === c._id ? "not-allowed" : "pointer",
                                                        }}>
                                                        {assigning === c._id ? "Assigning..." : chosen.length === 0 ? "Select staff to assign" : `Assign to ${chosen.length} staff member${chosen.length > 1 ? "s" : ""}`}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── LOST & FOUND TAB ── */}
                    {activeTab === "lostfound" && (
                        <div className="max-w-4xl">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {[
                                    { label: "Pending Claims",  value: pendingClaims.length,  color: "#f59e0b", bg: "#fffbeb", icon: "⏳" },
                                    { label: "Approved Claims", value: approvedClaims.length, color: "#10b981", bg: "#ecfdf5", icon: "✅" },
                                ].map(s => (
                                    <div key={s.label} className="rounded-2xl p-5"
                                        style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xl">{s.icon}</span>
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                                                <div className="w-2 h-2 rounded-full" style={{ background: s.color }}></div>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 mb-0.5">{s.value}</div>
                                        <div className="text-xs text-slate-500 font-medium">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-slate-900">All Claims</h2>
                                <button onClick={fetchClaims}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                                    style={{ background: "white", border: "1.5px solid #e2e8f0", color: "#64748b" }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="23 4 23 10 17 10" />
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                    </svg>
                                    Refresh
                                </button>
                            </div>

                            {loadingClaims ? (
                                <div className="flex items-center justify-center py-16">
                                    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                </div>
                            ) : claims.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                                    style={{ background: "white", border: "1px dashed #e2e8f0" }}>
                                    <span className="text-4xl mb-3">🤝</span>
                                    <p className="text-sm font-medium text-slate-600">No claims yet</p>
                                    <p className="text-xs text-slate-400 mt-1">Claims will appear here when users submit them</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {claims.map(claim => (
                                        <div key={claim._id} className="rounded-2xl p-5"
                                            style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                                            <div className="flex items-start gap-4 flex-wrap">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                                                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                                    {claim.itemId?.image ? (
                                                        <img src={`${import.meta.env.VITE_API_URL}/uploads/${claim.itemId.image}`}
                                                            alt={claim.itemId?.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-2xl">📦</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="text-sm font-bold text-slate-900">{claim.itemId?.name || "Unknown Item"}</span>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                            style={{
                                                                background: claim.status === "Approved" ? "#dcfce7" : "#fef9c3",
                                                                color: claim.status === "Approved" ? "#166534" : "#854d0e",
                                                            }}>
                                                            {claim.status === "Approved" ? "✅ Approved" : "⏳ Pending"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-1">{claim.itemId?.description}</p>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f1f5f9", color: "#64748b" }}>
                                                            📍 {claim.itemId?.location}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            Claimed by: <strong className="text-slate-600">{claim.userId?.name || "Unknown"}</strong>
                                                        </span>
                                                        <span className="text-xs text-slate-400">{claim.userId?.email}</span>
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(claim.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                        </span>
                                                    </div>
                                                </div>
                                                {claim.status === "Pending" ? (
                                                    <button onClick={() => handleApproveClaim(claim._id)}
                                                        disabled={approvingId === claim._id}
                                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white shrink-0 transition-all"
                                                        style={{
                                                            background: approvingId === claim._id ? "#86efac" : "linear-gradient(135deg, #10b981, #059669)",
                                                            boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                                                            cursor: approvingId === claim._id ? "not-allowed" : "pointer",
                                                        }}>
                                                        {approvingId === claim._id ? "Approving..." : "✅ Approve"}
                                                    </button>
                                                ) : (
                                                    <div className="px-4 py-2 rounded-xl text-xs font-semibold shrink-0"
                                                        style={{ background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0" }}>
                                                        Claim Closed
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── ANALYTICS TAB ── */}
                    {activeTab === "analytics" && (
                        <div className="max-w-4xl mx-auto space-y-6">

                            {/* Summary row */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: "Total Complaints",  value: complaints.length,          color: "#6366f1", bg: "#eef2ff" },
                                    { label: "Resolution Rate",   value: `${complaintResolutionRate}%`, color: "#10b981", bg: "#ecfdf5" },
                                    { label: "Total L&F Items",   value: stats?.totalItems ?? 0,     color: "#8b5cf6", bg: "#f5f3ff" },
                                    { label: "Items Claimed",     value: stats?.claimedItems ?? 0,   color: "#f59e0b", bg: "#fffbeb" },
                                ].map(s => (
                                    <div key={s.label} className="rounded-2xl p-5 text-center"
                                        style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                        <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                                        <div className="text-xs text-slate-500">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Two donuts side by side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                    <h3 className="text-sm font-bold text-slate-900 mb-5">Complaints by Status</h3>
                                    <DonutChart centerLabel="total" segments={[
                                        { label: "Pending",     value: pendingComplaints.length,    color: "#eab308" },
                                        { label: "In Progress", value: inProgressComplaints.length, color: "#3b82f6" },
                                        { label: "Resolved",    value: resolvedComplaints.length,   color: "#10b981" },
                                    ]} />
                                </div>

                                <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                    <h3 className="text-sm font-bold text-slate-900 mb-5">L&F Items by Status</h3>
                                    <DonutChart centerLabel="items" segments={[
                                        { label: "Open",    value: stats?.openItems ?? 0,    color: "#f59e0b" },
                                        { label: "Claimed", value: stats?.claimedItems ?? 0, color: "#10b981" },
                                    ]} />
                                </div>
                            </div>

                            {/* Complaints by location bar chart */}
                            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                <h3 className="text-sm font-bold text-slate-900 mb-1">Complaints by Location</h3>
                                <p className="text-xs text-slate-400 mb-5">Top locations with most complaints</p>
                                {locationData.length === 0
                                    ? <p className="text-xs text-slate-400">No data yet</p>
                                    : <BarChart data={locationData} color="#6366f1" />
                                }
                            </div>

                            {/* Staff workload bar chart */}
                            {staffWorkload.length > 0 && (
                                <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                    <h3 className="text-sm font-bold text-slate-900 mb-1">Staff Workload</h3>
                                    <p className="text-xs text-slate-400 mb-5">Complaints assigned per staff member</p>
                                    <BarChart data={staffWorkload} color="#8b5cf6" />
                                </div>
                            )}

                            {/* Status progress bars */}
                            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                <h3 className="text-sm font-bold text-slate-900 mb-5">Status Breakdown</h3>
                                {complaints.length === 0 ? (
                                    <p className="text-xs text-slate-400">No complaints yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {[
                                            { label: "Pending",     value: pendingComplaints.length,    color: "#eab308" },
                                            { label: "In Progress", value: inProgressComplaints.length, color: "#3b82f6" },
                                            { label: "Resolved",    value: resolvedComplaints.length,   color: "#10b981" },
                                        ].map(s => (
                                            <div key={s.label}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs font-medium text-slate-600">{s.label}</span>
                                                    <span className="text-xs font-bold text-slate-900">
                                                        {s.value} <span className="font-normal text-slate-400">/ {complaints.length}</span>
                                                    </span>
                                                </div>
                                                <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f1f5f9" }}>
                                                    <div className="h-full rounded-full transition-all"
                                                        style={{ width: `${(s.value / complaints.length) * 100}%`, background: s.color }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── SETTINGS TAB ── */}
                    {activeTab === "settings" && (
                        <div className="max-w-2xl mx-auto space-y-6">

                            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0" }}>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#eef2ff" }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Secret Keys</h2>
                                        <p className="text-xs text-slate-400">Update signup secret keys for staff and admin roles</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { label: "Staff Secret Key", field: "staffKey", showKey: "staff" },
                                        { label: "Admin Secret Key", field: "adminKey", showKey: "admin" },
                                    ].map(({ label, field, showKey }) => (
                                        <div key={field}>
                                            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</label>
                                            <div className="relative">
                                                <input
                                                    type={showKeys[showKey] ? "text" : "password"}
                                                    placeholder={`Enter new ${label.toLowerCase()}...`}
                                                    value={settings[field]}
                                                    onChange={e => setSettings(s => ({ ...s, [field]: e.target.value }))}
                                                    className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm text-slate-900 outline-none"
                                                    style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                                                    onFocus={e => e.target.style.borderColor = "#6366f1"}
                                                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                                                />
                                                <button type="button"
                                                    onClick={() => setShowKeys(k => ({ ...k, [showKey]: !k[showKey] }))}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                    <EyeIcon show={showKeys[showKey]} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button onClick={handleUpdateKeys} disabled={savingKeys}
                                    className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                                    style={{
                                        background: savingKeys ? "#a5b4fc" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                        boxShadow: savingKeys ? "none" : "0 4px 12px rgba(99,102,241,0.3)",
                                        cursor: savingKeys ? "not-allowed" : "pointer",
                                    }}>
                                    {savingKeys ? "Saving..." : "Update Keys"}
                                </button>
                            </div>

                            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0" }}>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
                                        <p className="text-xs text-slate-400">Update your admin account password</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { label: "Current Password", val: currentPass, set: setCurrentPass, showKey: "current" },
                                        { label: "New Password",     val: newPass,     set: setNewPass,     showKey: "new" },
                                        { label: "Confirm Password", val: confirmPass, set: setConfirmPass, showKey: "confirm" },
                                    ].map(({ label, val, set, showKey }) => (
                                        <div key={showKey}>
                                            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</label>
                                            <div className="relative">
                                                <input
                                                    type={showPasses[showKey] ? "text" : "password"}
                                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                                    value={val}
                                                    onChange={e => set(e.target.value)}
                                                    className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm text-slate-900 outline-none"
                                                    style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                                                    onFocus={e => e.target.style.borderColor = "#6366f1"}
                                                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                                                />
                                                <button type="button"
                                                    onClick={() => setShowPasses(p => ({ ...p, [showKey]: !p[showKey] }))}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                    <EyeIcon show={showPasses[showKey]} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button onClick={handleChangePassword} disabled={savingPass}
                                    className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                                    style={{
                                        background: savingPass ? "#fca5a5" : "linear-gradient(135deg, #ef4444, #dc2626)",
                                        boxShadow: savingPass ? "none" : "0 4px 12px rgba(239,68,68,0.3)",
                                        cursor: savingPass ? "not-allowed" : "pointer",
                                    }}>
                                    {savingPass ? "Updating..." : "Change Password"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {toast && (
                <div className="fixed bottom-6 right-6 px-5 py-3 rounded-2xl text-sm font-medium text-white shadow-lg z-50"
                    style={{
                        background: toastType === "success"
                            ? "linear-gradient(135deg, #10b981, #059669)"
                            : "linear-gradient(135deg, #ef4444, #dc2626)",
                    }}>
                    {toast}
                </div>
            )}
        </div>
    );
}