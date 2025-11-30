// routes/upload.ts
import { uploadToCloudinary, uploadUrlToCloudinary } from "../services/cloudinary.ts";
import { enqueueVideo } from "../db/queue.ts";
import { ChannelName, Platform } from "../types.ts";
import { getScheduledSlotsForDate, US_OPTIMAL_HOURS } from "../utils/time.ts";

export async function handleUpload(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const formData = await req.formData();
  const videoFile = formData.get("video") as File;
  const videoUrl = formData.get("videoUrl")?.toString() || "";
  const prompt = formData.get("prompt")?.toString() || "";
  const channelName = formData.get("channelName")?.toString() as ChannelName;
  const scheduledAtStr = formData.get("scheduledAt")?.toString();

  const validChannels: ChannelName[] = [
    "tech_buni", "cooking_buni", "travel_buni", "gaming_buni", "life_buni"
  ];

  if (!prompt || !validChannels.includes(channelName)) {
    return new Response("Prompt va kanal majburiy", { status: 400 });
  }

  if (!videoFile.name && (!videoUrl || !isValidUrl(videoUrl))) {
    return new Response("Video fayl yoki to'g'ri URL kerak", { status: 400 });
  }

  let scheduledAt: Date;

  if (scheduledAtStr) {
    scheduledAt = new Date(scheduledAtStr);
    if (isNaN(scheduledAt.getTime())) {
      return new Response("Invalid scheduledAt format", { status: 400 });
    }

    const now = new Date();
    const maxFuture = new Date(now);
    maxFuture.setDate(maxFuture.getDate() + 10);
    if (scheduledAt > maxFuture) {
      return new Response("Must be within 10 days", { status: 400 });
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
    return new Response(JSON.stringify({ error: err.message }), {
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
