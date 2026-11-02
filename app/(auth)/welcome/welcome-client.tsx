"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createWorkspace } from "@/lib/actions/workspace.actions";
import { loginUrl } from "@/lib/auth/callback-url";
import { WELCOME_PATH } from "@/lib/workspace/landing";

const MESSAGES = new Map([
  ["INVALID_INPUT", "Enter a company name of up to 80 characters."],
  ["DISABLED", "This account can't create a workspace. Contact support."],
]);
const messageFor = (code: string) => MESSAGES.get(code) ?? "Couldn't create the workspace. Try again.";

export function WelcomeClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await createWorkspace({ name });
        if (result.success) router.replace(`/w/${result.data.id}`);
        // A second tab or a double submit got there first: `/` knows which workspace it was.
        else if (result.error === "WORKSPACE_EXISTS") router.replace("/");
        else if (result.error === "UNAUTHENTICATED") router.replace(loginUrl(WELCOME_PATH));
        else setError(result.error);
      } catch {
        // The request itself failed, so there's no result: offline, or a deploy replaced this action.
        setError("INTERNAL_ERROR");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-lg font-semibold">Create your workspace</h1>
        <p className="text-sm text-muted-foreground">Your company&apos;s projects and quotes live here.</p>
      </div>
      <form onSubmit={submit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Company name</FieldLabel>
            <Input
              id="name"
              name="organization"
              autoComplete="organization"
              maxLength={80}
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <Button type="submit" disabled={pending}>
              Create workspace
            </Button>
          </Field>
          <FieldError>{error && messageFor(error)}</FieldError>
        </FieldGroup>
      </form>
      <Button variant="outline" asChild>
        {/* No prefetch: this is an Auth.js route handler, not a page. */}
        <Link href="/api/auth/signout" prefetch={false}>
          Sign in with another account
        </Link>
      </Button>
    </div>
  );
}
