import type { Metadata } from "next";
import { Suspense } from "react";
import { ModuleTabs } from "@/components/app-shell/ModuleTabs";
import { requireWorkspacePermissionPage } from "@/lib/auth/authz";

type Props = PageProps<"/w/[workspaceId]">;

export const metadata: Metadata = { title: "Home" };

// Params and the session are runtime data, so they're read inside Suspense.
export default function HomePage({ params }: Props) {
  return (
    <Suspense>
      <Home params={params} />
    </Suspense>
  );
}

async function Home({ params }: Pick<Props, "params">) {
  const { workspaceId } = await params;
  await requireWorkspacePermissionPage(workspaceId, "DATA_READ");

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModuleTabs tabs={[{ label: "Overview", href: `/w/${workspaceId}` }]} />
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Your workspace is ready</h1>
        <p className="text-sm text-muted-foreground">Projects and quotes will show here once you have some.</p>
      </div>
    </div>
  );
}
