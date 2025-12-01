// main.ts — to'g'ri versiya (ildizda)
import { handleUpload } from "./routes/upload.ts";
import { handleSchedule } from "./routes/schedule.ts";
import { handleStats } from "./routes/stats.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/upload-video" && req.method === "POST") return handleUpload(req);
  if (url.pathname === "/run-schedule" && req.method === "POST") return handleSchedule(req);
  if (url.pathname === "/api/stats") return handleStats(req);
  return new Response("Not Found", { status: 404 });
});
