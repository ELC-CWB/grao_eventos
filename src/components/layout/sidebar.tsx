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
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type NavChild = {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  children?: NavChild[];
};

const navItems: NavItem[] = [
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
  {
    href: "/usuarios",
    label: "Usuários",
    icon: Users,
    adminOnly: true,
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
  const [expandedItems, setExpandedItems] = useState<string[]>(() =>
    navItems
      .filter((item) =>
        item.children?.some((child) => pathname.startsWith(child.href))
      )
      .map((item) => item.href)
  );

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    toast.success("Até logo!");
    router.push("/login");
    router.refresh();
  }

  function toggleExpanded(href: string) {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  }

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
          <img
            src="/logo-grao-saber.png"
            alt="Logo Grão Saber"
            className="w-12 h-12 rounded-xl flex-shrink-0 object-cover"
          />
          <div>
            <p className="text-white font-black text-xl leading-none whitespace-nowrap">Grão Saber</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.filter((item) => !item.adminOnly || profile.role === "admin").map((item: NavItem) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const visibleChildren = item.children?.filter(
            (child) => !child.adminOnly || profile.role === "admin"
          ) ?? [];
          const hasChildren = visibleChildren.length > 0;
          const isExpanded = expandedItems.includes(item.href);

          return (
            <div key={item.href}>
              <div className="flex items-center gap-1">
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                    isActive
                      ? "text-white"
                      : "text-white hover:text-white hover:bg-white/10"
                  )}
                  style={isActive ? { background: "rgba(0,0,0,0.18)" } : undefined}
                >
                  <Icon size={16} className={cn(isActive ? "text-white" : "text-white")} />
                  <span className="flex-1">{item.label}</span>
                  {!hasChildren && isActive && <ChevronRight size={14} className="text-white" />}
                </Link>
                {hasChildren && (
                  <button
                    onClick={() => toggleExpanded(item.href)}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      isActive
                        ? "text-white hover:text-white hover:bg-white/10"
                        : "text-white hover:text-white hover:bg-white/10"
                    )}
                  >
                    <ChevronDown size={14} className={cn("transition-transform", isExpanded && "rotate-180")} />
                  </button>
                )}
              </div>
              {hasChildren && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                  {visibleChildren.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all group",
                          childActive
                            ? "text-white"
                            : "text-white hover:text-white hover:bg-white/10"
                        )}
                        style={childActive ? { background: "rgba(0,0,0,0.18)" } : undefined}
                      >
                        <ChildIcon size={15} className={cn(childActive ? "text-white" : "text-white")} />
                        <span className="flex-1">{child.label}</span>
                        {childActive && <ChevronRight size={13} className="text-white" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
            <p className="text-white text-sm font-semibold truncate">
              {profile.full_name}
            </p>
            <p className="text-white text-xs capitalize">
              {profile.role === "admin" ? "Administrador" : "Apoiador"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-7 h-7 text-white hover:text-white hover:bg-white/15 flex-shrink-0"
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
      <div className="hidden lg:flex flex-col flex-shrink-0 p-3 h-screen sticky top-0" style={{ perspective: "1200px" }}>
        <aside
          className="flex flex-col w-60 rounded-2xl overflow-hidden flex-1"
          style={{
            background: "var(--sidebar)",
            boxShadow: "2px 2px 0 rgba(0,0,0,0.08), 4px 4px 0 rgba(0,0,0,0.05), 6px 6px 16px rgba(0,0,0,0.12)",
            transform: "perspective(1200px) rotateY(0.6deg)",
            transformOrigin: "left center",
          }}
        >
          <SidebarContent />
        </aside>
      </div>

      {/* Mobile header */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-[200] h-14 flex items-center justify-between px-4 border-b"
        style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-1.5">
          {pathname !== "/dashboard" && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white w-8 h-8 flex-shrink-0"
              onClick={() => router.back()}
            >
              <ArrowLeft size={18} />
            </Button>
          )}
          <img
            src="/logo-grao-saber.png"
            alt="Logo Grão Saber"
            className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
          />
          <span className="text-white font-black text-base">Grão Saber</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white flex-shrink-0"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[200]">
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
