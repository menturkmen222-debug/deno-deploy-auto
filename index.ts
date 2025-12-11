// index.ts
import { handleUpload } from "./routes/upload.ts";
import { handleSchedule } from "./routes/schedule.ts";
import { handleStats } from "./routes/stats.ts";

export interface Env {
  VIDEO_QUEUE: KVNamespace;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  GROQ_API_KEY: string;

  TECH_BUNI_YT_TOKEN: string;
  COOKING_BUNI_YT_TOKEN?: string;
  TRAVEL_BUNI_YT_TOKEN?: string;
  GAMING_BUNI_YT_TOKEN?: string;
  LIFE_BUNI_YT_TOKEN?: string;
}

// CORS helper
function corsResponse(body: string | null = null, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(body, { ...init, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return corsResponse();
    }

    try {
      // 1. Video yuklash
      if (url.pathname === "/upload-video" && request.method === "POST") {
        const res = await handleUpload(request, env);
        return corsResponse(res.body, { status: res.status, headers: res.headers });
      }

      // 2. Scheduler (cron yoki GitHub Actions)
      if (url.pathname === "/run-schedule" && request.method === "POST") {
        const res = await handleSchedule(request, env);
        return corsResponse(res.body, { status: res.status });
      }

      // 3. Statistika
      if (url.pathname === "/api/stats") {
        const res = await handleStats(request, env);
        return corsResponse(res.body, { status: res.status, headers: res.headers });
      }

      // 404
      return corsResponse("Not Found", { status: 404 });
    } catch (err: any) {
      console.error("Worker xatosi:", err);
      return corsResponse(
        JSON.stringify({ error: "Internal Server Error", details: err?.message }),
        { status: 500 }
      );
    }
  },

  // Cloudflare Cron Trigger (har 2 soatda avto ishlaydi)
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      fetch("https://autodz.tkmjoker89.workers.dev/run-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  },
};
