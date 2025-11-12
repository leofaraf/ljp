import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Home, Notebook, BarChart3, LogOut } from "lucide-react";

export default function MainLayout({ children }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

    const menu = [
        { name: "Dashboard", path: "/", icon: <Home className="w-4 h-4 mr-2" /> },
        { name: "Overview", path: "/overview", icon: <BarChart3 className="w-4 h-4 mr-2" /> },
        { name: "Notes", path: "/notes", icon: <Notebook className="w-4 h-4 mr-2" /> },
    ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-white p-4 flex flex-col justify-between">
        <div>
          <div className="text-xl font-semibold mb-6 px-2">🗒️ LJP</div>

          <nav className="space-y-1">
            {menu.map((item) => (
              <Button
                key={item.path}
                variant={location.pathname === item.path ? "default" : "ghost"}
                className="w-full justify-start"
                asChild
              >
                <Link to={item.path}>
                  {item.icon}
                  {item.name}
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <Button
          variant="destructive"
          className="w-full mt-6"
          onClick={() => {
            logout()
            navigate("/login")
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <Card className="p-6 shadow-sm">{children}</Card>
      </main>
    </div>
  )
}
