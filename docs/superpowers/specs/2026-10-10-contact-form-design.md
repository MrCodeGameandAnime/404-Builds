# 404 Builds Contact Form Design

**Status:** Draft for review  
**Date:** 2026-10-10

## Goal

Let visitors contact 404 Builds from the website and have messages delivered to `support@404builds.com`, without opening a mail application or exposing sending credentials. Keep the website on GitHub Pages, reuse Cloudflare and SMTP2GO, avoid storing submissions in a new database, and stay on the existing free tiers at ordinary low volume.

## Approaches considered

1. **Cloudflare Worker + SMTP2GO (selected):** Keeps the sending credential server-side, reuses the services already configured, and allows a branded in-page form. Requires a one-time Worker and Turnstile setup.
2. **Hosted form service (for example, FormSubmit):** Less backend code, but introduces another vendor and its own account/activation and delivery behavior.
3. **`mailto:` form:** No backend setup, but hands off to the visitor's email application and does not send in the background, which does not meet the desired experience.

## Architecture

The site remains a static Vite build deployed to GitHub Pages. Add a Contact page to that build. Its form sends a JSON `POST` to a separate Cloudflare Worker at `https://contact-api.404builds.com/submit`. The Worker validates the request and Turnstile token, then calls SMTP2GO's standard email API. The Worker is deployed separately from GitHub Pages; its custom domain is a new subdomain and must not require changing the existing apex or `www` site records.

The public Turnstile site key and Worker URL are not secrets. Store `SMTP2GO_API_KEY` and `TURNSTILE_SECRET_KEY` only as Cloudflare Worker secrets. Never put either secret in Vite source, a GitHub Pages artifact, repository history, browser storage, or logs.

## Website experience

- Add `contact.html` and a React Contact page using the existing shared header, footer, typography, colors, and responsive layout.
- Add Contact to the shared header/footer navigation and adjust the mobile navigation grid accordingly.
- Provide labeled Name, Email, and Message fields; all are required. Enforce name up to 120 characters, email up to 254 characters, and message up to 5,000 characters in both browser and Worker validation.
- Include a Cloudflare Turnstile widget and a hidden honeypot field. The page shows an accessible inline pending, success, or error message; it prevents duplicate submits while pending, clears fields only after success, and preserves them after errors.
- No `mailto:` fallback, attachment support, analytics, or client-side persistence is part of this feature.

## Request and email flow

1. The browser submits `{ name, email, message, turnstileToken, honeypot }` to the Worker. It does not submit a recipient, sender, or email subject.
2. The Worker accepts only `POST` and CORS preflight requests from `https://404builds.com` and `https://www.404builds.com`; other origins receive no permissive CORS response. It rejects JSON bodies over 24 KB, malformed JSON, invalid fields, and a filled honeypot.
3. The Worker verifies the Turnstile token server-side with Cloudflare Siteverify, requiring success, hostname `404builds.com` or `www.404builds.com`, and action `contact` before attempting email delivery.
4. The Worker sends a plain-text message through SMTP2GO with subject `Website contact form`, fixed verified sender `support@404builds.com`, fixed recipient `support@404builds.com`, and the visitor's validated address in the `Reply-To` header. The visitor cannot control the sender, recipient, or subject headers.
5. SMTP2GO's HTTP 200 alone is not treated as delivery acceptance: parse its JSON response and reject provider-level `failed`/`failures` results. Do not automatically retry to avoid duplicate emails.

## Failure behavior and data handling

- Return stable, generic JSON errors with appropriate HTTP statuses for invalid input, failed Turnstile verification, provider/quota failures, and unexpected errors. Never return provider response bodies, API keys, or implementation details to the browser.
- The UI explains that sending failed and keeps the visitor's draft so they can retry after refreshing Turnstile.
- Set a 24 KB request-body limit and an 8-second timeout for each upstream HTTP request.
- Do not persist submissions or log their name, email, message, or Turnstile token. Log only non-sensitive outcome/status information needed to diagnose service health.
- CORS is a browser boundary, not authentication; Turnstile server verification and strict server-side validation are mandatory.

## Deployment and cost boundaries

- Keep Worker source and configuration under `root/workers/contact-api/`, outside the Vite public directory.
- Document the one-time Cloudflare setup: create a Turnstile widget for the apex and `www` hostnames; configure the Worker custom domain; add `SMTP2GO_API_KEY` and `TURNSTILE_SECRET_KEY` as Worker secrets; and deploy the Worker separately from the GitHub Pages workflow.
- No live Cloudflare, SMTP2GO, DNS, or GitHub account changes are included in repository implementation. The user supplies secrets directly to Cloudflare and performs or approves deployment.
- The design uses Cloudflare Workers Free and Turnstile Free, subject to their current limits, and the existing SMTP2GO plan. SMTP2GO free-tier quota exhaustion should fail closed; it must not trigger an automatic paid-plan change.
- No Square integration or changes to existing DNS records are included.

## Verification

- Add UI tests for required fields, pending state, inline success and failure, draft preservation on failure, and clearing only after successful send.
- Add Worker tests for allowed preflight/origin behavior, unsupported methods, payload and field validation, honeypot rejection, Turnstile rejection, SMTP2GO request construction, provider-level failures despite HTTP 200, and safe generic errors.
- Mock external HTTP calls in tests; tests must never send real mail or require Cloudflare credentials.
- Run the complete existing Vitest suite and production Vite build. Verify the generated `contact.html` exists and Worker source is absent from the GitHub Pages artifact.

## Official references

- [Cloudflare Workers pricing and included usage](https://developers.cloudflare.com/workers/platform/pricing/)
- [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/)
- [Turnstile server-side token validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [SMTP2GO standard email API](https://developers.smtp2go.com/reference/send-standard-email)
- [SMTP2GO Free Plan limits](https://support.smtp2go.com/hc/en-gb/articles/223087947-Free-Plan)

## Out of scope

Blog/RSS changes, Square/payment features, a message database, attachments, public email-directory changes, and automatic deployment of the Worker are excluded.
