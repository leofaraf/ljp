import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/logbook/${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 404) {
          setExists(false);
          setLoading(false);
          return null;
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
    const res = await fetch(`${import.meta.env.VITE_API_URL}/logbook`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ note_date: date, content }),
    });
    if (res.ok) {
      navigate("/logbook");
    } else {
      alert("Error saving note");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this note?")) return;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/logbook/${date}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) navigate("/logbook");
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-500">Logbook</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Logbook Notes - {date}
        </h1>
      </div>

      <Card className="p-4 space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your notes..."
          className="min-h-[45dvh] resize-y"
          rows={10}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="w-full sm:w-auto" onClick={handleSave}>
            {exists ? "Update Note" : "Create Note"}
          </Button>
          {exists && (
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate("/logbook")}
          >
            Back
          </Button>
        </div>
      </Card>
    </div>
  );
}
