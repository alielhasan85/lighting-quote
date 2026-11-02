import Link from "next/link";
import { Button } from "@/components/ui/button";

// Auth.js sends the user here after a magic link goes out (pages.verifyRequest in auth.ts).
export default function CheckEmailPage() {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">We sent a sign-in link. It expires in 15 minutes.</p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
