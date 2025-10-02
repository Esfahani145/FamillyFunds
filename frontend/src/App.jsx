import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import DepositForm from './pages/DepositForm';
import LoanRequest from './pages/LoanRequest';

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Login/>} />
        <Route path='/dashboard' element={<Dashboard/>} />
        <Route path='/admin' element={<AdminPanel/>} />
        <Route path='/deposit' element={<DepositForm/>} />
        <Route path='/loan' element={<LoanRequest/>} />
      </Routes>
    </BrowserRouter>
  )
}
