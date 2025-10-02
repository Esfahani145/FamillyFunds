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
    const [members, setMembers] = useState({});
    const [newMemberId, setNewMemberId] = useState({});
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
                    const filtered = r.data.filter(f => f.manager === userId);
                    setFunds(filtered);

                    filtered.forEach(f => loadMembers(f.id));
                }
            })
            .catch(() => {
            });
    }, [userId]);

    const loadMembers = (fundId) => {
        api.get(`/funds/${fundId}/members/`)
            .then(res => setMembers(prev => ({...prev, [fundId]: res.data})))
            .catch(err => console.error(err));
    };

    const addMember = (fundId) => {
        const uid = newMemberId[fundId];
        if (!uid) return;
        api.post(`/funds/${fundId}/add_member/`, {user_id: uid})
            .then(() => {
                loadMembers(fundId);
                setNewMemberId(prev => ({...prev, [fundId]: ''}));
            });
    };

    const removeMember = (fundId, userId) => {
        api.post(`/funds/${fundId}/remove_member/`, {user_id: userId})
            .then(() => loadMembers(fundId));
    };

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
                        <p>موجودی فعلی: {fund.balance ? fund.balance.toLocaleString() : 0} تومان</p>

                        <h4>اعضای صندوق</h4>
                        <ul>
                            {(members[fund.id] || []).map(m => (
                                <li key={m.id}>
                                    {m.fullname} ({m.username})
                                    <button onClick={() => removeMember(fund.id, m.id)}>حذف</button>
                                </li>
                            ))}
                        </ul>
                        <input
                            type="number"
                            placeholder="User ID"
                            value={newMemberId[fund.id] || ''}
                            onChange={e => setNewMemberId(prev => ({...prev, [fund.id]: e.target.value}))}
                        />
                        <button onClick={() => addMember(fund.id)}>افزودن عضو</button>
                    </div>
                ))}

                <h4>واریزها</h4>
                <ul>
                    {deposits.map(d => (
                        <li key={d.id}>
                            {d.user} - {d.amount} -{' '}
                            {d.is_confirmed ? 'تأیید شده' : <button onClick={() => confirm(d.id)}>تأیید</button>}
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
