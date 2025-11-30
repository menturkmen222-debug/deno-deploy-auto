// routes/upload.ts
import { uploadToCloudinary } from "../services/cloudinary.ts";
import { enqueueVideo } from "../db/queue.ts";
import { Platform, ChannelId } from "../types.ts";
import { getScheduledSlotsForDate, US_OPTIMAL_HOURS } from "../utils/time.ts";

export async function handleUpload(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const formData = await req.formData();
  const videoFile = formData.get("video") as File;
  const prompt = formData.get("prompt")?.toString() || "";
  const platform = formData.get("platform")?.toString() as Platform;
  const channelId = formData.get("channelId")?.toString() as ChannelId;
  const scheduledAtStr = formData.get("scheduledAt")?.toString();

  const validPlatforms: Platform[] = ["youtube", "tiktok", "instagram", "facebook"];
  const validChannels: ChannelId[] = ["channel_1", "channel_2", "channel_3", "channel_4", "channel_5"];

  if (
    !videoFile ||
    !prompt ||
    !validPlatforms.includes(platform) ||
    !validChannels.includes(channelId)
  ) {
    return new Response("Missing or invalid fields: video, prompt, platform, channelId", { status: 400 });
  }

  let scheduledAt: Date;

  if (scheduledAtStr) {
    scheduledAt = new Date(scheduledAtStr);
    if (isNaN(scheduledAt.getTime())) {
      return new Response("Invalid scheduledAt date format", { status: 400 });
    }

    const now = new Date();
    const maxFuture = new Date(now);
    maxFuture.setDate(maxFuture.getDate() + 10); // 10 kun oldindan ko'proq emas

    if (scheduledAt > maxFuture) {
      return new Response("scheduledAt must be within the next 10 days", { status: 400 });
    }

    // AQSH optimal soatlariga yaxlitlash (5 ta soatdan biriga)
    const utcHours = scheduledAt.getUTCHours();
    const estHour = (utcHours - 5 + 24) % 24; // UTC → EST
    const closest = US_OPTIMAL_HOURS.reduce((prev, curr) =>
      Math.abs(curr - estHour) < Math.abs(prev - estHour) ? curr : prev
    );
    scheduledAt.setUTCHours(closest + 5, 0, 0, 0); // EST → UTC
  } else {
    // Avtomatik: bugungi birinchi mavjud optimal soat
    const now = new Date();
    const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const slots = getScheduledSlotsForDate(today);
    const futureSlots = slots.filter(slot => slot > now);
    if (futureSlots.length > 0) {
      scheduledAt = futureSlots[0];
    } else {
      // Bugun slot qolmagan — ertaga 6 AM EST
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      scheduledAt = getScheduledSlotsForDate(tomorrow)[0];
    }
  }

  try {
    const videoUrl = await uploadToCloudinary(videoFile);
    const id = await enqueueVideo({
      videoUrl,
      prompt,
      platform,
      channelId,
      scheduledAt,
    });
    return new Response(JSON.stringify({ success: true, id, scheduledAt }), {
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
