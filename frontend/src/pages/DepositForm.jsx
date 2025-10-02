import React, {useState} from 'react';
import api from '../api';

export default function DepositForm(){
  const [amount,setAmount]=useState('');
  const [note,setNote]=useState('');
  const submit = async ()=>{
    // naive: set user to 1
    try{
      await api.post('/deposits/', {user:1, amount, date: new Date().toISOString().slice(0,10), user_note:note});
      alert('ثبت شد؛ منتظر تأیید مدیر');
      window.location.href='/dashboard';
    }catch(e){ alert('خطا') }
  }
  return (
    <div style={{direction:'rtl', padding:20}}>
      <h3>ثبت واریز</h3>
      <div><input value={amount} onChange={e=>setAmount(e.target.value)} placeholder='مبلغ' /></div>
      <div><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder='شرح' /></div>
      <button onClick={submit}>ارسال به مدیر</button>
    </div>
  )
}
