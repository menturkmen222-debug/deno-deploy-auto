import { getReadyToUploadVideos } from "../db/queue.ts";
import { generateMetadata } from "../services/groq.ts";
import { uploadToYouTube } from "../services/platforms/youtube.ts";
import { uploadToTikTok } from "../services/platforms/tiktok.ts";
import { uploadToInstagram } from "../services/platforms/instagram.ts";
import { uploadToFacebook } from "../services/platforms/facebook.ts";

const PLATFORM_UPLOADERS: Record<string, Function> = {
  youtube: uploadToYouTube,
  tiktok: uploadToTikTok,
  instagram: uploadToInstagram,
  facebook: uploadToFacebook,
};

export async function handleSchedule(): Promise<Response> {
  const videos = await getReadyToUploadVideos(1);
  if (videos.length === 0) {
    return new Response("No pending videos", { status: 200 });
  }

  for (const video of videos) {
    try {
      await updateVideoStatus(video.id, "processing");
      const meta = await generateMetadata(video.prompt);
      await updateVideoStatus(video.id, "processing", meta);

      const uploader = PLATFORM_UPLOADERS[video.platform];
      if (!uploader) {
        throw new Error(`No uploader for platform: ${video.platform}`);
      }

      const success = await uploader({ ...video, ...meta });
      await updateVideoStatus(video.id, success ? "uploaded" : "failed");
    } catch (err) {
      console.error(`Processing failed for ${video.id}:`, err);
      await updateVideoStatus(video.id, "failed");
    }
  }

  return new Response(`Processed ${videos.length} video(s)`, { status: 200 });
}
