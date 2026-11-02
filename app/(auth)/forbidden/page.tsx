import Link from "next/link";
import { Button } from "@/components/ui/button";

// Where the page guards send a member without the permission, or a suspended account (lib/auth/authz.ts).
export default function ForbiddenPage() {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">You don&apos;t have access to this page</h1>
        <p className="text-sm text-muted-foreground">
          Ask a workspace owner to invite you, or sign in with another account.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Button asChild>
          <Link href="/">Go to home</Link>
        </Button>
        <Button variant="outline" asChild>
          {/* No prefetch: this is an Auth.js route handler, not a page. */}
          <Link href="/api/auth/signout" prefetch={false}>
            Sign in with another account
          </Link>
        </Button>
      </div>
    </div>
  );
}
