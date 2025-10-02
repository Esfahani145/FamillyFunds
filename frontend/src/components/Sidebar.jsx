import React from 'react';
import {FaUser, FaMoneyBillWave, FaSignOutAlt, FaHome} from 'react-icons/fa';
import './Sidebar.css';

export default function ({onSelect}) {
    return (
        <div className="sidebar">
            <div className='sidebar-top' onClick={() => onSelect('AdminPanel')}>
                <FaHome size={30}/>
                <span>صفحه اصلی</span>
            </div>
            <div className='sidebar-top' onClick={() => onSelect('profile')}>
                <FaUser size={30}/>
                <span>پروفایل</span>
            </div>
            <div className="sidebar-middle" onClick={() => onSelect('payments')}>
                <FaMoneyBillWave size={30}/>
                <span>ریز پرداخت‌ها</span>
            </div>
            <div className="sidebar-bottom" onClick={() => onSelect('logout')}>
                <FaSignOutAlt size={30}/>
                <span>خروج</span>
            </div>
        </div>
    )
}