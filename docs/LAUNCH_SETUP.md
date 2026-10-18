# Going live: sign-in, video rendering, Roast and Go deeper

Everything the site does is in the code. To switch it on at **carbons.codes** you need these accounts. Each step says exactly what to paste where. Budget about an hour (plus DNS wait time for the email step).

| What | Service | Cost |
|---|---|---|
| Sign-in (email + password, Google; GitHub optional) | Supabase | Free |
| Sending sign-up / reset emails | An SMTP provider, e.g. Resend | Free tier |
| "Continue with Google" | Google Cloud OAuth client | Free |
| Backend + video rendering | Railway (recommended) or any Docker host with 2 GB RAM | ~$5–10/month |
| Roast + Go deeper (Python agent service) | Render / Railway | Free–$7/month |
| Website | Vercel (already used) | Free |

No payments are taken at launch: the site shows no prices. People who want more than 2 videos a day join the early-access list. (The Razorpay code in `routes/billing.js` stays in the repo, unused; leave its keys empty.)

---

## 1. Supabase (sign-in)

1. [supabase.com](https://supabase.com) → **New project** (a region near your users, e.g. Mumbai).
2. **Project settings → API**: copy the **Project URL** (`https://<ref>.supabase.co`) and the **anon public** key. The anon key is safe in the browser; never use the `service_role` key anywhere in Carbon.
3. **Authentication → URL Configuration**:
   - **Site URL**: `https://carbons.codes`
   - **Redirect URLs** (add each):
     - `https://carbons.codes/**`
     - `https://www.carbons.codes/**`
     - `http://localhost:5173/**` (local testing)
4. **Authentication → Sign In / Providers → Email**:
   - **Enable Email provider**: on.
   - **Confirm email**: on (recommended; stops people making throwaway accounts for free videos). The site already shows "Confirm your email" after sign-up and a "Resend" button.
   - **Minimum password length**: 8 (the site asks for 8).
5. **Emails need an SMTP provider.** Supabase's built-in email only sends to your own team's addresses and a few per hour, so real visitors would never get their confirmation or reset email. Set up custom SMTP before launch:
   - Sign up at [resend.com](https://resend.com) (or Postmark, SendGrid, Brevo) → **Domains → Add domain** `carbons.codes` → add the DNS records it shows at your domain registrar → wait until it says *Verified*.
   - Create an API key.
   - Supabase → **Authentication → Emails → SMTP Settings** → enable custom SMTP: host `smtp.resend.com`, port `465`, user `resend`, password = the API key, sender `no-reply@carbons.codes`, sender name `Carbon`.
   - Optional: **Authentication → Rate Limits** → raise "emails per hour" (e.g. 100).
   - *If you must launch before DNS verifies:* turn **Confirm email** off so people can sign up without an email. Password reset still needs SMTP, so finish this step soon after.
6. **Google** (step 2 below), then come back to **Providers → Google**: on, paste the Client ID and Client Secret, save.
7. **GitHub** (optional): github.com → Settings → Developer settings → OAuth Apps → New. Homepage `https://carbons.codes`, callback URL `https://<ref>.supabase.co/auth/v1/callback`. Paste the Client ID/Secret into **Providers → GitHub**. The sign-in page only shows the Google/GitHub buttons for providers that are switched on in Supabase, so leaving GitHub off is fine.

## 2. Google Cloud (Continue with Google)

1. [console.cloud.google.com](https://console.cloud.google.com) → create a project, e.g. "Carbon".
2. **APIs & Services → OAuth consent screen** (Google Auth Platform → Branding):
   - User type **External**; app name **Carbon**; support email = yours.
   - **Authorized domains**: `carbons.codes` and `supabase.co`.
   - Scopes: the defaults (`email`, `profile`, `openid`) are enough.
   - **Audience → Publish app** ("In production"). While it's in "Testing", only the test users you list can sign in.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type **Web application**.
   - **Authorized JavaScript origins**: `https://carbons.codes`, `https://www.carbons.codes`, `http://localhost:5173`.
   - **Authorized redirect URIs**: `https://<ref>.supabase.co/auth/v1/callback` (exactly, with your project ref; Supabase shows it on the Google provider page).
4. Copy the **Client ID** and **Client secret** into Supabase → Providers → Google.

## 3. Backend + renderer (Railway)

Rendering needs headless Chrome and about 2 GB RAM, so Render's free tier won't work. Railway is the simplest option:

1. [railway.app](https://railway.app) → **New project → Deploy from GitHub repo** → pick `krishna-chhabra-cse/Carbon`.
2. Service **Settings**:
   - **Builder**: Dockerfile, path `deploy/backend.Dockerfile` (build context = repo root).
   - **Volume**: mounted at `/data` (keeps accounts, videos and the early-access list across deploys).
   - **Resources**: at least 2 GB RAM.
   - **Networking**: generate a domain, or add `api.carbons.codes`.
3. **Variables** (all of them are explained in `.env.example`):

   ```
   NODE_ENV=production
   DATA_DIR=/data
   FRONTEND_URL=https://carbons.codes
   CORS_ORIGIN=https://carbons.codes,https://www.carbons.codes
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_ANON_KEY=<anon public key>
   GEMINI_API_KEY=<new, rotated key with billing or quota>
   GITHUB_TOKEN=<github.com/settings/tokens, no scopes needed>
   PYTHON_SERVICE_URL=https://<your agent service>
   CARBON_API_KEY=<long random string, same as on the agent service>
   ```

   Do **not** set `AUTH_DEV_BYPASS` (it is ignored in production anyway). `GITHUB_TOKEN` matters: without it GitHub allows only 60 API calls per hour for the whole server, which a launch day burns through in minutes.

## 4. Agent service (Roast + Go deeper)

Deploy `apps/Carbon Agent Service` (Render or Railway, Python, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`). Variables:

```
GEMINI_API_KEY=<key>
CARBON_API_KEY=<the same long random string as the backend>
CORS_ORIGINS=https://carbons.codes
```

Leave `CARBON_AUTH_DISABLED` unset (or `false`). The service then refuses any request without the shared key, so only your backend can use it.

## 5. Frontend (Vercel)

Project → **Settings → Environment Variables** (Production):

```
VITE_API_URL=https://<your backend domain, e.g. api.carbons.codes>
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

Redeploy (Vite bakes these in at build time, so a redeploy is needed after any change). `vercel.json` already routes every path to the app.

## 6. Check before you post

- [ ] carbons.codes shows "You shipped it. Now sell it." and the demo plays.
- [ ] **Create account** with a real email → the confirmation email arrives → the link signs you in and lands on /create.
- [ ] Sign out (top right, or the phone menu) → sign back in with the password.
- [ ] **Forgot password?** → the email arrives → the link opens "Choose a new password" → it works.
- [ ] **Continue with Google** signs you in and returns you to /create.
- [ ] Make a video from a repo, e.g. `github.com/fastify/fastify`; it finishes in a few minutes; the MP4 and deck download; the share link opens in a private window.
- [ ] Make a video from a website, e.g. `vite.dev`.
- [ ] A 3rd video in a day is refused with the "You've made today's 2 free videos" card and the early-access form.
- [ ] Roast a repo at /roast without signing in; the share link opens the same roast.
- [ ] "Go deeper into this repo" opens /app and the analysis shows architecture, API explorer and business logic.

## Reading the early-access list

On the backend host (where `DATA_DIR` points at the volume):

```bash
npm run early-access --prefix "apps/Carbon Backend" > early-access.csv
```

## Running everything locally

```bash
npm run dev                                     # frontend :5173, backend :3002, agent :8005
npm test --prefix "apps/Carbon Backend"         # backend tests
npm test --prefix "apps/Carbon Frontend"        # sign-in form helpers
python -m pytest tests                          # agent service tests
npm run studio --prefix "apps/Carbon Video"     # preview/edit the video templates
```

Local sign-in without Supabase: put `AUTH_DEV_BYPASS=true` in `apps/Carbon Backend/.env`, then click **Continue as local dev user** on /login. It only works from your own machine and never with `NODE_ENV=production`; production builds of the site don't show the button. To test real sign-in locally, put your Supabase URL + anon key in `apps/Carbon Frontend/.env.local` (`VITE_SUPABASE_*`) and `apps/Carbon Backend/.env` (`SUPABASE_*`). Making a video always requires signing in; Roast and Go deeper do not.
