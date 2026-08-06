"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  BookOpen,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Globe,
  Activity,
  TrendingUp,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Concorrentes",
    href: "/dashboard/competitors",
    icon: Users,
    exact: false,
  },
  {
    label: "Fontes",
    href: "/dashboard/sources",
    icon: Globe,
    exact: false,
  },
  {
    label: "Cursos",
    href: "/dashboard/courses",
    icon: BookOpen,
    exact: false,
  },
  {
    label: "Execuções",
    href: "/dashboard/runs",
    icon: Activity,
    exact: false,
  },
  {
    label: "Indicadores",
    href: "/dashboard/indicators",
    icon: TrendingUp,
    exact: false,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function SidebarContent({
  collapsed,
  onToggle,
  onMobileClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center border-b border-slate-700/50 px-3 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white leading-none">
                IEC Gaspar
              </p>
              <p className="truncate text-[10px] text-slate-400 mt-0.5 leading-none">
                Análise de Mercado
              </p>
            </div>
          )}
        </div>
        {/* Desktop toggle */}
        <button
          onClick={onToggle}
          className="ml-auto hidden shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:flex"
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
        {/* Mobile close */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="ml-auto flex shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 crc-scrollbar">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-950/20"
                      : "text-slate-400 hover:bg-slate-700/60 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>

                {/* Flyout tooltip quando colapsado */}
                {collapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 group-hover:block">
                    <div className="rounded-lg border border-slate-700/70 bg-slate-950 px-3 py-1.5 shadow-2xl shadow-slate-950/40">
                      <p className="whitespace-nowrap text-sm font-medium text-white">
                        {item.label}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700/50 p-2">
        <div
          className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 mb-1 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-blue-200">
            AD
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white leading-none">
                Administrador
              </p>
              <p className="truncate text-[10px] text-slate-400 leading-none mt-0.5">
                admin@iec.pucminas.br
              </p>
            </div>
          )}
        </div>
        <div className="relative group">
          <Link
            href="/api/auth/signout"
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-red-950/60 hover:text-red-400 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </Link>
          {collapsed && (
            <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 group-hover:block">
              <div className="rounded-lg border border-slate-700/70 bg-slate-950 px-3 py-1.5 shadow-2xl shadow-slate-950/40">
                <p className="whitespace-nowrap text-sm font-medium text-white">
                  Sair
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fechar mobile ao trocar de rota
  const pathname = usePathname();
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ${
          collapsed ? "w-14" : "w-56"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-slate-700/50 bg-slate-900 px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600">
            <BarChart3 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">IEC Gaspar</span>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-56 transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          collapsed={false}
          onToggle={() => {}}
          onMobileClose={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}
