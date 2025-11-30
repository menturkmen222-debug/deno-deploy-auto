import { handleUpload } from "./routes/upload.ts";
import { handleSchedule } from "./routes/schedule.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (url.pathname === "/upload-video" && req.method === "POST") {
    return await handleUpload(req);
  }

  if (url.pathname === "/run-schedule" && req.method === "POST") {
    return await handleSchedule(req);
  }

  return new Response("Not Found", { status: 404 });
});
