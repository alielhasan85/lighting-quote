import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { requireWorkspacePermissionPage } from "@/lib/auth/authz";
import { getCallerProfile } from "@/lib/auth/caller";
import { getWorkspaceName } from "@/lib/queries/workspace.queries";
import { moduleNav } from "@/lib/workspace/modules";

type Props = LayoutProps<"/w/[workspaceId]">;

// Params, the session and the cookie are runtime data, so they're read inside Suspense.
export default function WorkspaceLayout({ params, children }: Props) {
  return (
    <Suspense>
      <Shell params={params}>{children}</Shell>
    </Suspense>
  );
}

// Guards even though each page does: this reads the workspace's name, and a page's guard can't protect a layout.
async function Shell({ params, children }: Pick<Props, "params" | "children">) {
  const { workspaceId } = await params;
  await requireWorkspacePermissionPage(workspaceId, "DATA_READ");

  const [title, profile, cookieStore] = await Promise.all([
    getWorkspaceName(workspaceId),
    getCallerProfile(),
    cookies(),
  ]);
  if (title === null) notFound();

  return (
    <AppShell
      title={title}
      nav={moduleNav(workspaceId)}
      profile={profile}
      // The cookie components/ui/sidebar.tsx writes.
      defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}
    >
      {children}
    </AppShell>
  );
}
