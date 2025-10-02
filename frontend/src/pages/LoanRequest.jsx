import React, {useState} from 'react';
import api from '../api';

export default function LoanRequest(){
  const [amount,setAmount]=useState('');
  const [num,setNum]=useState(1);
  const submit = async ()=>{
    try{
      await api.post('/loans/', {number: 'LN'+Date.now(), borrower:1, request_date: new Date().toISOString().slice(0,10), requested_amount: amount, num_installments: num});
      alert('درخواست ثبت شد');
      window.location.href='/dashboard';
    }catch(e){ alert('خطا') }
  }
  return (
    <div style={{direction:'rtl', padding:20}}>
      <h3>درخواست وام</h3>
      <div><input placeholder='مبلغ' value={amount} onChange={e=>setAmount(e.target.value)} /></div>
      <div><input placeholder='تعداد اقساط' value={num} onChange={e=>setNum(e.target.value)} /></div>
      <button onClick={submit}>ارسال درخواست</button>
    </div>
  )
}
