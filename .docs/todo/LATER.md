# Later

Everything deferred, one line each, with a link to its detail if one exists. A session that finds something which
doesn't block a gate adds one line here; it never starts a new TODO file without the founder.

- Part 2 in full: price-list upload with AI column mapping, landed-cost formulas, price-list versions (brief §6, §10.7)
- Part 7: follow-up and CRM, quote status pipeline, reminders, drafted follow-up emails (brief §4)
- Image intake (screenshots, photos) and search by image (brief §4, Parts 3 and 4)
- Email inbox intake, and scanned PDFs (brief §9 Out)
- Sales orders, RFQ / purchase orders, inventory, deliveries (brief §2): keep the design ready, don't build
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
- The root layout's metadata still says "Create Next App", and `/` is still the starter page
- Sign-out uses Auth.js's built-in, unstyled page
- A full CSP (`script-src` with nonces), beyond `frame-ancestors`
- HSTS is sent with `includeSubDomains; preload` for two years: review before a custom domain goes live, because an HTTP-only subdomain would stop loading
- The `security-review` skill needs `origin/HEAD` (`git remote set-head origin --auto`) and sees only commits ahead of it, so it finds nothing once code is on `main`
