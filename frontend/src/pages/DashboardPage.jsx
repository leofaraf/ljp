import { Link } from "react-router-dom";
import { BarChart3, BookText, Notebook } from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-500">Dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Hello, {user.username}
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-3 p-4">
          <Notebook className="h-5 w-5 text-slate-500" />
          <div className="space-y-1">
            <h2 className="font-semibold">Logbook</h2>
            <p className="text-sm text-slate-500">Daily entries</p>
          </div>
          <Button asChild className="mt-auto w-full">
            <Link to="/logbook">Open</Link>
          </Button>
        </Card>

        <Card className="gap-3 p-4">
          <BookText className="h-5 w-5 text-slate-500" />
          <div className="space-y-1">
            <h2 className="font-semibold">Notes</h2>
            <p className="text-sm text-slate-500">Named notes</p>
          </div>
          <Button asChild className="mt-auto w-full">
            <Link to="/notes">Open</Link>
          </Button>
        </Card>

        <Card className="gap-3 p-4">
          <BarChart3 className="h-5 w-5 text-slate-500" />
          <div className="space-y-1">
            <h2 className="font-semibold">Overview</h2>
            <p className="text-sm text-slate-500">Recent activity</p>
          </div>
          <Button asChild className="mt-auto w-full">
            <Link to="/overview">Open</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
