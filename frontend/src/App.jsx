import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./auth/AuthContext"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import DashboardPage from "./pages/DashboardPage"
import NotesPage from "./pages/NotesPage"
import MainLayout from "./layout/MainLayout"
import EditNotePage from "./pages/EditNotePage"
import OverviewPage from "./pages/OverviewPage"
import NamedNotesPage from "./pages/NamedNotesPage"
import EditNamedNotePage from "./pages/EditNamedNotePage"

export default function App() {
  const { token } = useAuth()

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/logbook" element={<NotesPage />} />
        <Route path="/logbook/:date" element={<EditNotePage />} />
        <Route path="/notes" element={<NamedNotesPage />} />
        <Route path="/notes/:name" element={<EditNamedNotePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </MainLayout>
  )
}
