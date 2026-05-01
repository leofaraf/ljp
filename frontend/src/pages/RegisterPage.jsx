import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch(`${import.meta.env.VITE_API_URL}/register`, {
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
    <div className="mobile-safe-top flex min-h-dvh items-center justify-center bg-slate-50 px-4 pb-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <Card className="gap-5 p-5 sm:p-6">
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-slate-500">LJP</p>
            <h1 className="text-2xl font-semibold tracking-tight">Register</h1>
          </div>

          <div className="space-y-3">
            <label className="sr-only" htmlFor="username">
              Username
            </label>
            <Input
              id="username"
              className="h-11"
              placeholder="Username"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />

            <label className="sr-only" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              className="h-11"
              placeholder="Password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <Button type="submit" className="h-11 w-full">
              Register
            </Button>
            <Link
              to="/login"
              className="block rounded-md py-2 text-center text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
            >
              Back to login
            </Link>
          </div>
        </Card>
      </form>
    </div>
  );
}
