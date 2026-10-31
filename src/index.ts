export interface Env {
  ASSETS: Fetcher;
  AI_API_KEY?: string;
  AI_BASE_URL: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" } });

    if (url.pathname === "/api/health") return json({ ok: true, service: "AppForgeAI Worker" });

    if (url.pathname === "/api/generate" && request.method === "POST") {
      if (!env.AI_API_KEY) return json({ error: "AI_API_KEY is not configured. Add it as a Cloudflare Worker secret before generating apps." }, 503);
      try {
        const body = await request.json<{ prompt?: string; model?: string }>();
        if (!body.prompt?.trim()) return json({ error: "A project prompt is required." }, 400);

        const system = "You are AppForgeAI, a professional AI app builder. Return a concise JSON object with projectName, summary, architecture, and files. Each file must have path and content. Generate practical, secure code and never invent deployment results.";
        const upstream = await fetch(env.AI_BASE_URL.replace(/\/$/, "") + "/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: "Bearer " + env.AI_API_KEY },
          body: JSON.stringify({
            model: body.model || "gpt-4o-mini",
            messages: [{ role: "system", content: system }, { role: "user", content: body.prompt }],
            response_format: { type: "json_object" }
          })
        });
        const data = await upstream.json<any>();
        if (!upstream.ok) return json({ error: data?.error?.message || "AI provider request failed." }, upstream.status);
        const text = data?.choices?.[0]?.message?.content;
        return json({ result: text ? JSON.parse(text) : data });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Generation failed." }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};