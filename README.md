# ROSS 360 website

React + Vite site for **ross360.co.uk**, deployed on **Cloudflare Pages**, with a Pages Function that sends
quote enquiries through **Resend**.

> **Status:** all source is written, but `npm install` could not be run in the workspace where this was built
> (registry blocked), so a real `vite build` has **not** been run. See "First things to test" below.

## Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # vite build + scripts/prerender.mjs (per-page meta, 404.html, sitemap.xml)
npm run preview   # serve /dist locally
```

To test the quote form function locally, use Wrangler (`npx wrangler pages dev dist`) with a `.dev.vars` file
copied from `.dev.vars.example`.

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
| `QUOTE_FROM_EMAIL` | Variable | Yes | Sender, e.g. `ROSS 360 <enquiries@ross360.co.uk>` (domain must be verified in Resend) |
| `QUOTE_TO_EMAIL` | Variable | No | Defaults to `contact@ross360.co.uk` |
| `SEND_ACKNOWLEDGEMENT` | Variable | No | `true` also emails the customer an acknowledgement |
| `TURNSTILE_SECRET_KEY` | Secret | No | Enables server-side Turnstile check |
| `VITE_TURNSTILE_SITE_KEY` | Build variable | No | Public Turnstile site key (pairs with the secret) |

Without Resend configured, the form shows a friendly error with the direct email address.

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

Honeypot field, minimum-fill-time check, same-origin check, server-side validation, and optional Turnstile.
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
