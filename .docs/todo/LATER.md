# Later

Everything deferred, one line each, with a link to its detail if one exists. A session that finds something which
doesn't block a gate adds one line here; it never starts a new TODO file without the founder.

- Part 2 in full: price-list upload with AI column mapping, discount rules, landed-cost formulas, price-list versions (brief §6, §10.10)
- Team invites: email invite, accept flow, the `MANAGER` and `SALES` roles in use (was in F-2). Until then, G2's roles walk uses `Membership` rows added by SQL, and `/forbidden`'s "ask a workspace owner to invite you" promises something that doesn't exist yet
- Wording from before the roadmap: the brief says "supplier" where it means any company (§4 Part 2, §6, §7, §8, §13), and so does the `Workspace` comment in `prisma/schema.prisma`
- Private company products, through the same pipeline as P-1 (brief §4, Part 2)
- Open sign-up: once P-3 exists, anyone who signs in can create a workspace and spend AI credits. Decide invite-only or a per-workspace AI limit before P-3 reaches production
- Brief features on no list yet: Excel quote output, usage learning and favorites (Part 4), Ctrl+K search, Home pipeline, the clickable design test (§4.1), IES/LDT files (Part 1)
- Part 7: follow-up and CRM, quote status pipeline, reminders, drafted follow-up emails (brief §4)
- Email inbox intake (brief §9 Out)
- Sales orders, purchase orders, inventory, deliveries (brief §2): keep the design ready, don't build
- ERP sync: Odoo, Zoho, HubSpot (brief §2)
- Arabic UI (brief §9 Out)
- Billing and subscriptions (brief §8)
- Dedicated deployments (brief §7)
- Audit log, 2FA, time-limited support access, full data export and deletion (brief §7)
- `npm audit`: 19 vulnerabilities (16 moderate, 3 high) after setup. Review before launch, without `--force`
- Root `README.md` is still the create-next-app boilerplate
- Lint keeps the database out of UI files only by the specifier `@/lib/db` / `@prisma/client` in `.ts`/`.tsx`: a relative path or a `.js` file gets past it
- `createPublicFormAction` keeps only the last value of a repeated form field (`Object.fromEntries`): fix before the first public form with a multi-select
- `getWorkspaceRole` isn't wrapped in React `cache`: a layout and a page that both guard read `Membership` twice per request (F-2 adds the first layout)
- Google sign-in with an email that already signs in by magic link gets `OAuthAccountNotLinked`: decide on `allowDangerousEmailAccountLinking` for Google, since Google verifies emails
- A refused page returns to `/w/<id>`, not the exact page: deep links need a proxy that stamps the request path
- The `RateLimited` and `Verification` redirects to `/login` drop `callbackUrl`, so the next attempt lands on `/`
- "Try again in 15 minutes" is wrong when the IP limit refused the request: that window is an hour
- A suspended address can be told apart on the email form: it fails where others reach `/login/check-email`
- Sign-out uses Auth.js's built-in, unstyled page
- A full CSP (`script-src` with nonces), beyond `frame-ancestors`
- HSTS is sent with `includeSubDomains; preload` for two years: review before a custom domain goes live, because an HTTP-only subdomain would stop loading
- The `security-review` skill needs `origin/HEAD` (`git remote set-head origin --auto`) and sees only commits ahead of it, so it finds nothing once code is on `main`
