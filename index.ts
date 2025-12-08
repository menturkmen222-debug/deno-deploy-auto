// index.ts
import { handleUpload } from "./routes/upload";
import { handleSchedule } from "./routes/schedule";
import { handleStats } from "./routes/stats";

export interface Env {
  VIDEO_QUEUE: KVNamespace;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  GROQ_API_KEY: string;
  TECH_BUNI_YT_TOKEN: string;
  COOKING_BUNI_YT_TOKEN: string;
  TRAVEL_BUNI_YT_TOKEN: string;
  GAMING_BUNI_YT_TOKEN: string;
  LIFE_BUNI_YT_TOKEN: string;
  // Agar boshqa platformalar qo'shsangiz — ularni ham qo'shing
}

// CORS javobini yaratish
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

    // CORS preflight so'rovi
    if (request.method === "OPTIONS") {
      return handleCORS();
    }

    try {
      // Video yuklash (frontend → Cloudflare)
      if (url.pathname === "/upload-video" && request.method === "POST") {
        const response = await handleUpload(request, env);
        // CORS headerini qo'shish
        const headers = new Headers(response.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(response.body, { status: response.status, headers });
      }

      // Scheduler (GitHub Actions → Cloudflare)
      if (url.pathname === "/run-schedule" && request.method === "POST") {
        const response = await handleSchedule(request, env);
        const headers = new Headers(response.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(response.body, { status: response.status, headers });
      }

      // Statistika (frontend → Cloudflare)
      if (url.pathname === "/api/stats") {
        const response = await handleStats(request, env);
        const headers = new Headers(response.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(response.body, { status: response.status, headers });
      }

      // Barcha boshqa so'rovlar — 404
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

  // Cron Trigger (har 2 soatda ishlaydi)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const request = new Request("https://autodz.tkmjoker89.workers.dev/run-schedule", {
      method: "POST",
    });
    // `fetch` ni `ctx.waitUntil` bilan ishlatish — natijani kutish
    ctx.waitUntil(fetch(request, { backend: env }));
  },
};
