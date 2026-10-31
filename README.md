# AppForgeAI

**Your AI. Your Apps. Your Infrastructure.**

A Cloudflare Workers-ready AI app builder starter.

## Quick start

```bash
npm install
npm run dev
```

## Configure an AI provider

Keep API keys server-side. Before deployment:

```bash
npx wrangler secret put AI_API_KEY
```

Set `AI_BASE_URL` in `wrangler.jsonc` to an OpenAI-compatible provider endpoint if needed.

## Deploy

```bash
npm run deploy
```

This repository includes a premium dashboard, Worker health endpoint, and a server-side AI generation endpoint. Authentication and persistent project storage can later be added with Cloudflare D1/KV.