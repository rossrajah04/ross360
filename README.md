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
   npx wrangler d1 execute <database-name> --remote --file=migrations/0003_quote_travel.sql
   npx wrangler d1 execute <database-name> --remote --file=migrations/0004_customer_links.sql
   ```

   or paste the file into the database's Console in the Cloudflare dashboard. Each file records its
   version in `schema_migrations`, and the Admin refuses to run (and the quote form stores nothing)
   until the database is at the version set in `server/admin/schema.js`. 0001, 0002 and 0004 are safe
   to run twice. **0003 is not**: it adds columns, and a second run stops at once with "duplicate column
   name" (changing nothing). Check `SELECT version, name FROM schema_migrations ORDER BY version;`
   before applying it. A future change goes in a new numbered file, with `LATEST_SCHEMA_VERSION`
   raised to match.
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

**Travel** is either typed in as an amount, or **calculated from miles**:
- Enter the one-way driving distance from Google Maps, to one decimal place.
- The first 10 miles each way are free. The rest of the round trip is charged at 50p a mile, rounded up to the next whole pound: `max(0, one way − 10) × 2` miles. For example, 23.6 miles gives 27.2 miles, £13.60, so £14.
- Over 300 miles one way, enter the amount by hand instead.
- The calculated amount can be overridden, with an internal reason.
- The server recalculates travel from the distance on every save and ignores any amount the browser sends, unless it is an override.
- The rule is `MILEAGE_RULE` in `src/lib/admin/quotes.js`. Each quote records the rate and free distance it was calculated with.

The customer sees only the final amount, as one Travel line. The distance, rate, working and override reason are shown only in the Admin. The timeline records calculator changes, but never the override reason.

**Preview** shows the exact email, rendered by the server. **Send quote** (after a confirmation)
emails it from `ROSS 360 <contact@ross360.co.uk>` (reply-to the same) to the customer, with a BCC
to newquote@ross360.co.uk, using the existing `RESEND_API_KEY`. No new environment variables are
needed. Sending moves a New or Reviewing enquiry to Quoted.

**Send safety.**
- **Preview first.** A quote can only be sent at the version that was last previewed, on the same UK day the preview was rendered for. The atomic claim (draft → sending) re-checks the status, the version and the previewed version, so a stale preview, a second tab or a double click sends nothing.
- **Stored before sending.** The rendered email and its snapshot are stored before Resend is called, and Resend gets an `Idempotency-Key` (`quote-<ref>-v<version>`) for that version.
- **Resend's answer decides what happens next:**
  - **Accepted:** the quote is Sent.
  - **Definite refusal** (400, 401, 403, 404, 405, 422, 429): nothing was sent. The quote goes back to the same draft, and `quote_send_failed` is recorded on the timeline.
  - **Anything else** (no answer, a timeout, a 5xx, a 409 about the idempotency key): the email may or may not have gone. The quote is locked as **Send status unknown** and `quote_send_unknown` is recorded. The stored email is kept, and the quote cannot be edited, discarded, sent or revised.
- **Stuck in "sending".** A quote left in "sending" for over 10 minutes (the request stopped) is treated the same way.

**Checking an unknown send.**
- **Check send status** (up to 23 hours after sending started) repeats the exact stored request under the same `Idempotency-Key`. Resend keeps keys for 24 hours.
  - If the original email reached Resend, Resend returns the original result and sends nothing. The quote is then marked Sent, and the original is superseded and the enquiry moved to Quoted as usual.
  - If the original never reached Resend, that same stored email is delivered once.
  - Any other answer leaves the quote locked, with `quote_send_check` on the timeline.
- **After 23 hours** there is no automatic check, because a repeat could send a second email. Reconcile it by hand:
  1. In Resend (Emails), search for the customer address and the subject `ROSS 360 quotation Q-000N`. Also look for the BCC copy in newquote@ross360.co.uk.
  2. **If it was delivered**, record it in D1. Use the email id from Resend, and move the enquiry to Quoted yourself in the Admin if it was New or Reviewing:

     ```sql
     UPDATE quotes SET status = 'sent', sent_at = '<time from Resend, ISO>', sent_by = 'manual reconciliation',
       resend_message_id = '<email id from Resend>', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE reference = 'Q-000N' AND status IN ('send_unknown', 'sending');
     ```

  3. **If it was not delivered**, return it to draft and raise its version, so a new send uses a new key, then preview and send it again:

     ```sql
     UPDATE quotes SET status = 'draft', version = version + 1, sending_started_at = NULL, issued_on = NULL,
       valid_until = NULL, sent_to = NULL, sent_subject = NULL, sent_html = NULL, sent_text = NULL, sent_snapshot = NULL,
       updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE reference = 'Q-000N' AND status IN ('send_unknown', 'sending');
     ```

  Add a note to the enquiry in the Admin saying what you found. Never do this without checking Resend first.

A sent quote cannot be changed (the database refuses it too). **Revise** copies it into a new draft
with a new reference; when that is sent, the original is marked Superseded. Drafts can be
discarded; they are kept, and their reference is not reused. Every action is on the enquiry's
timeline. Acceptance, payment and booking are not built yet.

**Deploy order:** this code needs schema version 4. Apply each missing migration to a database
before this code runs against it (Preview first; Production before merging). Until then the Admin
answers 503 and the quote form emails enquiries without saving them. Each migration is additive, and
the code already deployed keeps working once it is applied, so apply it first and merge afterwards.

### Erasing an enquiry (manual procedure)

There is no delete button or delete endpoint. When an enquiry must be removed (an erasure request,
spam, or a test record), an authorised administrator deletes it directly in D1, in the Cloudflare
dashboard (Workers & Pages -> D1 -> the database -> Console) or with
`npx wrangler d1 execute <database-name> --remote --command "..."`. Its quote lines, quotes and
timeline entries (and, since Phase C, its date requests and customer links) must be deleted first,
in this order, because each refers to the one after it:

```sql
-- 1. Check it is the right record.
SELECT id, reference, name, business, email FROM enquiries WHERE reference = 'ROSS-0007';

-- 2. Delete its date requests, customer links, quote lines, quotes and timeline entries, then the
--    enquiry itself.
DELETE FROM date_requests WHERE quote_id IN (SELECT id FROM quotes WHERE enquiry_id = (SELECT id FROM enquiries WHERE reference = 'ROSS-0007'));
DELETE FROM quote_links WHERE quote_id IN (SELECT id FROM quotes WHERE enquiry_id = (SELECT id FROM enquiries WHERE reference = 'ROSS-0007'));
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

Not built yet: quote acceptance, booking, payments and Stripe (Phase D).

### Customer quote page and date requests (Phase C)

Every quote email now links to the customer's own page, `https://ross360.co.uk/q/<token>`, with the
line "View your quotation and choose a preferred date online." The page shows the quotation exactly
as sent (it is drawn from the stored snapshot, never from the quote as it now stands), and, while the
quote is valid, **Choose a date**. The customer picks one of your open slots and sends a **date
request**. Nothing is booked: the page says so, `newquote@ross360.co.uk` (or `QUOTE_TO_EMAIL`) gets
an internal email, and you confirm the date with the customer yourself. The customer is never
emailed by this, and the enquiry status does not change.

| Name | Where | Required | Purpose |
| --- | --- | --- | --- |
| `QUOTE_LINK_SECRET` | Secret | Yes | Signs customer links. At least 32 characters, for example `openssl rand -base64 48`. Different for Preview and Production |
| `QUOTE_LINK_KEY_ID` | Variable | Yes | A short name for that secret, letters and digits only, for example `k1` |
| `QUOTE_LINK_SECRET_PREVIOUS` | Secret | No | During a routine rotation only: the secret before the current one |
| `QUOTE_LINK_KEY_ID_PREVIOUS` | Variable | No | Its key id |
| `QUOTE_LINK_BASE_URL` | Variable | No | Leave unset in Production (`https://ross360.co.uk`). In Preview, set it to the preview address so links in test emails open the preview |

Without `QUOTE_LINK_SECRET` and `QUOTE_LINK_KEY_ID`, customer pages say the quotation isn't
available online and **sending a quote is refused**, so no email goes out without its link. The link is
created when a draft is first previewed, so the preview shows exactly the link that is sent.

**When a link works.** While the quote is valid: the page and Choose a date. Up to 90 days after
"valid until": the page, marked expired, without dates. After that, or once disabled, or for any link
that is invalid, unknown or signed with a key no longer configured: the same "no longer available"
page. A superseded quote says it has been replaced (with no link to the revision). A quote that has
not been sent, or whose send is unknown, says it isn't available online.

**Availability** (Admin -> Availability). Add Morning, Afternoon or Full day slots; customers see open
slots from 2 days to 8 weeks ahead. On any date the open slots are either one Full day, or Morning
and/or Afternoon, never both; the server and the database (0004 triggers) both enforce this. A pending
request does not hide a slot. When you close a slot you choose what happens to its pending requests:
**close them** (the default) or **keep them** (they stay pending, marked "Slot closed", for you to settle
with the customer, and can be closed later from the quote). If a request arrives while you are
closing, the close is refused and reloads with it, so you never close a request you haven't seen. A
request and a close are each one transaction, and the database refuses any pending request on a
closed slot, so a request can never be accepted after its slot was closed.

**Disabling and replacing a link** (on a sent quote, Customer link). **Disable link** stops it at once,
including the link in the email already sent. **Create new link** issues a new one (and disables any
current one). Nothing is emailed: copy the link and send it yourself. Quotes sent before Phase C have
no link; **Create customer link** gives them one.

**Rotating `QUOTE_LINK_SECRET` (routine, no compromise).** Existing links keep working:

1. Set `QUOTE_LINK_SECRET_PREVIOUS` and `QUOTE_LINK_KEY_ID_PREVIOUS` to the current values, then set a
   new `QUOTE_LINK_SECRET` and `QUOTE_LINK_KEY_ID` (for example `k2`). Redeploy.
2. New links use `k2`; every `k1` link still works.
3. Admin -> Links shows how many working links each key has, and lists the quotes whose links would
   stop if the previous key were removed. Remove the `_PREVIOUS` pair once that list is empty (at most
   about 104 days: 14 days' validity plus 90), or create new links for those quotes first.

**If a secret is compromised.** Set a new `QUOTE_LINK_SECRET` and `QUOTE_LINK_KEY_ID` and do **not**
keep the old one as previous. Every link signed with it stops at once. Admin -> Links lists the quotes
affected that are still within their viewing window; for each, **Create new link** and send it to the
customer yourself. For one link sent to the wrong person, use **Disable link** and **Create new link**
on that quote; the secret is not involved.

**Recommended: a Cloudflare rate limit on `/q/*`.** Not needed for security (links cannot be guessed:
a 128-bit id plus a signature), but it stops scripted abuse. In the Cloudflare dashboard, Security ->
WAF -> Rate limiting rules, create a rule named `Customer quote links`: URI path starts with `/q/`,
counted by IP address, 20 requests per 10 seconds, action Block for the shortest duration offered.
Rate limiting rules are available on every plan, and on Free this fits the limits (one rule, counted
by IP, a 10-second period and a 10-second block, matching on the path). A second, stricter rule for
date requests only (`POST` to `/q/*`, for example 5 per minute per IP, blocked for 10 minutes) needs
matching by request method, which Cloudflare's feature table lists for Business and above: add it only
if your dashboard offers request method as a match field. Check what your own plan offers.

**Deploy order:** apply `0004_customer_links.sql` to Preview D1 and set the link secrets in Preview;
test the branch preview; then set the Production secrets, apply 0004 to Production D1 (the code
already deployed keeps working with it), and merge. Customer pages run as a Pages Function: `/q/*` is
in `public/_routes.json`.

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
check, enquiry creation, sequential reference generation, the quote form handler, quotes, mileage
travel, customer links (`tests/customer-links.test.js`) and availability and date requests, including
the request-versus-close race (`tests/availability.test.js`). `tests/helpers/d1.js` stands in for a Cloudflare D1
binding using an in-memory SQLite database, so no Cloudflare account is needed to run them.
