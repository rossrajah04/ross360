# ROSS 360 website

React + Vite site for **ross360.co.uk**, deployed on **Cloudflare Pages**, with a Pages Function that sends
quote enquiries through **Resend**.

> **Status:** all source is written, but `npm install` could not be run in the workspace where this was built
> (registry blocked), so a real `vite build` has **not** been run. See "First things to test" below.

## Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # public site (vite + scripts/prerender.mjs) then the Admin
npm run build:admin  # the private Admin only -> dist/admin
npm run preview   # serve /dist locally
npm test          # Node test suite in tests/
npm run admin:hash   # generate ADMIN_PASSWORD_HASH for the Admin
npm run admin:smoke  # end-to-end check of a deployed Admin (see README: Admin)
```

To test the quote form function locally, use Wrangler (`npx wrangler pages dev dist`) with a `.dev.vars` file
copied from `.dev.vars.example`. Add `--d1 DB=admin-local` to try the Admin against a local database, then apply
`migrations/` to it.

## Cloudflare Pages settings

| Setting | Value |
| --- | --- |
| Framework preset | Vite (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 or newer (`NODE_VERSION` variable) |
| Production branch | `main` |

Add the custom domain `ross360.co.uk` in Pages → Custom domains (DNS stays in Cloudflare).

## Environment variables

Set in Cloudflare Pages → Settings → Variables and Secrets. **Never commit real values.**

| Name | Where | Required | Purpose |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Secret | Yes | Sends enquiry emails |
| `QUOTE_FROM_EMAIL` | Variable | Yes | Sender of the internal enquiry email, e.g. `ROSS 360 <enquiries@ross360.co.uk>` (domain must be verified in Resend) |
| `QUOTE_TO_EMAIL` | Variable | No | Leave unset: enquiries go to `newquote@ross360.co.uk`. Setting it overrides that address |
| `SEND_ACKNOWLEDGEMENT` | Variable | No | `true` also emails the customer an acknowledgement, sent from `contact@ross360.co.uk` |
| `TURNSTILE_SECRET_KEY` | Secret | No | Enables server-side Turnstile check |
| `VITE_TURNSTILE_SITE_KEY` | Build variable | No | Public Turnstile site key (pairs with the secret) |

Without Resend configured, the form shows a friendly error with the direct email address.

## Admin (private)

The private Admin is at `/admin`. It is a separate app in `admin/`, built by `npm run build:admin`
into `dist/admin`, so the public site's build output is unaffected. Its API is the Pages Function in
`functions/api/admin`, and its records live in Cloudflare D1, with the schema in `migrations/`.

Setting it up in Cloudflare Pages:

1. **Create the database.** Workers & Pages -> D1 -> Create database (for example `ross360-admin`).
2. **Bind it.** Pages project -> Settings -> Bindings -> add a D1 binding named `DB` (Preview and,
   when ready, Production, each with its own database).
3. **Apply the schema.** The schema is versioned in `migrations/` and applied by hand; the website
   never creates or changes tables. For each database, run every file in order:

   ```bash
   npx wrangler d1 execute <database-name> --remote --file=migrations/0001_admin_phase_a.sql
   npx wrangler d1 execute <database-name> --remote --file=migrations/0002_quotes.sql
   ```

   or paste the file into the database's Console in the Cloudflare dashboard. Each file records its
   version in `schema_migrations`, and the Admin refuses to run (and the quote form stores nothing)
   until the database is at the version set in `server/admin/schema.js`. Every statement is safe to
   run twice. A future change goes in a new numbered file, with `LATEST_SCHEMA_VERSION` raised to match.
4. **Set the account.** Settings -> Variables and Secrets:

| Name | Where | Purpose |
| --- | --- | --- |
| `ADMIN_EMAIL` | Variable | The sign-in email address |
| `ADMIN_PASSWORD_HASH` | Secret | Output of `npm run admin:hash`. Never commit it |

Run `npm run admin:hash`, enter a password of at least 12 characters, and paste the printed
`pbkdf2$...` value in as the secret. The password itself is never stored or printed.

To check a deployed Admin end to end, run against a preview with a fresh, migrated database:

```bash
ADMIN_SMOKE_URL=https://<branch>.ross360.pages.dev ADMIN_SMOKE_EMAIL=... ADMIN_SMOKE_PASSWORD=... npm run admin:smoke
```

It signs in, tries a wrong password, reads the dashboard, creates two enquiries through the Admin
(not the public form, so no email is sent), changes a status, saves scheduling fields, adds a note,
searches, creates, saves, previews and discards a quote, signs out, and checks that signed-out API
requests are refused. No quote is emailed unless you also set `ADMIN_SMOKE_SEND_TO` to your own
address, in which case one quote is sent there and a second send is checked to be refused.

Sessions last 12 hours and are held in an HttpOnly, Secure, SameSite=Strict cookie; only a hash of
the token is stored. Eight failed sign-ins from one address lock it out for 15 minutes.
`/admin` is `noindex` and disallowed in `robots.txt`, and every `/api/admin` route except sign-in
refuses requests without a valid session.

**Also recommended:** put Cloudflare Access in front of `/admin` and `/api/admin` (Zero Trust ->
Access -> Applications) so the Admin is protected before any of this code runs.

Without the `DB` binding the website behaves exactly as before: quote enquiries are emailed and
nothing is stored. With it, each enquiry is also saved and given its next reference
(`ROSS-0001`, `ROSS-0002`, …), which appears as the first line of the internal email. If a saved
enquiry's internal email fails, the customer is still told it was received (it has been stored),
and "Internal email notification failed" is added to its timeline. If it could not be saved either,
the customer is asked to try again, as before.

Passwords are compared with any spaces at the start or end removed, the same way `npm run admin:hash`
hashes them. Changing the password does not end existing sessions; to end them at once, run
`DELETE FROM admin_sessions;` on the database.

**Turnstile is required wherever enquiries are stored.** With `DB` bound and no
`TURNSTILE_SECRET_KEY`, the quote form refuses every submission (503, with the usual "please email
us" message) before anything is saved, counted or emailed, and logs a configuration error. So set up
Turnstile (see Spam protection on the form) before binding `DB` in any environment. Without `DB` the
form works as before, with or without Turnstile.

### Quotes (Phase B)

From an enquiry, **Create quote** starts a draft with the next quote reference (`Q-0001`, `Q-0002`, …,
a separate counter from enquiries) and the customer's details copied in. A draft has customer
details, a service description, lines (a package at its published starting price, which can be
changed for that quote, plus any other lines), travel, a fixed-amount discount with a description,
validity (14 days by default) and internal notes. **Internal notes are never shown to the customer**:
they are not in the preview, the email or the stored sent record. Totals are always recalculated on
the server in whole pence. VAT is not charged, and the quote says so.

**Preview** shows the exact email, rendered by the server. **Send quote** (after a confirmation)
emails it from `ROSS 360 <contact@ross360.co.uk>` (reply-to the same) to the customer, with a BCC
to newquote@ross360.co.uk, using the existing `RESEND_API_KEY`. No new environment variables are
needed. Sending moves a New or Reviewing enquiry to Quoted. A quote is sent at most once: the
draft is claimed atomically before Resend is called, the rendered email is stored first, and Resend
gets an `Idempotency-Key` for that quote version. If Resend refuses, the quote stays a draft and the
failure is on the timeline. A quote left "sending" for over 10 minutes shows "Send status unknown:
check Resend before retrying" and is never resent automatically.

A sent quote cannot be changed (the database refuses it too). **Revise** copies it into a new draft
with a new reference; when that is sent, the original is marked Superseded. Drafts can be
discarded; they are kept, and their reference is not reused. Every action is on the enquiry's
timeline. Acceptance, payment and booking are not built yet.

**Deploy order:** this code needs schema version 2. Apply `migrations/0002_quotes.sql` to a
database before this code runs against it (Preview first; Production before merging). Until then
the Admin answers 503 and the quote form emails enquiries without saving them.

### Erasing an enquiry (manual procedure)

There is no delete button or delete endpoint. When an enquiry must be removed (an erasure request,
spam, or a test record), an authorised administrator deletes it directly in D1, in the Cloudflare
dashboard (Workers & Pages -> D1 -> the database -> Console) or with
`npx wrangler d1 execute <database-name> --remote --command "..."`. Its quote lines, quotes and
timeline entries must be deleted first, in this order, because each refers to the one after it:

```sql
-- 1. Check it is the right record.
SELECT id, reference, name, business, email FROM enquiries WHERE reference = 'ROSS-0007';

-- 2. Delete its quote lines, quotes and timeline entries, then the enquiry itself.
DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE enquiry_id = (SELECT id FROM enquiries WHERE reference = 'ROSS-0007'));
DELETE FROM quotes WHERE enquiry_id = (SELECT id FROM enquiries WHERE reference = 'ROSS-0007');
DELETE FROM enquiry_events WHERE enquiry_id = (SELECT id FROM enquiries WHERE reference = 'ROSS-0007');
DELETE FROM enquiries WHERE reference = 'ROSS-0007';
```

Use the reference of the enquiry being erased, and run against the correct database (Preview and
Production are separate). The reference number is not reused: the counter is left as it is. Copies
outside D1, such as the internal notification email and any acknowledgement, must be deleted
separately from the mailbox, including sent quotes (the customer's copy cannot be recalled, and the
BCC copy is in newquote@).

Not built yet: quote acceptance, booking, payments, Stripe and any customer-facing booking page.

## Where to edit content

Everything business-specific lives in `src/content/`, so values are not duplicated through the code:

- `site.js` — contact details, CTA wording, nav, hosting wording, Google wording, cancellation policy numbers, demo-tour settings, legal draft notice switch
- `pricing.js` — package prices and descriptions, pricing wording
- `services.js` — deliverable lists, process steps, sector copy
- `faq.js`, `portfolio.js` (empty until real work exists), `seo.js` (titles, descriptions, structured data)

## Placeholders and provisional items

- **Demo tour:** until a genuine tour exists, the site shows a clearly labelled "Example Tour / Demonstration only"
  panel. To use a Panoee tour, set `exampleTour.embedUrl` in `site.js` (and `isRealProject: true` only for genuine,
  permitted ROSS 360 work). Add real projects to `portfolio.js`.
- **Legal pages** are structured drafts. Anything undecided is in `[square brackets]`. Set `legalDraft: false` in
  `site.js` to hide the draft banner once the wording is approved.
- **Hosting after 12 months** is deliberately not priced anywhere.
- **Content Security Policy** (`public/_headers`) allows Panoee frames from `panoee.com`, `panoee.net` and their
  subdomains (Panoee's hosted tours are served from `tour.panoee.net`). If you use a custom tour domain, add it to `frame-src`.

## Stripe

Payment happens **after a quote is accepted**, so no payment code runs on this website. Send a Stripe Payment
Link or Invoice created in the Stripe Dashboard with each quote. This keeps secrets and card handling off the site
entirely. If a hosted checkout is wanted later, it would be a new Pages Function.

## Spam protection on the form

Honeypot field, minimum-fill-time check, same-origin check, server-side validation, and Cloudflare
Turnstile once it is set up. To set it up, create a Turnstile widget for the site's hostnames
(Cloudflare -> Turnstile), then in the Pages project set, for the same environment and together:
`VITE_TURNSTILE_SITE_KEY` (build variable, public) and `TURNSTILE_SECRET_KEY` (secret), and redeploy.
With the secret set, every submission needs a token Cloudflare confirms before anything is saved or
emailed, so setting the secret without the site key would block every enquiry. Where `DB` is bound,
the secret is required (see Admin). A failed check logs only Cloudflare's error codes.
For extra protection add a Cloudflare WAF rate-limiting rule on `/api/quote`.

## First things to test (once npm works)

1. `npm install && npm run build` succeeds, and `dist/` contains `404.html`, `sitemap.xml` and an `.html` file per route
   (the prerender script fails loudly if the SEO markers are missing).
2. `npm run dev`: open every page with the browser console open; confirm no errors or warnings.
3. Mobile menu opens, closes (link tap, Escape) and is keyboard operable.
4. Quote form: empty submit shows errors and focuses the first one; valid submit shows the success message.
5. `/get-a-quote?type=property` pre-selects the property radio button.
6. Cloudflare preview deployment: check the browser console for **CSP violations** and loosen `_headers` if needed.
7. Visit an unknown URL and confirm the 404 page appears with a 404 status.
8. Real devices: iPhone Safari/Chrome, Android Chrome, desktop Safari/Chrome, tablet.
9. Lighthouse/axe pass for performance and accessibility.

## Tests

`npm test` runs the Node test suite in `tests/`: Admin authentication, the migrations and schema
check, enquiry creation, sequential reference generation and the quote form handler. `tests/helpers/d1.js` stands in for a Cloudflare D1
binding using an in-memory SQLite database, so no Cloudflare account is needed to run them.
