import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const apiBase = import.meta.env.VITE_MC1_URL || import.meta.env.VITE_API_URL;

export default function EditNamedNotePage() {
  const { token } = useAuth();
  const { name } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(name || "");

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!decodedName) return;
    fetch(`${apiBase}/notes/${encodeURIComponent(decodedName)}`, {
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
  }, [decodedName, token]);

  async function handleSave() {
    if (!decodedName.trim()) return;
    const method = exists ? "PUT" : "POST";
    const url = exists
      ? `${apiBase}/notes/${encodeURIComponent(decodedName)}`
      : `${apiBase}/notes`;
    const body = exists ? { content } : { name: decodedName, content };

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      navigate("/notes");
    } else {
      alert("Error saving note");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this note?")) return;
    const res = await fetch(`${apiBase}/notes/${encodeURIComponent(decodedName)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) navigate("/notes");
  }

  if (!decodedName) {
    return <p className="text-sm text-slate-500">Missing note name.</p>;
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-500">Notes</p>
        <h1 className="break-words text-2xl font-semibold tracking-tight">
          {decodedName}
        </h1>
      </div>

      <Card className="p-4 space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          className="min-h-[45dvh] resize-y"
          rows={10}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="w-full sm:w-auto" onClick={handleSave}>
            {exists ? "Update" : "Create"}
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
            onClick={() => navigate("/notes")}
          >
            Back
          </Button>
        </div>
      </Card>
    </div>
  );
}
