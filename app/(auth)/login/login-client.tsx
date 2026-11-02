"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInWithEmail, signInWithGoogle } from "@/lib/actions/auth.actions";

// A Map, not an object: the code can come from the URL, and ?error=constructor must not find a property.
const MESSAGES = new Map([
  ["RateLimited", "Too many sign-in links. Try again in 15 minutes."],
  ["AccessDenied", "This account can't sign in. Contact your workspace owner."],
  ["ACCESS_DENIED", "This account can't sign in. Contact your workspace owner."],
  ["Verification", "That sign-in link has expired or was already used. Request a new one."],
  ["OAuthAccountNotLinked", "This email signs in with an email link. Use the email option above."],
  ["INVALID_INPUT", "Enter a valid email address."],
]);
const messageFor = (code: string) => MESSAGES.get(code) ?? "Sign-in failed. Try again.";

type LoginClientProps = {
  /** Already passed through safeCallbackUrl. The action checks it again: a form field can be anything. */
  callbackUrl: string;
  /** Auth.js's ?error= code. Only ever looked up, never rendered. */
  error?: string;
};

export function LoginClient({ callbackUrl, error }: LoginClientProps) {
  // Controlled: React resets an uncontrolled form after its action, which would wipe the address on a failure.
  const [email, setEmail] = useState("");
  const [emailState, emailAction, emailPending] = useActionState(signInWithEmail, null);
  const [googleState, googleAction, googlePending] = useActionState(signInWithGoogle, null);
  const pending = emailPending || googlePending;

  // Each form shows its own failure. The code the page arrived with sits under the email form, the first option.
  const emailCode = emailState?.success === false ? emailState.error : error;
  const googleCode = googleState?.success === false ? googleState.error : undefined;

  return (
    <FieldGroup>
      <form action={emailAction}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              maxLength={254}
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <Button type="submit" disabled={pending}>
              Send sign-in link
            </Button>
          </Field>
          <FieldError>{emailCode && messageFor(emailCode)}</FieldError>
        </FieldGroup>
      </form>
      <FieldSeparator>Or</FieldSeparator>
      <form action={googleAction}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Field>
          <FieldError>{googleCode && messageFor(googleCode)}</FieldError>
          <Button variant="outline" type="submit" disabled={pending}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Continue with Google
          </Button>
        </Field>
      </form>
    </FieldGroup>
  );
}
