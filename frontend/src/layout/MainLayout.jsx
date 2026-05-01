import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, BookText, Home, LogOut, Notebook } from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";

const menu = [
  { name: "Dashboard", path: "/", icon: Home },
  { name: "Overview", path: "/overview", icon: BarChart3 },
  { name: "Logbook", path: "/logbook", icon: Notebook },
  { name: "Notes", path: "/notes", icon: BookText },
];

export default function MainLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function isActive(path) {
    return path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950 md:flex">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 md:flex">
        <div>
          <Link
            to="/"
            className="mb-6 flex h-11 items-center rounded-md px-2 text-xl font-semibold tracking-tight"
          >
            LJP
          </Link>

          <nav className="space-y-1" aria-label="Main navigation">
            {menu.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link
                    to={item.path}
                    aria-current={isActive(item.path) ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>

        <Button
          variant="destructive"
          className="mt-auto w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col md:pl-64">
        <header className="mobile-safe-top sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            LJP
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Logout"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 px-4 py-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
        aria-label="Mobile navigation"
      >
        {menu.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-slate-950 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
