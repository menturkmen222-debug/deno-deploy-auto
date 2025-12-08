// routes/schedule.ts
import { getReadyToUploadVideos, updateVideoStatus } from "../db/queue.ts";
import { generateMetadata } from "../services/groq.ts";
import { uploadToYouTube } from "../services/platforms/youtube.ts";

const PLATFORM_UPLOADERS: Record<string, Function> = {
  youtube: uploadToYouTube,
  // tiktok, instagram, facebook — o'chirildi
};

export async function handleSchedule(): Promise<Response> {
  const videos = await getReadyToUploadVideos(1);
  if (videos.length === 0) {
    return new Response("No videos ready", { status: 200 });


  for (const video of videos) {
    // Faqat YouTube uchun
    if (video.platform !== "youtube") continue;

    try {
      await updateVideoStatus(video.id, "processing");
      const meta = await generateMetadata(video.prompt);
      await updateVideoStatus(video.id, "processing", meta);

      // ✅ Yangi:
const success = await uploadToYouTube(env, { ...video, ...meta });
      await updateVideoStatus(video.id, success ? "uploaded" : "failed");
    } catch (err) {
      console.error(`YouTube yuklamadi:`, err);
      await updateVideoStatus(video.id, "failed");
    }
  }

  return new Response(`Processed YouTube video(s)`, { status: 200 });
}
