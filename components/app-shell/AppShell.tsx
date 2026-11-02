// components/app-shell/AppShell.tsx
// The sidebar and the page area around every workspace page. Reference: .docs/references/APP_SHELL_REFERENCE.md
import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { ModuleNavItem } from "@/lib/workspace/modules";
import { AppSidebar } from "./AppSidebar";

type AppShellProps = {
  title: string;
  nav: ModuleNavItem[];
  profile: { name: string | null; email: string | null };
  /** From the sidebar_state cookie, so a collapsed sidebar doesn't flash open on refresh. */
  defaultOpen: boolean;
  children: ReactNode;
};

export function AppShell({ title, nav, profile, defaultOpen, children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar title={title} nav={nav} profile={profile} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
