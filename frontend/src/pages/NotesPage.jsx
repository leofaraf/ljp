import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotesPage() {
  const { token } = useAuth();
  const [days, setDays] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://127.0.0.1:3000/notes/days", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDays(data))
      .catch(() => setDays([]));
  }, [token]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Notes</h1>
      <Button onClick={() => navigate(`/notes/${today}`)}>✍️ Write Today’s Note</Button>

      <Card className="mt-6 p-4">
        <h2 className="text-lg font-semibold mb-3">Days with Notes</h2>
        {days.length === 0 ? (
          <p className="text-gray-500">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {days.map((date) => (
              <li key={date}>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/notes/${date}`)}
                  className="w-full justify-start"
                >
                  🗓️ {date}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
