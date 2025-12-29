import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    const body = exists
      ? { content }
      : { name: decodedName, content };

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
    const res = await fetch(
      `${apiBase}/notes/${encodeURIComponent(decodedName)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (res.ok) navigate("/notes");
  }

  if (!decodedName) return <p>Missing note name.</p>;
  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Note: {decodedName}</h1>
      <Card className="p-4 space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          rows={10}
        />
        <div className="flex gap-2">
          <Button onClick={handleSave}>{exists ? "Update" : "Create"}</Button>
          {exists && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/notes")}>
            Back
          </Button>
        </div>
      </Card>
    </div>
  );
}
