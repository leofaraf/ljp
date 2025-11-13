import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const token = await res.json();
      login(token);
      navigate("/");
    } else {
      alert("Invalid login");
    }
  }

  return (
    <div className="p-8 flex justify-center">
      <form onSubmit={handleSubmit} className="max-w-xs w-full space-y-4">
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <input
          className="border p-2 w-full"
          placeholder="Username"
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
        />
        <input
          className="border p-2 w-full"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
        />
        <button className="bg-black text-white w-full py-2">Log in</button>
        <Link to="/register" className="block text-center text-sm underline">Create account</Link>
      </form>
    </div>
  );
}
