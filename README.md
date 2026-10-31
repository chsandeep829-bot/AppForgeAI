# AppForgeAI

**Your AI. Your Apps. Your Infrastructure.**

A Cloudflare Workers-ready AI app builder starter.

## Requirements

- Node.js 18 or newer
- npm
- A Cloudflare account for deployment

## Run locally in Termux (Android)

Install Node.js and Git:

```bash
pkg update && pkg upgrade
pkg install nodejs git
```

Clone the repository and enter it:

```bash
git clone https://github.com/chsandeep829-bot/AppForgeAI.git
cd AppForgeAI
```

Install dependencies:

```bash
npm install
```

Create a local development secrets file named `.dev.vars`:

```bash
nano .dev.vars
```

Add your AI provider key:

```env
AI_API_KEY=your_secret_key_here
```

Do not commit `.dev.vars` or any API key to GitHub.

Start the local Worker:

```bash
npm run dev
```

Termux will display a local URL. Open that URL in your browser.

## Deploy to Cloudflare Workers from Termux

Log in to Cloudflare:

```bash
npx wrangler login
```

Set your production AI key securely:

```bash
npx wrangler secret put AI_API_KEY
```

Paste the key when Wrangler asks. Then deploy:

```bash
npm run deploy
```

Wrangler will display the deployed `workers.dev` URL.

## Configure a different AI provider

The Worker uses an OpenAI-compatible API format. Change `AI_BASE_URL` in `wrangler.jsonc` to your provider's API base URL. Keep the API key in `.dev.vars` locally and as a Cloudflare secret in production.

## Deploy from the Cloudflare dashboard

1. Sign in to Cloudflare.
2. Open **Workers & Pages**.
3. Create a new Worker or import this Git repository.
4. Use this repository: `chsandeep829-bot/AppForgeAI`.
5. Add an environment secret named `AI_API_KEY`.
6. Deploy the Worker.

## Security

Never add API keys to:
- `wrangler.jsonc`
- frontend JavaScript
- HTML files
- GitHub commits

The `/api/generate` endpoint sends AI requests from the server-side Worker so the browser does not receive your secret key.
