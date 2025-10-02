import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Login.css";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const submit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post("/token/", { username, password });

            if (res.data.access) {
                // ذخیره توکن‌ها
                localStorage.setItem("access", res.data.access);
                localStorage.setItem("refresh", res.data.refresh);

                const userRes = await api.get("/user/", {
                    headers: { Authorization: `Bearer ${res.data.access}` },
                });

                localStorage.setItem(
                    "user",
                    JSON.stringify({
                        id: userRes.data.id,
                        username: userRes.data.username,
                        role: userRes.data.role,
                        fullname: userRes.data.fullname,
                    })
                );

                // هدایت بر اساس نقش
                if (userRes.data.role === "admin") {
                    navigate("/admin");
                } else {
                    navigate("/dashboard");
                }
            } else {
                alert("نام کاربری یا رمز عبور اشتباه است");
            }
        } catch (err) {
            if (err.response && err.response.status === 401) {
                alert("نام کاربری یا رمز عبور اشتباه است");
            } else {
                alert("خطا در ارتباط با سرور");
                console.error(err);
            }
        }
    };

    return (
        <div className="login-container">
            <form className="login-card" onSubmit={submit}>
                <h2>ورود به سیستم</h2>
                <div className="form-group">
                    <label>نام کاربری</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>رمز عبور</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="login-btn">
                    ورود
                </button>
            </form>
        </div>
    );
}
