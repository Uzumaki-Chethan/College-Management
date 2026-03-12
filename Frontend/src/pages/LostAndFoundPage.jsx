import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const TYPE_STYLE = {
    "Lost": { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444", icon: "🔴" },
    "Found": { bg: "#ecfdf5", color: "#166534", dot: "#22c55e", icon: "🟢" },
};

const STATUS_STYLE = {
    "Open": { bg: "#fffbeb", color: "#92400e", dot: "#f59e0b" },
    "Claimed": { bg: "#f0fdf4", color: "#166534", dot: "#22c55e" },
};

export default function LostAndFoundPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const isStaff = user?.role === "staff";
    const accentColor = isStaff ? "#f59e0b" : "#10b981";
    const accentGrad = isStaff ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #10b981, #059669)";
    const dashPath = isStaff ? "/staff/dashboard" : "/student/dashboard";

    const [activeTab, setActiveTab] = useState("browse");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [claimingId, setClaimingId] = useState(null);
    const [unclaimingId, setUnclaimingId] = useState(null);
    // Track which items this user has claimed: { itemId: claimId }
    const [myClaims, setMyClaims] = useState({});
    const [toast, setToast] = useState("");
    const [toastType, setToastType] = useState("success");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("All");

    const [form, setForm] = useState({ name: "", description: "", location: "", type: "Lost" });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileRef = useRef();

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/items/all", { headers });
            const allItems = data.items || [];
            setItems(allItems);

            // Build myClaims map from items that have claims by this user
            // We fetch claims separately to know which ones user submitted
            try {
                const claimsRes = await axios.get("/api/items/my-claims", { headers });
                const claimsMap = {};
                (claimsRes.data.claims || []).forEach(c => {
                    if (c.status !== "Approved") {
                        claimsMap[c.itemId?._id || c.itemId] = c._id;
                    }
                });
                setMyClaims(claimsMap);
            } catch {
                // endpoint may not exist yet — fallback silently
            }
        } catch { }
        finally { setLoading(false); }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.description.trim() || !form.location.trim()) {
            showToast("Please fill in all fields.", "error"); return;
        }
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("name", form.name);
            fd.append("description", form.description);
            fd.append("location", form.location);
            fd.append("type", form.type);
            if (imageFile) fd.append("image", imageFile);

            await axios.post("/api/items/create", fd, {
                headers: { ...headers, "Content-Type": "multipart/form-data" },
            });

            showToast("Item posted successfully!", "success");
            setForm({ name: "", description: "", location: "", type: "Lost" });
            setImageFile(null); setImagePreview(null);
            fetchItems();
            setTimeout(() => setActiveTab("browse"), 1200);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to post item.", "error");
        } finally { setSubmitting(false); }
    };

    const handleClaim = async (itemId) => {
        setClaimingId(itemId);
        try {
            const { data } = await axios.post("/api/items/claim", { itemId }, { headers });
            showToast("Claim submitted! Waiting for admin approval.", "success");
            // Store claim id so we can unclaim
            setMyClaims(prev => ({ ...prev, [itemId]: data.claim?._id || true }));
            fetchItems();
        } catch (err) {
            showToast(err.response?.data?.message || "Claim failed.", "error");
        } finally { setClaimingId(null); }
    };

    const handleUnclaim = async (itemId) => {
        const claimId = myClaims[itemId];
        if (!claimId) return;
        setUnclaimingId(itemId);
        try {
            await axios.post("/api/items/unclaim", { claimId }, { headers });
            showToast("Claim withdrawn successfully.", "success");
            setMyClaims(prev => { const n = { ...prev }; delete n[itemId]; return n; });
            fetchItems();
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to withdraw claim.", "error");
        } finally { setUnclaimingId(null); }
    };

    const showToast = (msg, type = "success") => {
        setToast(msg); setToastType(type);
        setTimeout(() => setToast(""), 3000);
    };

    const filtered = items.filter(item => {
        const matchType = filterType === "All" || item.type === filterType;
        const matchSearch = !searchQuery ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchType && matchSearch;
    });

    const NAV = [
        { icon: "🏠", label: "Dashboard",                                 action: () => navigate(dashPath) },
        { icon: "📋", label: isStaff ? "Complaints" : "My Complaints",  action: () => navigate(dashPath) },
        { icon: "🔍", label: "Lost & Found",                              action: () => {}, active: true },
        { icon: "📊", label: "Analytics",                                 action: () => navigate(dashPath, { state: { tab: "analytics" } }) },
        { icon: "👤", label: "Profile",                                   action: () => navigate(dashPath, { state: { tab: "profile" } }) },
    ];

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
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accentGrad }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                        <div>
                            <span className="text-white font-semibold text-sm tracking-tight">CampusDesk</span>
                            <div className="text-xs" style={{ color: accentColor }}>{isStaff ? "Staff Panel" : "Student Panel"}</div>
                        </div>
                    </div>
                    <button className="lg:hidden text-slate-400 hover:text-white p-1" onClick={() => setSidebarOpen(false)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV.map(item => (
                        <button key={item.label} onClick={item.action}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                            style={{
                                background: item.active ? `rgba(${isStaff ? "245,158,11" : "99,102,241"},0.15)` : "transparent",
                                color:      item.active ? (isStaff ? "#fcd34d" : "#a5b4fc") : "#64748b",
                                border:     item.active ? `1px solid rgba(${isStaff ? "245,158,11" : "99,102,241"},0.25)` : "1px solid transparent",
                            }}>
                            <span>{item.icon}</span>{item.label}
                        </button>
                    ))}
                </nav>

                <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ background: accentGrad }}>
                            {user?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
                            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                        style={{ color: "#94a3b8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
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
                            <h1 className="text-base font-bold text-slate-900">Lost &amp; Found</h1>
                            <p className="text-xs text-slate-400">Browse, post, and claim lost items</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{
                            background: isStaff ? "#fffbeb" : "#ecfdf5", color: accentColor,
                            border: `1px solid ${isStaff ? "#fde68a" : "#a7f3d0"}`
                        }}>
                        {isStaff ? "👔 Staff" : "🎓 Student"}
                    </div>
                </div>

                <div className="px-6 py-6">

                    {/* Tab switcher */}
                    <div className="flex gap-1 mb-6 p-1 rounded-2xl w-fit" style={{ background: "#f1f5f9" }}>
                        {[
                            { key: "browse", label: "🔍 Browse Items" },
                            { key: "post", label: "➕ Post Item" },
                        ].map(t => (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                                style={{
                                    background: activeTab === t.key ? "white" : "transparent",
                                    color: activeTab === t.key ? "#0f172a" : "#64748b",
                                    boxShadow: activeTab === t.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                                }}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── BROWSE TAB ── */}
                    {activeTab === "browse" && (
                        <div className="max-w-5xl">
                            <div className="flex gap-3 mb-6 flex-wrap">
                                <div className="flex-1 relative" style={{ minWidth: 200 }}>
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14"
                                        viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                    </svg>
                                    <input type="text" placeholder="Search by name or location..."
                                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-900 outline-none"
                                        style={{ background: "white", border: "1.5px solid #e2e8f0" }}
                                        onFocus={e => e.target.style.borderColor = accentColor}
                                        onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {["All", "Lost", "Found"].map(t => (
                                        <button key={t} onClick={() => setFilterType(t)}
                                            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                                            style={{
                                                background: filterType === t ? accentColor : "white",
                                                color: filterType === t ? "white" : "#64748b",
                                                border: `1.5px solid ${filterType === t ? accentColor : "#e2e8f0"}`,
                                            }}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="animate-pulse rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #e2e8f0" }}>
                                            <div className="h-40 bg-slate-200" />
                                            <div className="p-4 space-y-2">
                                                <div className="flex gap-2">
                                                    <div className="h-5 bg-slate-200 rounded-full w-14" />
                                                    <div className="h-5 bg-slate-100 rounded-full w-14" />
                                                </div>
                                                <div className="h-4 bg-slate-200 rounded w-3/4" />
                                                <div className="h-3 bg-slate-100 rounded w-full" />
                                                <div className="h-3 bg-slate-100 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
                                    style={{ background: "white", border: "1px dashed #e2e8f0" }}>
                                    <span className="text-4xl mb-3">🔍</span>
                                    <p className="text-sm font-medium text-slate-600">No items found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filtered.map(item => {
                                        const ts = TYPE_STYLE[item.type] || TYPE_STYLE["Lost"];
                                        const ss = STATUS_STYLE[item.status] || STATUS_STYLE["Open"];
                                        const isOwner = item.userId?._id === user?._id || item.userId === user?._id;
                                        const isClaimed = item.status === "Claimed";
                                        const hasClaimed = !!myClaims[item._id];

                                        return (
                                            <div key={item._id} className="rounded-2xl overflow-hidden flex flex-col"
                                                style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

                                                <div className="w-full h-40 flex items-center justify-center overflow-hidden"
                                                    style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                                                    {item.image ? (
                                                        <img src={`/uploads/${item.image}`}
                                                            alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-5xl opacity-30">📦</span>
                                                    )}
                                                </div>

                                                <div className="p-4 flex flex-col flex-1">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                                            style={{ background: ts.bg, color: ts.color }}>
                                                            {ts.icon} {item.type}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                            style={{ background: ss.bg, color: ss.color }}>
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: ss.dot }}></span>
                                                            {item.status}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-sm font-bold text-slate-900 mb-1">{item.name}</h3>
                                                    <p className="text-xs text-slate-500 mb-2 flex-1 leading-relaxed">{item.description}</p>
                                                    <div className="text-xs text-slate-400 mb-1">📍 {item.location}</div>
                                                    <div className="text-xs text-slate-400 mb-3">
                                                        By <strong className="text-slate-600">{item.userId?.name || "Unknown"}</strong> · {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                    </div>

                                                    {/* Action area */}
                                                    {isClaimed ? (
                                                        <div className="w-full py-2 rounded-xl text-xs font-semibold text-center"
                                                            style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                                                            ✅ Item Claimed
                                                        </div>
                                                    ) : isOwner ? (
                                                        <div className="w-full py-2 rounded-xl text-xs font-semibold text-center"
                                                            style={{ background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0" }}>
                                                            📌 Your Post
                                                        </div>
                                                    ) : hasClaimed ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="w-full py-2 rounded-xl text-xs font-semibold text-center"
                                                                style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                                                                ⏳ Claim Submitted to Admin
                                                            </div>
                                                            <button
                                                                onClick={() => handleUnclaim(item._id)}
                                                                disabled={unclaimingId === item._id}
                                                                className="w-full py-1.5 rounded-xl text-xs font-medium transition-all"
                                                                style={{
                                                                    background: "white",
                                                                    color: "#ef4444",
                                                                    border: "1.5px solid #fecaca",
                                                                    cursor: unclaimingId === item._id ? "not-allowed" : "pointer",
                                                                    opacity: unclaimingId === item._id ? 0.6 : 1,
                                                                }}>
                                                                {unclaimingId === item._id ? "Withdrawing..." : "↩ Withdraw Claim"}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleClaim(item._id)}
                                                            disabled={claimingId === item._id}
                                                            className="w-full py-2 rounded-xl text-xs font-semibold text-white transition-all"
                                                            style={{
                                                                background: claimingId === item._id ? "#94a3b8" : accentGrad,
                                                                boxShadow: `0 2px 8px ${accentColor}40`,
                                                                cursor: claimingId === item._id ? "not-allowed" : "pointer",
                                                            }}>
                                                            {claimingId === item._id ? "Submitting..." : "🙋 Claim This Item"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── POST TAB ── */}
                    {activeTab === "post" && (
                        <div className="max-w-lg mx-auto">
                            <div className="rounded-2xl p-6"
                                style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

                                <h2 className="text-sm font-bold text-slate-900 mb-5">Post a Lost / Found Item</h2>

                                <div className="mb-4">
                                    <label className="text-xs font-semibold text-slate-600 mb-2 block">Type</label>
                                    <div className="flex gap-2">
                                        {["Lost", "Found"].map(t => (
                                            <button key={t} type="button"
                                                onClick={() => setForm(f => ({ ...f, type: t }))}
                                                className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                                                style={{
                                                    background: form.type === t ? TYPE_STYLE[t].bg : "#f8fafc",
                                                    color: form.type === t ? TYPE_STYLE[t].color : "#94a3b8",
                                                    border: `1.5px solid ${form.type === t ? TYPE_STYLE[t].dot : "#e2e8f0"}`,
                                                }}>
                                                {TYPE_STYLE[t].icon} {t} Item
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {[
                                    { label: "Item Name", key: "name", placeholder: "e.g. Blue water bottle", type: "input" },
                                    { label: "Location", key: "location", placeholder: "e.g. Library, Block B Room 204", type: "input" },
                                ].map(f => (
                                    <div key={f.key} className="mb-4">
                                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{f.label}</label>
                                        <input type="text" placeholder={f.placeholder}
                                            value={form[f.key]}
                                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                            className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-900 outline-none"
                                            style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                                            onFocus={e => e.target.style.borderColor = accentColor}
                                            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                                        />
                                    </div>
                                ))}

                                <div className="mb-4">
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
                                    <textarea placeholder="Describe the item in detail..."
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        rows={3}
                                        className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-900 outline-none resize-none"
                                        style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                                        onFocus={e => e.target.style.borderColor = accentColor}
                                        onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                        Image <span className="text-slate-400 font-normal">(optional)</span>
                                    </label>
                                    <input type="file" accept="image/*" ref={fileRef} onChange={handleImageChange} className="hidden" />
                                    {imagePreview ? (
                                        <div className="relative w-full h-40 rounded-xl overflow-hidden"
                                            style={{ border: "1.5px solid #e2e8f0" }}>
                                            <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                                            <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                                                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                                                style={{ background: "rgba(0,0,0,0.5)" }}>✕</button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => fileRef.current.click()}
                                            className="w-full py-8 rounded-xl flex flex-col items-center gap-2"
                                            style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1" }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = "#cbd5e1"}>
                                            <span className="text-2xl">📷</span>
                                            <span className="text-xs text-slate-400">Click to upload an image</span>
                                        </button>
                                    )}
                                </div>

                                <button onClick={handleSubmit} disabled={submitting}
                                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
                                    style={{
                                        background: submitting ? "#94a3b8" : accentGrad,
                                        boxShadow: submitting ? "none" : `0 4px 14px ${accentColor}40`,
                                        cursor: submitting ? "not-allowed" : "pointer",
                                    }}>
                                    {submitting ? "Posting..." : "Post Item"}
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