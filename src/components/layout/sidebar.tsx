"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";
import {
  LayoutDashboard,
  CalendarRange,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/eventos",
    label: "Eventos",
    icon: CalendarRange,
  },
  {
    href: "/fornecedores",
    label: "Fornecedores",
    icon: Building2,
  },
];

const adminNavItems = [
  {
    href: "/usuarios",
    label: "Usuários",
    icon: Users,
  },
];

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    toast.success("Até logo!");
    router.push("/login");
    router.refresh();
  }

  const allNavItems = [
    ...navItems,
    ...(profile.role === "admin" ? adminNavItems : []),
  ];

  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#f37022" }}
          >
            <span className="text-white font-black text-base">G</span>
          </div>
          <div>
            <p className="text-sidebar-foreground font-black text-base leading-none">Grão Eventos</p>
            <p className="text-sidebar-foreground/40 text-[10px] font-medium mt-0.5 uppercase tracking-wider">
              Escola Grão Saber
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-sidebar-foreground/30 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">
          Menu
        </p>
        {allNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                isActive
                  ? "text-white"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
              style={isActive ? { background: "#f37022" } : undefined}
            >
              <Icon size={16} className={cn(isActive ? "text-white" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70")} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight size={14} className="text-white/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sidebar-accent">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback
              className="text-white text-xs font-bold"
              style={{ background: "#f37022" }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-sm font-semibold truncate">
              {profile.full_name}
            </p>
            <p className="text-sidebar-foreground/40 text-xs capitalize">
              {profile.role === "admin" ? "Administrador" : "Gestor"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-7 h-7 text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-400/10 flex-shrink-0"
          >
            {loggingOut ? (
              <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogOut size={14} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0 min-h-screen"
        style={{ background: "var(--sidebar)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 border-b"
        style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#f37022" }}
          >
            <span className="text-white font-black text-sm">G</span>
          </div>
          <span className="text-sidebar-foreground font-black text-base">Grão Eventos</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 flex flex-col"
            style={{ background: "var(--sidebar)" }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
