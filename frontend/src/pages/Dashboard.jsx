import React, {useEffect, useState} from 'react';
import api from '../api';
import Sidebar from "../components/Sidebar";
import Profile from "./Profile";
import Loans from './Loans';
import './Dashboard.css';
import Payments from "./Payments";

export default function Dashboard() {
    const [me, setMem] = useState([]);
    const [view, setView] = useState('home');
    const [user, setUser] = useState(null);
    const [funds, setFunds] = useState([]);

    useEffect(() => {
        api.get('/user/').then(res => setUser(res.data))
            .catch(err => console.error(err));

        api.get('/funds/')
            .then(res => {
                if (Array.isArray(res.data)) {
                    setFunds(res.data);
                }
            })
            .catch(err => console.error(err));
    }, []);


    const renderContent = () => {
        switch (view) {
            case 'profile' :
                return <Profile user={user}/>
            case 'loans' :
                return <Loans/>
            case 'payments':
                return <Payments user={user}/>
            default :
                return (
                    <div>
                        <h2>صندوق‌ها</h2>
                        {funds.length === 0 && <p>شما عضو هیچ صندوقی نیستید</p>}
                        {funds.map(f => (
                            <div key={f.id} className="fund-card">
                                <h3>{f.name}</h3>
                                <p>موجودی: {f.balance.toLocaleString()} تومان</p>
                                <p>شارژ ماهانه: {f.monthly_charge}</p>
                                <button>درخواست وام</button>
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