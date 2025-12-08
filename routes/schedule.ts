// routes/schedule.ts
import type { Env } from "../index.ts";
import { getReadyToUploadVideos, updateVideoStatus } from "../db/queue.ts";
import { generateMetadata } from "../services/groq.ts";
import { uploadToYouTube } from "../services/platforms/youtube.ts";

export async function handleSchedule(request: Request, env: Env): Promise<Response> {
  // Faqat YouTube uchun 1 ta videoni olish
  const videos = await getReadyToUploadVideos(env, 1);
  
  if (videos.length === 0) {
    return new Response("No videos ready", { status: 200 });
  }

  for (const video of videos) {
    // Faqat YouTube platformasi
    if (video.platform !== "youtube") continue;

    try {
      // Holatni "processing" qilish
      await updateVideoStatus(env, video.id, "processing");

      // AI orqali metadata yaratish
      const meta = await generateMetadata(video.prompt);
      
      // Metadata bilan holatni yangilash
      await updateVideoStatus(env, video.id, "processing", meta);

      // YouTube'ga yuklash (env uzatiladi)
      const success = await uploadToYouTube(env, { ...video, ...meta });
      
      // Yakuniy holat
      await updateVideoStatus(env, video.id, success ? "uploaded" : "failed");
    } catch (err) {
      console.error(`YouTube yuklamadi (${video.id}):`, err);
      await updateVideoStatus(env, video.id, "failed");
    }
  }

  return new Response(`✅ ${videos.length} YouTube video(s) processed`, { status: 200 });
}
