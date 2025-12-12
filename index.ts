import { handleUpload } from "./routes/upload.ts";
import { handleScheduleAll } from "./routes/schedule.ts";
import { handleStats } from "./routes/stats.ts";

// TO‘G‘RI IMPORT
import { clearLogs, getLogs, addLog } from "./db/logs.ts";

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

// CORS
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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS OPTIONS
    if (request.method === "OPTIONS") return handleCORS();

    try {
      // --- Upload video ---
      if (url.pathname === "/upload-video" && request.method === "POST") {
        await addLog(env, "📤 /upload-video chaqirildi");

        const res = await handleUpload(request, env);
        res.headers.set("Access-Control-Allow-Origin", "*");

        return res;
      }

      // --- Run schedule ---
      if (url.pathname === "/run-schedule" && request.method === "POST") {
        await addLog(env, "⏳ /run-schedule ishga tushdi");

        const res = await handleScheduleAll(request, env);
        res.headers.set("Access-Control-Allow-Origin", "*");

        return res;
      }

      // --- Stats ---
      if (url.pathname === "/api/stats") {
        await addLog(env, "📊 Stats chiqarildi");

        const res = await handleStats(request, env);
        res.headers.set("Access-Control-Allow-Origin", "*");

        return res;
      }

      // --- Clear logs ---
if (
  (url.pathname === "/api/clear-logs" && request.method === "POST") ||
  (url.pathname === "/api/clear-logs" && request.method === "GET")
) {
  await clearLogs(env);
  await addLog(env, "🧹 Loglar tozalandi");

  return new Response("✅ Logs cleared", {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

      // --- Get logs ---
      if (url.pathname === "/api/logs" && request.method === "GET") {
        const logs = await getLogs(env);

        return new Response(JSON.stringify(logs), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      return new Response("❌ Not Found", { status: 404 });

    } catch (err) {
      console.error("Server xatosi:", err);
      await addLog(env, `❌ Server xatosi: ${err}`);

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

  // Cron trigger
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    await addLog(env, "⏰ Cron ishga tushdi");

    // Worker domeningizni qo‘ying
    const request = new Request("https://autodz.tkmjoker89.workers.dev/run-schedule", {
      method: "POST",
    });

    await fetch(request);
  },
};
