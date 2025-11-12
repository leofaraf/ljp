import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <p>Loading...</p>;

  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold">Hello, {user.username}! 👋</h1>
      <button
        onClick={() => { logout(); navigate("/login"); }}
        className="mt-4 bg-red-500 text-white px-4 py-2"
      >
        Logout
      </button>
    </div>
  );
}
