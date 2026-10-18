# Deployment

The step-by-step guide lives in **[docs/LAUNCH_SETUP.md](docs/LAUNCH_SETUP.md)**: Supabase sign-in, Google and GitHub, email (SMTP), the backend + video renderer, the agent service (Roast and Go deeper) and the website on Vercel.

How the pieces fit:

| Piece | What it does | Where it runs |
|---|---|---|
| Website (`apps/Carbon Frontend`) | The pages people see | Vercel |
| Backend (`apps/Carbon Backend`) | Sign-in check, daily limit, video jobs, early-access list, renders videos | A server with about 2 GB of RAM and a disk (Docker; EC2 or Railway) |
| Agent service (`apps/Carbon Agent Service`) | Roast and Go deeper | Render, or the same server |
| Sign-in | Accounts, email confirmation, Google and GitHub | Supabase |

The old version of this page described deploying the backend on a free Render web service. That can't render videos (not enough memory, no persistent disk), so it was removed.
