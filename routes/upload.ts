import { uploadToCloudinary } from "../services/cloudinary.ts";
import { enqueueVideo } from "../db/queue.ts";
import { Platform, ChannelId } from "../types.ts";

export async function handleUpload(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const formData = await req.formData();
  const videoFile = formData.get("video") as File;
  const prompt = formData.get("prompt")?.toString() || "";
  const platform = formData.get("platform")?.toString() as Platform;
  const channelId = formData.get("channelId")?.toString() as ChannelId;

  const validPlatforms: Platform[] = ["youtube", "tiktok", "instagram", "facebook"];
  const validChannels: ChannelId[] = ["channel_1", "channel_2", "channel_3", "channel_4", "channel_5"];

  if (
    !videoFile ||
    !prompt ||
    !validPlatforms.includes(platform) ||
    !validChannels.includes(channelId)
  ) {
    return new Response("Missing or invalid fields", { status: 400 });
  }

  try {
    const videoUrl = await uploadToCloudinary(videoFile);
    const id = await enqueueVideo({ videoUrl, prompt, platform, channelId });
    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
