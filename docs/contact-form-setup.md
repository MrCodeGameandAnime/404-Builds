# Contact form setup

The contact form is a static page backed by a separate Cloudflare Worker. The Worker verifies Turnstile and sends the message through SMTP2GO; it does not save submissions. Repository changes do not create Cloudflare resources, change DNS, set account variables, or deploy either the Worker or the Pages site.

## 1. Create a Turnstile widget

In Cloudflare, create a Turnstile widget for `404builds.com` and `www.404builds.com`. Keep the generated **site key** (public) and **secret key** (private) separate. The page submits the action `contact`, which the Worker checks during server-side verification.

## 2. Add the public site key to GitHub Actions

In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables** and create a repository variable named `VITE_TURNSTILE_SITE_KEY` with the widget's site key. The Pages workflow passes only this public value to Vite; it will be included in the public site bundle by design.

Do not put the Turnstile secret key or SMTP2GO API key in GitHub Actions, Vite variables, source files, or the Pages artifact.

## 3. Deploy the Worker, then add its secrets

From the repository's `root` directory, deploy the Worker when ready:

```sh
npm run deploy:contact-worker
```

This uses `root/workers/contact-api/wrangler.jsonc` and attaches the Worker to the new custom domain `contact-api.404builds.com`. The existing apex and `www` site records are not changed by this configuration. Cloudflare may provision the DNS record for the Worker custom domain.

The first deploy creates the Worker and its custom domain. The form cannot send yet: the Worker intentionally fails closed until both private secrets are set. Add these values as **Worker secrets** for `404-builds-contact-api` in the Cloudflare dashboard, or set them through Wrangler's secure prompts:

```sh
npx wrangler secret put SMTP2GO_API_KEY --config workers/contact-api/wrangler.jsonc
npx wrangler secret put TURNSTILE_SECRET_KEY --config workers/contact-api/wrangler.jsonc
```

Use the SMTP2GO API key for the account that sends as the verified address `support@404builds.com`, and the private secret key from the Turnstile widget. Never paste either value into this repository or share it in a support message.

Each `wrangler secret put` deploys a Worker version immediately. Until both Worker secrets and the public GitHub Actions variable are configured, the form fails closed and cannot send messages.

## 4. Publish and smoke-test

Push the approved repository changes through the normal CI workflow so GitHub Pages rebuilds with `VITE_TURNSTILE_SITE_KEY`. Then visit `https://404builds.com/contact.html`, complete the verification widget, and send a non-sensitive test message using an address you can check. Confirm that it reaches `support@404builds.com` and that replying uses the visitor's address. The browser request should go to `https://contact-api.404builds.com/submit` and return a generic success response.

If a send fails, the page keeps the draft and resets the verification widget for a deliberate retry. Check the Worker deployment, its two secret names, the Turnstile hostname configuration, and SMTP2GO's sender verification/quota. Do not share screenshots or logs containing a visitor's message or verification token.
