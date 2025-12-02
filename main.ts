// main.ts

// Faqat mavjud bo'lgan handlerlarni import qiling
import { handleUpload } from "./routes/upload.ts";
import { handleSchedule } from "./routes/schedule.ts";

// CORS sozlamalari (Vercel frontend ishlashi uchun)
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

  // CORS preflight so'rovi (frontend uchun)
  if (req.method === "OPTIONS") {
    return handleCORS();
  }

  try {
    // Video yuklash — frontenddan keladi
    if (url.pathname === "/upload-video" && req.method === "POST") {
      const response = await handleUpload(req);
      // CORS headerini qo'shish
      response.headers.set("Access-Control-Allow-Origin", "*");
      return response;
    }

    // Scheduler — GitHub Actions tomonidan chaqiriladi
    if (url.pathname === "/run-schedule" && req.method === "POST") {
      const response = await handleSchedule(req);
      response.headers.set("Access-Control-Allow-Origin", "*");
      return response;
    }

    // Barcha boshqa so'rovlar — 404
    return new Response("❌ Not Found", { status: 404 });

  } catch (err) {
    console.error("Server xatosi:", err);

    // Xato javobini ham CORS bilan qaytarish
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
