import { redirect } from "next/navigation";
import { Suspense } from "react";
import { safeCallbackUrl } from "@/lib/auth/callback-url";
import { getCaller } from "@/lib/auth/caller";
import { LoginClient } from "./login-client";

// The session and the URL are runtime data, so they're read inside Suspense. The layout stays in the static shell.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { callbackUrl, error } = await searchParams;
  const target = safeCallbackUrl(callbackUrl);

  if (await getCaller()) redirect(target);

  const code = typeof error === "string" ? error : undefined;
  // Keyed by the code: a redirect back here with a new one must not keep the last attempt's error on screen.
  return <LoginClient key={code} callbackUrl={target} error={code} />;
}
