import React, {useEffect, useState} from "react";
import api from "../api";

export default function Payments() {
    const [payments, setPayments] = useState([]);
    const [user, setUser] = useState(null);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [selectedFundId, setSelectedFundId] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [funds, setFunds] = useState([]);
    useEffect(() => {
        api.get("/user/")
            .then(res => console.log("User Info:", res.data))
            .catch(err => console.error("Error:", err.response?.status, err.response?.data));
    }, []);

    useEffect(() => {
        api.get("/user/")
            .then((res) => setUser(res.data));
        api.get("/payments/")
            .then((res) => setPayments(res.data))
            .catch((err) => {
                console.error("Error:", err.response?.status, err.response?.data);
            });

        api.get('/funds/')
            .then(res => {
                if (Array.isArray(res.data)) {
                    setFunds(res.data);
                }
            })
            .catch((err) => {
                console.error("Error:", err.response?.status, err.response?.data);
            });
    }, []);

    const submitPayment = (e) => {
        e.preventDefault();
        if (!selectedFundId) return alert("لطفا صندوق را انتخاب کنید");

        api.post("/payments/", {
            amount: amount,
            fund: selectedFundId,
            user_note: note
        })
            .then(() => {
                setShowForm(false);
                setAmount("");
                setNote("");
                setSelectedFundId("");
                api.get("/payments/").then((res) => setPayments(res.data));
                 if (onPaymentUpdate) onPaymentUpdate();
            })
            .catch((err) => {
                console.error("Error:", err.response?.status, err.response?.data);
            });
    };

    const approvePayment = (id) => {
        api.post(`/payments/${id}/approve/`)
            .then(() => api.get("/payments/").then(res => setPayments(res.data)));
    };

    const rejectPayment = (id) => {
        const reason = prompt("علت رد پرداخت را بنویسید:");
        if (!reason) return;
        api.patch(`/payments/${id}/`, {status: "rejected", admin_note: reason})
            .then(() => api.get("/payments/").then((res) => setPayments(res.data)));
    };

    if (!user) return <p>در حال بارگذاری...</p>;

    if (user.role === "member") {
        return (
            <div className="p-4">
                <h2 className="text-xl mb-4">📋 ریزپرداخت‌های من</h2>

                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-green-500 text-white p-2 rounded mb-3"
                >
                </button>

                {showForm && (
                    <form onSubmit={submitPayment} className="bg-gray-100 p-4 rounded mb-4">
                        <label>انتخاب صندوق:</label>
                        <select
                            value={selectedFundId}
                            onChange={(e) => setSelectedFundId(e.target.value)}
                            className="border p-2 rounded w-full mb-2"
                        >
                            <option value="">انتخاب کنید</option>
                            {funds.map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>

                        <label>مبلغ (تومان):</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="border p-2 rounded w-full mb-2"
                        />

                        <label>یادداشت برای ادمین:</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="border p-2 rounded w-full mb-2"
                        />

                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                            ارسال برای تأیید
                        </button>
                    </form>
                )}

                <table className="w-full border">
                    <thead>
                    <tr className="bg-gray-200 text-right">
                        <th className="p-2">صندوق</th>
                        <th className="p-2">مبلغ</th>
                        <th className="p-2">وضعیت</th>
                        <th className="p-2">تاریخ</th>
                        <th className="p-2">یادداشت ادمین</th>
                    </tr>
                    </thead>
                    <tbody>
                    {payments.map((p) => (
                        <tr key={p.id} className="border-t">
                            <td className="p-2">{p.fund_name || "-"}</td>
                            <td className="p-2">{p.amount.toLocaleString()} تومان</td>
                            <td className="p-2">
                                {p.status === "approved"
                                    ? "✅ تأیید شده"
                                    : p.status === "rejected"
                                        ? "❌ رد شده"
                                        : "⌛ در انتظار"}
                            </td>
                            <td className="p-2">{new Date(p.created_at).toLocaleDateString()}</td>
                            <td className="p-2">{p.admin_note || "-"}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (user.role === "admin") {
        return (
            <div className="p-4">
                <h2 className="text-xl mb-4">🧾 تأیید پرداخت‌های کاربران</h2>
                <table className="w-full border">
                    <thead>
                    <tr className="bg-gray-200 text-right">
                        <th className="p-2">کاربر</th>
                        <th className="p-2">صندوق</th>
                        <th className="p-2">مبلغ</th>
                        <th className="p-2">وضعیت</th>
                        <th className="p-2">یادداشت کاربر</th>
                        <th className="p-2">عملیات</th>
                    </tr>
                    </thead>
                    <tbody>
                    {payments.map((p) => (
                        <tr key={p.id} className="border-t">
                            <td className="p-2">{p.user_fullname || p.user}</td>
                            <td className="p-2">{p.fund_name || "-"}</td>
                            <td className="p-2">{p.amount.toLocaleString()} تومان</td>
                            <td className="p-2">{p.status}</td>
                            <td className="p-2">{p.user_note || "-"}</td>
                            <td className="p-2">
                                {p.status === "pending" ? (
                                    <>
                                        <button
                                            onClick={() => approvePayment(p.id)}
                                            className="bg-green-500 text-white px-2 py-1 rounded mx-1"
                                        >
                                            ✅ تأیید
                                        </button>
                                        <button
                                            onClick={() => rejectPayment(p.id)}
                                            className="bg-red-500 text-white px-2 py-1 rounded mx-1"
                                        >
                                            ❌ رد
                                        </button>
                                    </>
                                ) : p.status === "approved" ? (
                                    "✅ تأیید شده"
                                ) : (
                                    "❌ رد شده"
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        );
    }
    return null;
}
