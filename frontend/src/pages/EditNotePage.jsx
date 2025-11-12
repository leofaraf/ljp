import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function EditNotePage() {
  const { token } = useAuth();
  const { date } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);

  // Load existing note (if any)
  useEffect(() => {
    fetch(`http://127.0.0.1:3000/notes/${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 404) {
          setExists(false);
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data?.content) {
          setContent(data.content);
          setExists(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, token]);

  async function handleSave() {
    const method = exists ? "PUT" : "POST";
    const res = await fetch("http://127.0.0.1:3000/notes", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ note_date: date, content }),
    });
    if (res.ok) {
      navigate("/notes");
    } else {
      alert("Error saving note");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this note?")) return;
    const res = await fetch(`http://127.0.0.1:3000/notes/${date}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) navigate("/notes");
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Edit Note — {date}</h1>
      <Card className="p-4 space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          rows={10}
        />
        <div className="flex gap-2">
          <Button onClick={handleSave}>{exists ? "💾 Update" : "📝 Create"}</Button>
          {exists && (
            <Button variant="destructive" onClick={handleDelete}>
              🗑️ Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/notes")}>
            ← Back
          </Button>
        </div>
      </Card>
    </div>
  );
}
