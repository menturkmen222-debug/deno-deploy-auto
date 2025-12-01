// main.ts
import { handleUpload } from "./routes/upload.ts";
import { handleSchedule } from "./routes/schedule.ts";
import { handleStats } from "./routes/stats.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    return new Response("✅ AI Shorts Auto System is running", { status: 200 });
  }

  if (url.pathname === "/upload-video" && req.method === "POST") {
    return await handleUpload(req);
  }

  if (url.pathname === "/run-schedule" && req.method === "POST") {
    return await handleSchedule(req);
  }

  if (url.pathname === "/api/stats") {
    return await handleStats(req); // ✅ TO'G'RI
  }

  return new Response("❌ Not Found", { status: 404 });
});
