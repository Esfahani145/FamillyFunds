import React, {useEffect, useState} from 'react';
import api from '../api';

export default function Loans() {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/loans/')
            .then(res => {
                setLoans(res.data.filter(l => l.user === JSON.parse(localStorage.getItem('user')).id));
                setLoading(false);
            })
            .catch(err => {
                console.error('خطا در گرفتن وام‌ها:', err);
                setLoading(false);
            });
    }, []);

    if (loading) return <p>در حال بارگذاری...</p>;
    if (!loans.length) return <p>هیچ وامی ثبت نشده است.</p>;

    return (
        <div>
            <h3>وام‌های من</h3>
            <table>
                <thead>
                <tr>
                    <th>نام صندوق</th>
                    <th>مبلغ درخواست</th>
                    <th>مبلغ تایید شده</th>
                    <th>تاریخ درخواست</th>
                    <th>تعداد اقساط پرداخت شده</th>
                </tr>
                </thead>
                <tbody>
                {loans.map(loan => (
                    <tr key={loan.id}>
                        <td>{loan.fund_name || loan.fund}</td>
                        <td>{loan.requested_amount}</td>
                        <td>{loan.approved_amount || 0}</td>
                        <td>{loan.request_date}</td>
                        <td>{loan.paid_installments}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
