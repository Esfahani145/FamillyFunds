import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

export default function AdminFundMembers() {
  const { id } = useParams();
  const [fund, setFund] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    api.get(`/funds/${id}/`).then(res => setFund(res.data));
    api.get(`/funds/${id}/members/`).then(res => setMembers(res.data));
  }, [id]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">اعضای صندوق {fund?.name}</h2>

      {members.length === 0 ? (
        <p>هیچ عضوی یافت نشد.</p>
      ) : (
        <ul className="space-y-2">
          {members.map(m => (
            <li
              key={m.id}
              className="p-3 border rounded hover:bg-gray-100 transition"
            >
              <Link
                to={`/admin/member/${m.id}`}
                className="text-blue-600 hover:underline"
              >
                {m.fullname || m.username}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
