// routes/upload-stream.ts
import { uploadToCloudinary } from "../services/cloudinary.ts";
import { enqueueVideo } from "../db/queue.ts";
import { ChannelName } from "../types.ts";

export async function handleUploadStream(req: Request): Promise<Response> {
  // Hozircha oddiy upload sifatida ishlatamiz
  const url = new URL(req.url);
  const channelName = url.searchParams.get("channelName") as ChannelName;
  const prompt = url.searchParams.get("prompt") || "";

  if (!channelName || !prompt) {
    return new Response("Missing params", { status: 400 });
  }

  try {
    // Faylni o'qish
    const blob = await req.blob();
    const videoUrl = await uploadToCloudinary(new File([blob], "video.mp4"));

    const platforms: ("youtube" | "tiktok" | "instagram" | "facebook")[] = 
      ["youtube", "tiktok", "instagram", "facebook"];

    for (const platform of platforms) {
      await enqueueVideo({
        videoUrl,
        prompt,
        channelName,
        platform,
        scheduledAt: new Date(Date.now() + 10000),
      });
    }

    return new Response(JSON.stringify({ success: true, videoUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Stream upload error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
