import { useEffect, useState } from "react"
import { useAuth } from "../auth/AuthContext"
import { format, addDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { getRange } from "../lib/date"

export default function OverviewPage() {
  const { token } = useAuth()
  const [mode, setMode] = useState("week")
  const [notes, setNotes] = useState([])
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: addDays(new Date(), 7),
  })

  // Update range automatically when mode changes
  useEffect(() => {
    const [from, to] = getRange(mode)
    setDateRange({ from, to })
  }, [mode])

  // Fetch and filter notes by date range
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return
    fetch("http://127.0.0.1:3000/notes/days", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then(async (dates) => {
        const filtered = dates.filter((d) => {
          const date = new Date(d)
          return date >= dateRange.from && date <= dateRange.to
        })
        const results = []
        for (const d of filtered) {
          const res = await fetch(`http://127.0.0.1:3000/notes/${d}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const note = await res.json()
            results.push(note)
          }
        }
        setNotes(results)
      })
      .catch(() => setNotes([]))
  }, [dateRange, token])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold">Overview</h1>

        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-48">
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
        <Card className="p-4 mb-4">
          <h2 className="text-md font-semibold mb-2">Select Date Range</h2>
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={dateRange}
            onSelect={setDateRange}
          />
        </Card>
      )}

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2">
          Notes ({format(dateRange.from, "MMM d")} →{" "}
          {format(dateRange.to, "MMM d, yyyy")})
        </h2>

        {notes.length === 0 ? (
          <p className="text-gray-500">No notes in this period.</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <Card key={note.date} className="p-4 border">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm text-gray-700">
                    {note.date}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
