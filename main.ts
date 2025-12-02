// main.ts
Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // CORS preflight so'rovi
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    // Mavjud routelar
    if (url.pathname === "/upload-video" && req.method === "POST") {
      return await handleUpload(req);
    }
    if (url.pathname === "/run-schedule" && req.method === "POST") {
      return await handleSchedule(req);
    }
    if (url.pathname === "/api/stats") {
      return await handleStats(req);
    }

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    console.error("Server xatosi:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
