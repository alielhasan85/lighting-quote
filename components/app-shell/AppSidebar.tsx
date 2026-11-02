// components/app-shell/AppSidebar.tsx
// Reference: .docs/references/APP_SHELL_REFERENCE.md
"use client";

import { FileText, FolderKanban, Home, LogOut, Package, Settings, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { isActivePath, type ModuleKey, type ModuleNavItem } from "@/lib/workspace/modules";

const ICONS: Record<ModuleKey, LucideIcon> = {
  home: Home,
  projects: FolderKanban,
  quotes: FileText,
  products: Package,
  clients: Users,
  settings: Settings,
};

type AppSidebarProps = {
  title: string;
  nav: ModuleNavItem[];
  profile: { name: string | null; email: string | null };
};

export function AppSidebar({ title, nav, profile }: AppSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <span className="truncate px-2 py-1.5 text-sm font-semibold group-data-[collapsible=icon]:hidden">{title}</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map(({ key, label, href }) => {
                const Icon = ICONS[key];
                const active = href !== null && isActivePath(pathname, href);
                return (
                  <SidebarMenuItem key={key}>
                    {href === null ? (
                      // A button, not a link: disabled, so it can't be clicked or reached with Tab.
                      <SidebarMenuButton disabled>
                        <Icon aria-hidden="true" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton asChild isActive={active} tooltip={label}>
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          // The shell stays mounted across pages, so on a phone the sheet would stay open over the next one.
                          onClick={() => setOpenMobile(false)}
                        >
                          <Icon aria-hidden="true" />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex min-w-0 flex-col px-2 group-data-[collapsible=icon]:hidden">
          {profile.name && <span className="truncate text-sm font-medium">{profile.name}</span>}
          {profile.email && <span className="truncate text-xs text-sidebar-foreground/70">{profile.email}</span>}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Sign out">
              {/* No prefetch: this is an Auth.js route handler, not a page. */}
              <Link href="/api/auth/signout" prefetch={false}>
                <LogOut aria-hidden="true" />
                <span>Sign out</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
