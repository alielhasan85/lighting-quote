// components/app-shell/ModuleTabs.tsx
// Tabs that are links, one page per tab. Reference: .docs/references/APP_SHELL_REFERENCE.md
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activeHref } from "@/lib/workspace/modules";

export function ModuleTabs({ tabs }: { tabs: { label: string; href: string }[] }) {
  const pathname = usePathname();
  const active = activeHref(pathname, tabs.map((tab) => tab.href));

  return (
    <Tabs value={active ?? ""}>
      <TabsList>
        {tabs.map(({ label, href }) => (
          // No aria-controls: each tab is its own page, so there's no panel for it to point at.
          <TabsTrigger key={href} value={href} aria-controls={undefined} asChild>
            <Link href={href}>{label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
