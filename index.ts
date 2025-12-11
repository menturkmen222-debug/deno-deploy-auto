// index.ts
import { handleUpload } from "./routes/upload.ts";
import { handleSchedule } from "./routes/schedule.ts";
import { handleStats } from "./routes/stats.ts";

export interface Env {
  VIDEO_QUEUE: KVNamespace;
  LOGS: KVNamespace;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  GROQ_API_KEY: string;
  // YouTube
  TECH_BUNI_YT_TOKEN: string;
  COOKING_BUNI_YT_TOKEN: string;
  TRAVEL_BUNI_YT_TOKEN: string;
  GAMING_BUNI_YT_TOKEN: string;
  LIFE_BUNI_YT_TOKEN: string;
  // TikTok
  TECH_BUNI_TT_TOKEN: string;
  COOKING_BUNI_TT_TOKEN: string;
  TRAVEL_BUNI_TT_TOKEN: string;
  GAMING_BUNI_TT_TOKEN: string;
  LIFE_BUNI_TT_TOKEN: string;
  // Instagram
  TECH_BUNI_IG_TOKEN: string;
  COOKING_BUNI_IG_TOKEN: string;
  TRAVEL_BUNI_IG_TOKEN: string;
  GAMING_BUNI_IG_TOKEN: string;
  LIFE_BUNI_IG_TOKEN: string;
  // Facebook
  TECH_BUNI_FB_TOKEN: string;
  COOKING_BUNI_FB_TOKEN: string;
  TRAVEL_BUNI_FB_TOKEN: string;
  GAMING_BUNI_FB_TOKEN: string;
  LIFE_BUNI_FB_TOKEN: string;
}

// CORS handler
function handleCORS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return handleCORS();
    }

    try {
      if (url.pathname === "/upload-video" && request.method === "POST") {
        const res = await handleUpload(request, env);
        res.headers.set("Access-Control-Allow-Origin", "*");
        return res;
      }

      if (url.pathname === "/run-schedule" && request.method === "POST") {
        const res = await handleSchedule(request, env);
        res.headers.set("Access-Control-Allow-Origin", "*");
        return res;
      }

      if (url.pathname === "/api/stats") {
        const res = await handleStats(request, env);
        res.headers.set("Access-Control-Allow-Origin", "*");
        return res;
      }

      if (url.pathname === "/api/logs") {
        const res = await handleLogs(request, env);
        res.headers.set("Access-Control-Allow-Origin", "*");
        return res;
      }

      return new Response("❌ Not Found", { status: 404 });
    } catch (err) {
      console.error("Server xatosi:", err);
      return new Response(
        JSON.stringify({ error: "Internal Server Error" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },

  // Cron Trigger (har 2 soatda)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const request = new Request("https://autotm.deno.dev/run-schedule", { method: "POST" });
    await fetch(request);
  },
};
