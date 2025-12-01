// routes/upload.ts
import { uploadToCloudinary, uploadUrlToCloudinary } from "../services/cloudinary.ts";
import { enqueueVideo } from "../db/queue.ts";
import { ChannelName, Platform } from "../types.ts";
import { getScheduledSlotsForDate, US_OPTIMAL_HOURS } from "../utils/time.ts";

export async function handleUpload(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("Form data error:", err);
    return new Response("Invalid form data", { status: 400 });
  }

  const videoFile = formData.get("video") as File;
  const videoUrl = formData.get("videoUrl")?.toString() || "";
  const prompt = formData.get("prompt")?.toString() || "";
  const channelName = formData.get("channelName")?.toString() as ChannelName;

  const validChannels: ChannelName[] = [
    "tech_buni", "cooking_buni", "travel_buni", "gaming_buni", "life_buni"
  ];

  if (!prompt || !validChannels.includes(channelName)) {
    return new Response("Prompt va kanal majburiy", { status: 400 });
  }

  if (!videoFile.name && (!videoUrl || !isValidUrl(videoUrl))) {
    return new Response("Video fayl yoki to'g'ri URL kerak", { status: 400 });
  }

  // Fayl hajmini tekshirish (Deno Deploy 10 MB cheklovi)
  if (videoFile.name && videoFile.size > 10 * 1024 * 1024) {
    return new Response("Fayl hajmi 10 MB dan oshmasligi kerak", { status: 400 });
  }

  let scheduledAt: Date;
  const scheduledAtStr = formData.get("scheduledAt")?.toString();

  // ... (scheduledAt hisoblash — o'zgarmaydi)

  try {
    let cloudinaryUrl: string;

    if (videoFile.name) {
      cloudinaryUrl = await uploadToCloudinary(videoFile);
    } else {
      cloudinaryUrl = await uploadUrlToCloudinary(videoUrl);
    }

    const platforms: Platform[] = ["youtube", "tiktok", "instagram", "facebook"];
    const ids: string[] = [];

    for (const platform of platforms) {
      const id = await enqueueVideo({
        videoUrl: cloudinaryUrl,
        prompt,
        channelName,
        platform,
        scheduledAt,
      });
      ids.push(id);
    }

    return new Response(JSON.stringify({ success: true, ids, scheduledAt }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
