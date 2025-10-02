import React from 'react';

export default function Logout() {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };
  return <button onClick={handleLogout}>خروج از سیستم</button>;
}
