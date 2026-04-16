import React from "react";
import { Link } from "wouter";
import { DollarSign, Trophy, BarChart3, ArrowRight, Zap, TrendingUp, Users, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

const apps = [
  {
    href: "/apps/betting",
    name: "Sports Betting",
    description: "AI-powered win probability analysis, spread recommendations, and mock betting with $10,000 virtual bankroll",
    icon: DollarSign,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    gradient: "from-green-500/20 to-green-500/5",
    badge: "Hot",
    badgeColor: "bg-red-500/15 text-red-400",
    features: ["Win probability", "Spread analysis", "Mock betting", "Bet history"],
    stat: { label: "Mock Balance", value: "$10,000" },
  },
  {
    href: "/apps/fantasy",
    name: "Fantasy Teams",
    description: "Comprehensive fantasy sports management — player research, projections, trade analyzer, and injury reports",
    icon: Trophy,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    gradient: "from-primary/20 to-primary/5",
    badge: "Live",
    badgeColor: "bg-green-500/15 text-green-400",
    features: ["Player projections", "Trade analyzer", "Injury alerts", "Waiver wire"],
    stat: { label: "Data sources", value: "ESPN + mock" },
  },
  {
    href: "/apps/analyst",
    name: "The Analyst",
    description: "Ultimate sports research platform — team stats, player breakdowns, head-to-head comparisons, and league leaders",
    icon: BarChart3,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    gradient: "from-purple-500/20 to-purple-500/5",
    badge: "New",
    badgeColor: "bg-blue-500/15 text-blue-400",
    features: ["Team analysis", "Player stats", "H2H compare", "League leaders"],
    stat: { label: "Leagues", value: "NBA · NFL · EPL" },
  },
  {
    href: "/apps/leagues",
    name: "Leagues",
    description: "Create or join head-to-head fantasy leagues. Round-robin schedule, weekly matchups, live standings.",
    icon: Swords,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    gradient: "from-yellow-500/20 to-yellow-500/5",
    badge: "New",
    badgeColor: "bg-blue-500/15 text-blue-400",
    features: ["Invite friends", "H2H matchups", "Live standings", "Weekly settle"],
    stat: { label: "Formats", value: "H2H · 4–12 teams" },
  },
];

export default function Apps() {
  return (
    <div className="animate-fade-in">
      <div className="relative mb-10 rounded-3xl border border-border/60 apps-hero-gradient px-6 py-8 md:px-10 md:py-10 overflow-hidden">
        <div className="relative z-[1] max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/90 mb-2">Sportsaurzo Pro</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            One hub. <span className="gradient-text">Three engines.</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Live schedules from ESPN, leaderboards, and optional sportsbook lines — built for clarity, speed, and confidence.
          </p>
        </div>
      </div>

      {/* App cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {apps.map((app, i) => {
          const Icon = app.icon;
          return (
            <Link key={app.href} href={app.href}>
              <a className={cn(
                "block glass-card p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group animate-fade-in cursor-pointer",
                `stagger-${i + 1}`
              )}>
                {/* Top row */}
                <div className="flex items-start justify-between mb-5">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", app.bg, "border", app.border)}>
                    <Icon className={cn("w-6 h-6", app.color)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", app.badgeColor)}>
                      {app.badge}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* Name & description */}
                <h3 className="font-bold text-lg text-foreground mb-2">{app.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{app.description}</p>

                {/* Feature list */}
                <div className="grid grid-cols-2 gap-1.5 mb-5">
                  {app.features.map(feature => (
                    <div key={feature} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className={cn("w-1.5 h-1.5 rounded-full", app.bg, "border", app.border)} />
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Stat */}
                <div className={cn("flex items-center justify-between p-3 rounded-xl", app.bg, "border", app.border)}>
                  <span className="text-xs text-muted-foreground">{app.stat.label}</span>
                  <span className={cn("text-sm font-bold", app.color)}>{app.stat.value}</span>
                </div>
              </a>
            </Link>
          );
        })}
      </div>

      {/* Quick stats */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        {[
          { label: "Core leagues", value: "NBA · NFL · EPL", icon: Zap, color: "text-green-400" },
          { label: "Schedules & leaders", value: "ESPN", icon: TrendingUp, color: "text-primary" },
          { label: "Premium Tools", value: "3 Apps", icon: Users, color: "text-purple-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <Icon className={cn("w-5 h-5 mx-auto mb-2", color)} />
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
