import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Sidebar from "../components/Sidebar";
import Profile from "./Profile";
import Payments from "./Payments";
import Logout from "../components/Logout";
import "./AdminPanel.css";

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [funds, setFunds] = useState([]);
  const [members, setMembers] = useState({});
  const [view, setView] = useState("dashboard");
  const [newMember, setNewMember] = useState({
    username: "",
    fullname: "",
    national_id: "",
    phone: "",
  });

  useEffect(() => {
    api.get("/user/")
      .then((r) => setUser(r.data))
      .catch(console.error);

    api.get("/funds/")
      .then((r) => {
        if (Array.isArray(r.data)) {
          setFunds(r.data);
          r.data.forEach((f) => loadMembers(f.id));
        }
      })
      .catch(console.error);
  }, []);

  const loadMembers = (fundId) => {
    api.get(`/funds/${fundId}/members/`)
      .then((res) =>
        setMembers((prev) => ({
          ...prev,
          [fundId]: res.data,
        }))
      )
      .catch(console.error);
  };

  const addMember = (fundId) => {
    api.post(`/funds/${fundId}/add_member/`, newMember)
      .then(() => {
        setNewMember({ username: "", fullname: "", national_id: "", phone: "" });
        loadMembers(fundId);
        alert("✅ عضو جدید با موفقیت اضافه شد!");
      })
      .catch((err) => {
        const msg = err.response?.data?.error || "خطای شبکه یا ناشناخته رخ داد";
        alert("❌ خطا: " + msg);
      });
  };

  const removeMember = (fundId, userId) => {
    if (!window.confirm("آیا از حذف این عضو مطمئن هستید؟")) return;
    api
      .post(`/funds/${fundId}/remove_member/`, { user_id: userId })
      .then(() => loadMembers(fundId))
      .catch(console.error);
  };

  const renderContent = () => {
    if (view === "profile") return <Profile user={user} />;
    if (view === "payments") return <Payments user={user} />;
    if (view === "logout") return <Logout />;

    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">📊 مدیریت صندوق‌ها</h2>
        {funds.length === 0 ? (
          <p>هیچ صندوقی ثبت نشده است.</p>
        ) : (
          funds.map((fund) => (
            <div key={fund.id} className="fund-info border rounded p-4 mb-6 shadow-sm bg-white">
              <h3 className="text-xl font-semibold mb-2">{fund.name}</h3>
              <p>👤 مدیر: {fund.manager_name}</p>
              <p>💰 موجودی فعلی: {fund.balance ? Number(fund.balance).toLocaleString() : 0} تومان</p>

              <h4 className="mt-4 font-semibold">👥 اعضای صندوق:</h4>
              {(members[fund.id]?.length ?? 0) === 0 ? (
                <p className="text-gray-500">هنوز عضوی وجود ندارد.</p>
              ) : (
                <ul className="list-disc mr-4 space-y-1">
                  {members[fund.id].map((m) => (
                    <li key={m.id} className="flex items-center justify-between">
                      {/* 👇 لینک به صفحه جزئیات عضو */}
                      <Link
                        to={`/admin/member/${m.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {m.fullname || m.username}
                      </Link>

                      <button
                        onClick={() => removeMember(fund.id, m.id)}
                        className="text-red-500 text-sm hover:underline"
                      >
                        حذف
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* 🧩 فرم افزودن عضو */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="نام کاربری"
                  value={newMember.username}
                  onChange={(e) =>
                    setNewMember({ ...newMember, username: e.target.value })
                  }
                  className="border p-2 rounded"
                />
                <input
                  type="text"
                  placeholder="نام کامل"
                  value={newMember.fullname}
                  onChange={(e) =>
                    setNewMember({ ...newMember, fullname: e.target.value })
                  }
                  className="border p-2 rounded"
                />
                <input
                  type="text"
                  placeholder="کد ملی"
                  value={newMember.national_id}
                  onChange={(e) =>
                    setNewMember({ ...newMember, national_id: e.target.value })
                  }
                  className="border p-2 rounded"
                />
                <input
                  type="text"
                  placeholder="شماره موبایل"
                  value={newMember.phone}
                  onChange={(e) =>
                    setNewMember({ ...newMember, phone: e.target.value })
                  }
                  className="border p-2 rounded"
                />
              </div>
              <button
                onClick={() => addMember(fund.id)}
                className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                ➕ افزودن عضو جدید
              </button>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="admin-panel flex">
      <Sidebar onSelect={setView} />
      <div className="main-content flex-1 p-6 bg-gray-50" style={{ direction: "rtl" }}>
        {renderContent()}
      </div>
    </div>
  );
}
