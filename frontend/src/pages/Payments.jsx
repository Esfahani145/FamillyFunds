import React, {useEffect, useState} from "react";
import api from "../api";

export default function Payments({user, onPaymentUpdate}) {
    const [payments, setPayments] = useState([]);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [selectedFundId, setSelectedFundId] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [funds, setFunds] = useState([]);

    useEffect(() => {
        if (!user) return;

        api.get("/payments/")
            .then(res => setPayments(res.data))
            .catch(err => console.error("Error fetching payments:", err));

        api.get("/funds/")
            .then(res => Array.isArray(res.data) && setFunds(res.data))
            .catch(err => console.error("Error fetching funds:", err));
    }, [user]);

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
                console.error("Error creating payment:", err.response?.status, err.response?.data);
            });
    };

    const approvePayment = (id) => {
        api.post(`/payments/${id}/approve/`)
            .then((res) => {
                setPayments(prev =>
                    prev.map(p =>
                        p.id === id
                            ? {...p, status: "approved", admin_note: "تأیید توسط مدیر"}
                            : p
                    )
                );

                if (onPaymentUpdate) onPaymentUpdate();
            })
            .catch(err => {
                console.error("Error:", err.response?.status, err.response?.data);
                alert("خطا در تأیید پرداخت");
            });
    };

    const rejectPayment = (id) => {
        const reason = prompt("دلیل رد پرداخت را بنویسید:");
        if (reason === null) return;

        api.post(`/payments/${id}/reject/`, {admin_note: reason})
            .then((res) => {
                alert(res.data.message || "پرداخت رد شد");
                setPayments(prev =>
                    prev.map(p =>
                        p.id === id
                            ? {...p, status: "rejected", admin_note: reason}
                            : p
                    )
                );
            })
            .catch((err) => {
                console.error("Error rejecting payment:", err.response?.data || err);
                alert("خطا در رد پرداخت");
            });
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
                    💸 پرداخت جدید
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
                                <p>وضعیت: {p.status === "rejected" ? "رد شده ❌" : p.status === "approved" ? "تأیید شده ✅" : "در انتظار تأیید ⏳"}</p>
                                {p.status === "rejected" && p.admin_note && (
                                    <p className="text-red-600">پیام مدیر: {p.admin_note}</p>
                                )}
                            </td>
                            <td className="p-2">{new Date(p.created_at).toLocaleDateString()}</td>
                            <td className="p-2"
                                style={{color: p.status === "rejected" ? "red" : p.status === "approved" ? "green" : "black"}}>
                                {p.admin_note || "-"}
                            </td>
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
