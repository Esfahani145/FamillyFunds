import React, {useEffect, useState} from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import Profile from './Profile';
import Payments from './Payments';
import Logout from '../components/Logout';
import './AdminPanel.css';

export default function AdminPanel() {
    const [deposits, setDeposits] = useState([]);
    const [funds, setFunds] = useState([]);
    const [view, setView] = useState('dashboard');

    const user = JSON.parse(localStorage.getItem('user'));
    const userId = parseInt(user?.id);

    useEffect(() => {
        api.get('/payments/')
            .then(r => setDeposits(r.data))
            .catch(() => {
            });

        api.get('/funds/')
            .then(r => {
                if (Array.isArray(r.data)) {
                    r.data.forEach(f => console.log('fund.manager:', f.manager, typeof f.manager));

                    const filtered = r.data.filter(f => f.manager === userId);
                    setFunds(filtered);
                }
            })
            .catch(() => {
            });
    }, [userId]);

    const confirm = async (id) => {
        try {
            await api.post(`/deposits/${id}/confirm/`, {});
            alert('تأیید شد');
            window.location.reload();
        } catch (e) {
            alert('خطا در تایید');
        }
    };

    const renderContent = () => {
        if (view === 'profile') return <Profile/>;
        if (view === 'payments') return <Payments/>;
        if (view === 'logout') return <Logout/>;

        return (
            <div>
                <h3>صندوق‌ها</h3>
                {funds.length === 0 && <p>هیچ صندوقی ثبت نشده</p>}
                {funds.map(fund => (
                    <div key={fund.id} className="fund-info">
                        <h2>{fund.name}</h2>
                        <p>مدیر: {fund.manager_name}</p>
                        <p>
                            موجودی فعلی:{' '}
                            {fund.balance
                                ? fund.balance.toLocaleString()
                                : 0}{' '}
                            تومان
                        </p>
                    </div>
                ))}

                <h4>واریزها</h4>
                <ul>
                    {deposits.map(d => (
                        <li key={d.id}>
                            {d.user} - {d.amount} -{' '}
                            {d.is_confirmed
                                ? 'تأیید شده'
                                : <button onClick={() => confirm(d.id)}>تأیید</button>}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div className="admin-panel">
            <Sidebar onSelect={setView}/>
            <div className="main-content" style={{direction: 'rtl', padding: 20}}>
                {renderContent()}
            </div>
        </div>
    );
}
