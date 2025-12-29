import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const apiBase = import.meta.env.VITE_MC1_URL || import.meta.env.VITE_API_URL;

export default function NamedNotesPage() {
  const { token } = useAuth();
  const [names, setNames] = useState([]);
  const [newName, setNewName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${apiBase}/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) {
          setNames([]);
        } else {
          setNames(data);
        }
      })
      .catch(() => setNames([]));
  }, [token]);

  function goToNote(name) {
    if (!name.trim()) return;
    navigate(`/notes/${encodeURIComponent(name.trim())}`);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Notes</h1>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Enter a note name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button onClick={() => goToNote(newName)}>Create / Edit</Button>
        </div>
        <p className="text-sm text-gray-500">
          Creates the note if it does not exist, or opens it if it does.
        </p>
      </Card>

      <Card className="mt-6 p-4">
        <h2 className="text-lg font-semibold mb-3">Your Notes</h2>
        {!Array.isArray(names) || names.length === 0 ? (
          <p className="text-gray-500">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {names.map((name) => (
              <li key={name}>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => goToNote(name)}
                >
                  {name}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
