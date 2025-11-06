import React, {useEffect, useState} from 'react';
import api from '../api';
import Sidebar from "../components/Sidebar";
import Profile from "./Profile";
import Loans from './Loans';
import './Dashboard.css';
import Payments from "./Payments";

export default function Dashboard() {
    const [view, setView] = useState('home');
    const [user, setUser] = useState(null);
    const [funds, setFunds] = useState([]);

    const fetchFunds = () => {
        api.get('/funds/')
            .then(res => Array.isArray(res.data) && setFunds(res.data))
            .catch(err => console.error(err));
    };

    const requestLoan = async (fundId) => {
        try {
            if (!user) return alert("ابتدا وارد حساب شوید.");

            const amount = prompt("مبلغ وام را وارد کنید (تومان):");
            if (!amount || isNaN(amount)) return alert("عدد معتبر وارد کنید.");

            await api.post("/loans/", {
                fund: fundId,
                user: user.id,
                requested_amount: parseInt(amount),
                amount: parseInt(amount),
            });


            alert("✅ درخواست وام با موفقیت ثبت شد");
            fetchFunds();
        } catch (err) {
            console.error("Loan request error:", err.response?.data || err);
            alert("❌ خطا در ثبت درخواست وام");
        }
    };


    useEffect(() => {
        api.get('/user/')
            .then(res => setUser(res.data))
            .catch(err => console.error(err));

        fetchFunds();
    }, []);

    const renderContent = () => {
        switch (view) {
            case 'profile':
                return <Profile user={user}/>;
            case 'loans':
                return <Loans/>;
            case 'payments':
                return user ? (
                    <Payments user={user} onPaymentUpdate={() => {
                        api.get('/funds/').then(res => {
                            if (Array.isArray(res.data)) setFunds(res.data);
                        });
                    }}/>
                ) : (
                    <p>در حال بارگذاری...</p>
                );
            default:
                return (
                    <div>
                        <h2>صندوق‌ها</h2>
                        {funds.length === 0 && <p>شما عضو هیچ صندوقی نیستید</p>}
                        {funds.map(f => (
                            <div key={f.id} className="fund-card">
                                <h3>{f.name}</h3>
                                <p>موجودی: {f.balance.toLocaleString()} تومان</p>
                                <p>شارژ ماهانه: {f.charge_due?.toLocaleString()} تومان</p>
                                {user?.role !== "admin" && (
                                    <button onClick={() => requestLoan(f.id)}>درخواست وام</button>
                                )}
                            </div>
                        ))}
                    </div>
                );
        }
    };

    return (
        <div className="user-dashboard">
            <Sidebar onSelect={setView} isUser/>
            <div className="main-content">
                {renderContent()}
            </div>
        </div>
    );
}
