// routes/logs.ts
import type { Env } from "../index.ts";

export async function handleLogs(request: Request, env: Env): Promise<Response> {
  try {
    const keys = await env.LOGS.list({ prefix: "log_", limit: 50 });
    const logs: any[] = [];

    for (const key of keys.keys) {
      const value = await env.LOGS.get(key.name);
      if (value) logs.push(JSON.parse(value));
    }

    return new Response(JSON.stringify(logs.reverse()), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Loglarni o'qishda xato" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
