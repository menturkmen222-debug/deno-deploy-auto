// main.ts — TO'G'RI VERSIYA
import { handleUpload } from "./routes/upload.ts";
import { handleSchedule } from "./routes/schedule.ts"; // ✅
import { handleStats } from "./routes/stats.ts";       // ✅

// CORS sozlamalari
function handleCORS(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return handleCORS();
  }

  try {
    if (url.pathname === "/upload-video" && req.method === "POST") {
      const res = await handleUpload(req);
      res.headers.set("Access-Control-Allow-Origin", "*");
      return res;
    }

    // ✅ TO'G'RI: /run-schedule → handleSchedule
    if (url.pathname === "/run-schedule" && req.method === "POST") {
      const res = await handleSchedule(req);
      res.headers.set("Access-Control-Allow-Origin", "*");
      return res;
    }

    // ✅ TO'G'RI: /api/stats → handleStats
    if (url.pathname === "/api/stats") {
      const res = await handleStats(req);
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
});
