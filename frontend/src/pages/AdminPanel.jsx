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
    const [newMember, setNewMember] = useState({   // ✅ اینجا تعریف شد
        username: "",
        fullname: "",
        national_id: ""
    });

    const user = JSON.parse(localStorage.getItem('user'));
    const userId = parseInt(user?.id);

    const loadMembers = (fundId) => {
        api.get(`/funds/${fundId}/members/`)
            .then(res => setMembers(prev => ({...prev, [fundId]: res.data})))
            .catch(err => console.error(err));
    };

    const addMember = (fundId) => {
        api.post(`/funds/${fundId}/add_member/`, {
            username: newMember.username,
            fullname: newMember.fullname,
            national_id: newMember.national_id,
            phone: newMember.phone,
        })
            .then(() => {
                setNewMember({username: "", fullname: "", national_id: "", phone: ""});
                loadMembers(fundId);
                alert("عضو جدید با موفقیت اضافه شد!");
            })
            .catch(err => {
                if (err.response && err.response.data && err.response.data.error) {
                    alert("خطا: " + err.response.data.error);
                } else {
                    alert("خطای شبکه یا ناشناخته رخ داد");
                }
            });
    };

    const removeMember = (fundId, userId) => {
        api.post(`/funds/${fundId}/remove_member/`, {user_id: userId})
            .then(() => loadMembers(fundId));
    };

    const confirm = async (id) => {
        try {
            await api.post(`/payments/${id}/confirm/`, {});  // ✅ مطمئن شو URL در backend همین باشه
            alert('تأیید شد');
            window.location.reload();
        } catch (e) {
            alert('خطا در تایید');
        }
    };

    useEffect(() => {
        api.get('/funds/')
            .then(r => {
                if (Array.isArray(r.data)) {
                    const filtered = r.data.filter(f => f.manager === userId);
                    setFunds(filtered);
                    filtered.forEach(f => loadMembers(f.id));
                }
            })
            .catch(console.error);

        api.get('/payments/')
            .then(r => setDeposits(r.data))
            .catch(console.error);

    }, [userId]);

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
                            type="text"
                            placeholder="نام کاربری"
                            value={newMember.username}
                            onChange={e => setNewMember({...newMember, username: e.target.value})}
                        />
                        <input
                            type="text"
                            placeholder="نام کامل"
                            value={newMember.fullname}
                            onChange={e => setNewMember({...newMember, fullname: e.target.value})}
                        />
                        <input
                            type="text"
                            placeholder="کد ملی"
                            value={newMember.national_id}
                            onChange={e => setNewMember({...newMember, national_id: e.target.value})}
                        />
                        <input
                            type="text"
                            placeholder="شماره موبایل"
                            value={newMember.phone || ""}
                            onChange={e => setNewMember({...newMember, phone: e.target.value})}
                        />

                        <button onClick={() => addMember(fund.id)}>افزودن عضو جدید</button>
                    </div>
                ))}
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
