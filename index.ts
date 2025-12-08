// src/index.ts
import { handleUpload } from "./routes/upload";
import { handleSchedule } from "./routes/schedule";
import { handleStats } from "./routes/stats";

export interface Env {
  VIDEO_QUEUE: KVNamespace;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  GROQ_API_KEY: string;
  TECH_BUNI_YT_TOKEN: string;
  // ... barcha tokenlar
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Routelar
    if (url.pathname === "/upload-video" && request.method === "POST") {
      return handleUpload(request, env);
    }

    if (url.pathname === "/run-schedule" && request.method === "POST") {
      return handleSchedule(request, env);
    }

    if (url.pathname === "/api/stats") {
      return handleStats(request, env);
    }

    return new Response("❌ Not Found", { status: 404 });
  },

  // Cron Trigger (har 2 soatda)
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const request = new Request("https://auto-shorts-cf.your-subdomain.workers.dev/run-schedule", {
      method: "POST",
    });
    await fetch(request, { backend: env });
  },
};
