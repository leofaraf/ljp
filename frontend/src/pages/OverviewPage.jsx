import { useEffect, useState } from "react";
import { addDays, format } from "date-fns";

import { useAuth } from "../auth/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRange } from "../lib/date";

export default function OverviewPage() {
  const { token } = useAuth();
  const [mode, setMode] = useState("week");
  const [notes, setNotes] = useState([]);
  const [calendarMonths, setCalendarMonths] = useState(1);
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: addDays(new Date(), 7),
  });

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const updateCalendarMonths = () => setCalendarMonths(query.matches ? 2 : 1);

    updateCalendarMonths();
    query.addEventListener("change", updateCalendarMonths);

    return () => query.removeEventListener("change", updateCalendarMonths);
  }, []);

  useEffect(() => {
    const [from, to] = getRange(mode);
    setDateRange({ from, to });
  }, [mode]);

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;

    fetch(`${import.meta.env.VITE_API_URL}/logbook/days`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then(async (dates) => {
        const filtered = dates.filter((d) => {
          const date = new Date(d);
          return date >= dateRange.from && date <= dateRange.to;
        });
        const results = [];
        for (const d of filtered) {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/logbook/${d}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const note = await res.json();
            results.push(note);
          }
        }
        setNotes(results);
      })
      .catch(() => setNotes([]));
  }, [dateRange, token]);

  const rangeFrom = dateRange.from ?? new Date();
  const rangeTo = dateRange.to ?? dateRange.from ?? new Date();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">Overview</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Logbook activity
          </h1>
        </div>

        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="h-10 w-full sm:w-48">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "custom" && (
        <Card className="p-3 sm:p-4">
          <h2 className="mb-3 text-base font-semibold">Select Date Range</h2>
          <div className="overflow-x-auto">
            <Calendar
              mode="range"
              numberOfMonths={calendarMonths}
              selected={dateRange}
              onSelect={(range) => setDateRange(range ?? {})}
              className="mx-auto w-fit"
            />
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="text-lg font-semibold">
          Logbook ({format(rangeFrom, "MMM d")} - {format(rangeTo, "MMM d, yyyy")})
        </h2>

        {notes.length === 0 ? (
          <p className="text-gray-500">No logbook entries in this period.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Card
                key={note.note_date ?? note.date}
                className="gap-2 border p-4 shadow-none"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-700">
                    {note.note_date ?? note.date}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  {note.content}
                </p>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
