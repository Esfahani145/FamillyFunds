import React, {useEffect, useState} from "react";
import api from "../api";
import "./Profile.css";

export default function Profile() {
    const [user, setUser] = useState(null);
    const [funds, setFunds] = useState([]);
    const [members, setMembers] = useState({});
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        username: "",
        email: "",
        phone: "",
        fullname: "",
        password: "",
        password_confirm: "",
    });

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await api.get("/user/");
            const currentUser = res.data;  // ← ذخیره کاربر فعلی
            setUser(currentUser);
            setForm({
                username: currentUser.username || "",
                email: currentUser.email || "",
                phone: currentUser.phone || "",
                fullname: currentUser.fullname || "",
                password: "",
                password_confirm: "",
            });
            fetchFunds(currentUser.role, currentUser); // ← حتما currentUser بده
        } catch (err) {
            console.error("fetchUser error:", err);
        }
    };

    const fetchFunds = async (role, currentUser) => {
        try {
            const res = await api.get("/funds/");
            if (Array.isArray(res.data)) {
                // res.data شامل charge_due و loan_due است
                setFunds(res.data);

                if (role === "admin" || role === "مدیر") {
                    // فقط برای نمایش اعضا
                    res.data.forEach((fund) => loadMembers(fund.id));
                }
            }
        } catch (err) {
            console.error("fetchFunds error:", err);
        }
    };

    const loadMembers = async (fundId) => {
        try {
            const res = await api.get(`/funds/${fundId}/members/`);
            setMembers((prev) => ({...prev, [fundId]: res.data}));
        } catch (err) {
            console.error("loadMembers error:", err);
        }
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        setForm((prev) => ({...prev, [name]: value}));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (form.password && form.password !== form.password_confirm) {
            return alert("رمز عبور و تکرار آن باید یکسان باشند.");
        }
        setSaving(true);
        try {
            const payload = {
                username: form.username,
                email: form.email,
                phone: form.phone,
                fullname: form.fullname,
            };
            if (form.password) payload.password = form.password;

            await api.patch(`/users/${user.id}/`, payload);
            alert("✅ اطلاعات با موفقیت ذخیره شد");
            setEditing(false);
            fetchUser();
        } catch (err) {
            console.error("Save error:", err);
            alert("❌ خطا در ذخیره اطلاعات کاربر");
        } finally {
            setSaving(false);
        }
    };

    if (!user) return <p className="text-center mt-10">در حال بارگذاری...</p>;

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h2>پروفایل کاربر</h2>
            </div>

            {!editing ? (
                <>
                    <div className="profile-info">
                        <p><strong>نام کامل:</strong> {user.fullname || "-"}</p>
                        <p><strong>نام کاربری:</strong> {user.username || "-"}</p>
                        <p><strong>ایمیل:</strong> {user.email || "-"}</p>
                        <p><strong>تلفن:</strong> {user.phone || "-"}</p>
                        <p><strong>نقش:</strong> {user.role === "admin" ? "مدیر" : "عضو"}</p>
                        <p><strong>تاریخ عضویت:</strong> {user.join_date || "-"}</p>
                    </div>

                    <button className="profile-edit-btn" onClick={() => setEditing(true)}>
                        ویرایش پروفایل
                    </button>
                </>
            ) : (
                <form className="profile-form" onSubmit={handleSave}>
                    <label>نام کامل</label>
                    <input name="fullname" value={form.fullname} onChange={handleChange}/>
                    <label>نام کاربری</label>
                    <input name="username" value={form.username} onChange={handleChange}/>
                    <label>ایمیل</label>
                    <input name="email" value={form.email} onChange={handleChange}/>
                    <label>تلفن</label>
                    <input name="phone" value={form.phone} onChange={handleChange}/>
                    <label>رمز جدید (اختیاری)</label>
                    <input type="password" name="password" value={form.password} onChange={handleChange}/>
                    <label>تکرار رمز جدید</label>
                    <input type="password" name="password_confirm" value={form.password_confirm}
                           onChange={handleChange}/>

                    <div className="btn-row">
                        <button type="submit" className="btn-save" disabled={saving}>
                            {saving ? "در حال ذخیره..." : "ذخیره"}
                        </button>
                        <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>
                            لغو
                        </button>
                    </div>
                </form>
            )}

            <div className="fund-list">
                <h3>صندوق‌های من</h3>
                {funds.length > 0 ? (
                    funds.map((f) => (
                        <div key={f.id} className="fund-item">
                            <p><strong>نام صندوق:</strong> {f.name}</p>
                            <p><strong>مدیر:</strong> {f.manager_name}</p>

                            {user.role === "admin" || user.role === "مدیر" ? (
                                <>
                                    <h4 style={{marginTop: "10px"}}>👥 اعضای صندوق:</h4>
                                    {members[f.id]?.length > 0 ? (
                                        <ul>
                                            {members[f.id].map((m) => (
                                                <li key={m.id}>
                                                    👤 {m.fullname || m.username} — 💰 بدهی
                                                    شارژ: {m.charge_due?.toLocaleString()} تومان — 💸 بدهی
                                                    وام: {m.loan_due?.toLocaleString()} تومان
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>هنوز عضوی وجود ندارد.</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p>💰 موجودی: {f.balance?.toLocaleString()} تومان</p>
                                    <p>📅 بدهی شارژ: {f.charge_due?.toLocaleString()} تومان</p>
                                    <p>💸 بدهی وام: {f.loan_due?.toLocaleString()} تومان</p>
                                </>
                            )}
                        </div>
                    ))
                ) : (
                    <p>عضو هیچ صندوقی نیستید.</p>
                )}
            </div>
        </div>
    );
}
