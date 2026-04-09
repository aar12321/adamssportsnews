import React from "react";
import { useLocation, Link } from "wouter";
import { LayoutDashboard, AppWindow, User, BarChart3, Smartphone, Monitor, Moon, Sun, Trophy } from "lucide-react";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/apps", label: "Apps", icon: AppWindow },
  { href: "/profile", label: "Profile", icon: User },
];

function DesktopSidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { viewMode, setViewMode, actualDevice } = useViewMode();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none text-foreground">ProSports</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Premium Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <a className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}>
                <Icon className="w-5 h-5" />
                {label}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer controls */}
      <div className="p-4 border-t border-border space-y-2">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setViewMode("mobile")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
              viewMode === "mobile"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile
          </button>
          <button
            onClick={() => setViewMode("desktop")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
              viewMode === "desktop"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="w-3.5 h-3.5" />
            Desktop
          </button>
        </div>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-40 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <a className={cn(
                "flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <Icon className={cn("w-5 h-5 transition-all", isActive && "scale-110")} />
                <span className="text-[10px] font-medium">{label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileHeader() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const currentPage = navItems.find(item => item.href === "/" ? location === "/" : location.startsWith(item.href));

  return (
    <header className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border z-40">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Trophy className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">ProSports</span>
        </div>
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { viewMode } = useViewMode();
  const isMobile = viewMode === "mobile";

  return (
    <div className={cn("min-h-screen bg-background", isMobile ? "mobile-layout" : "desktop-layout")}>
      {isMobile ? (
        <>
          <MobileHeader />
          <main className="pt-16 pb-20 px-4 min-h-screen">
            {children}
          </main>
          <MobileBottomNav />
        </>
      ) : (
        <>
          <DesktopSidebar />
          <main className="ml-64 min-h-screen p-8">
            {children}
          </main>
        </>
      )}
    </div>
  );
}
