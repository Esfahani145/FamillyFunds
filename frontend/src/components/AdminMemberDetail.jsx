import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

export default function AdminMemberDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get(`/users/${id}/`)
      .then(res => setUser(res.data))
      .catch(err => console.error("Error loading member:", err));
  }, [id]);

  if (!user) return <p>در حال بارگذاری...</p>;

  return (
    <div className="p-6" style={{ direction: "rtl" }}>
      <Link to="/admin" className="text-blue-500 hover:underline">← بازگشت</Link>
      <h2 className="text-2xl font-bold mb-4">اطلاعات کاربر {user.fullname}</h2>
      <div className="bg-white shadow rounded p-4 space-y-2">
        <p><strong>نام کامل:</strong> {user.fullname}</p>
        <p><strong>نام کاربری:</strong> {user.username}</p>
        <p><strong>ایمیل:</strong> {user.email || "-"}</p>
        <p><strong>شماره تماس:</strong> {user.phone || "-"}</p>
        <p><strong>نقش:</strong> {user.role}</p>
        <p><strong>تاریخ عضویت:</strong> {user.join_date}</p>
      </div>
    </div>
  );
}
