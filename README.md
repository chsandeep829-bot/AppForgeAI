# AppForgeAI

**Your AI. Your Apps. Your Infrastructure.**

AppForgeAI is a Cloudflare Workers application for authenticated AI-assisted project creation and management.

## Core workflow

1. Sign in with Firebase Authentication or the configured email account flow.
2. Add an AI provider key in **API Settings**.
3. Create a project from a natural-language prompt.
4. Generate project files using the selected configured provider.
5. Open the project to chat, edit files, save changes, preview generated content, and export the saved project.
6. Use the Publish panel to record deployment requirements and custom-domain requests.

## Required Cloudflare configuration

Configure the D1 binding named `USERS_DB` and Worker secrets:

- `APPFORGEAI_ENCRYPTION_KEY` — encrypts user-saved provider keys.
- `APPFORGEAI_SESSION_SECRET` — signs application sessions.
- `FIREBASE_API_KEY` — verifies Firebase ID tokens server-side.

Optional Turnstile configuration:

- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_SITE_KEY`

Use Wrangler secrets for sensitive values. Never put secrets in frontend files or commit them to GitHub.

## Database

The Worker creates and maintains the application tables when D1 is available, including users, projects, project files, project messages, provider configuration, encrypted provider keys, deployments, and APK releases.

## AI providers

The UI supports:

- Groq
- Google Gemini
- OpenAI-compatible endpoints
- Custom OpenAI-compatible endpoints
- OmniRoute-compatible endpoints

For OpenAI-compatible and custom providers, configure both the API base URL and default model.

## Publishing

A project can always be exported from its actual saved files. A real one-click deployment requires an authorized deployment integration; AppForgeAI intentionally does not invent a public URL or claim that a deployment succeeded before a provider actually returns one.

To finish one-click publishing, connect a deployment provider credential or OAuth integration and implement the provider-specific upload/build API. Keep those credentials server-side.

## Local development

```bash
npm install
npm run dev
```

For production:

```bash
npm run deploy
```

