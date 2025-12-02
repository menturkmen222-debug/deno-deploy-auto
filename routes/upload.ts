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
    console.error("Form data parse error:", err);
    return new Response("Invalid form data", { status: 400 });
  }

  const videoFile = formData.get("video");
  const videoUrl = formData.get("videoUrl")?.toString()?.trim() || "";
  const prompt = formData.get("prompt")?.toString() || "";
  const channelName = formData.get("channelName")?.toString() as ChannelName;

  const validChannels: ChannelName[] = [
    "tech_buni", "cooking_buni", "travel_buni", "gaming_buni", "life_buni"
  ];

  if (!prompt || !validChannels.includes(channelName)) {
    return new Response("Prompt va kanal nomi majburiy", { status: 400 });
  }

  // Fayl yoki URL — xavfsiz tekshirish
  const hasVideoFile = videoFile instanceof File && videoFile.name;
  const hasValidUrl = !!videoUrl && isValidUrl(videoUrl);

  if (!hasVideoFile && !hasValidUrl) {
    return new Response("Video fayl yoki to'g'ri URL kerak", { status: 400 });
  }

  // Fayl hajmi cheklovi: Deno Deploy 10 MB
  if (hasVideoFile) {
    const file = videoFile as File;
    if (file.size > 10 * 1024 * 1024) {
      return new Response("Fayl hajmi 10 MB dan oshmasligi kerak", { status: 400 });
    }
  }

  // AQSH soatiga mos scheduledAt
  let scheduledAt: Date;
  const scheduledAtStr = formData.get("scheduledAt")?.toString();

  if (scheduledAtStr) {
    scheduledAt = new Date(scheduledAtStr);
    if (isNaN(scheduledAt.getTime())) {
      return new Response("Invalid scheduledAt format", { status: 400 });
    }

    const now = new Date();
    const maxFuture = new Date(now);
    maxFuture.setDate(maxFuture.getDate() + 10);
    if (scheduledAt > maxFuture) {
      return new Response("scheduledAt must be within 10 days", { status: 400 });
    }

    const utcHours = scheduledAt.getUTCHours();
    const estHour = (utcHours - 5 + 24) % 24;
    const closest = US_OPTIMAL_HOURS.reduce((prev, curr) =>
      Math.abs(curr - estHour) < Math.abs(prev - estHour) ? curr : prev
    );
    scheduledAt.setUTCHours(closest + 5, 0, 0, 0);
  } else {
    const now = new Date();
    const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const slots = getScheduledSlotsForDate(today);
    const futureSlots = slots.filter(slot => slot > now);
    if (futureSlots.length > 0) {
      scheduledAt = futureSlots[0];
    } else {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      scheduledAt = getScheduledSlotsForDate(tomorrow)[0];
    }
  }

  try {
    let cloudinaryUrl: string;

    if (hasVideoFile) {
      const file = videoFile as File;
      cloudinaryUrl = await uploadToCloudinary(file);
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
    console.error("Upload processing error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal upload error" }), {
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
