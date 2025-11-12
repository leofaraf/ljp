import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch("http://127.0.0.1:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      navigate("/login");
    } else {
      alert("Username already exists");
    }
  }

  return (
    <div className="p-8 flex justify-center">
      <form onSubmit={handleSubmit} className="max-w-xs w-full space-y-4">
        <h1 className="text-2xl font-bold text-center">Register</h1>
        <input className="border p-2 w-full" placeholder="Username" value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })} />
        <input className="border p-2 w-full" placeholder="Password" type="password" value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })} />
        <button className="bg-black text-white w-full py-2">Register</button>
        <Link to="/login" className="block text-center text-sm underline">Back to login</Link>
      </form>
    </div>
  );
}
