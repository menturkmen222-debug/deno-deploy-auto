// services/platforms/youtube.ts
import { VideoRequest } from "../../types.ts";

const YOUTUBE_TOKENS: Record<string, string> = {
  tech_buni: Deno.env.get("TECH_BUNI_YT_TOKEN")!,
  cooking_buni: Deno.env.get("COOKING_BUNI_YT_TOKEN")!,
  travel_buni: Deno.env.get("TRAVEL_BUNI_YT_TOKEN")!,
  gaming_buni: Deno.env.get("GAMING_BUNI_YT_TOKEN")!,
  life_buni: Deno.env.get("LIFE_BUNI_YT_TOKEN")!,
};

export async function uploadToYouTube(video: VideoRequest): Promise<boolean> {
  const token = YOUTUBE_TOKENS[video.channelName];
  if (!token) throw new Error(`YouTube token not found for ${video.channelName}`);

  // 1. Video metadata
  const metadata = {
    snippet: {
      title: video.title || "Auto-Generated Short",
      description: video.description || video.prompt,
      tags: video.tags || ["AI", "Shorts"],
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus: "private", // Yuklangandan so'ng "public" qilishingiz mumkin
      selfDeclaredMadeForKids: false,
    },
    recordingDetails: {
      recordingDate: new Date().toISOString(),
    },
  };

  // 2. Video faylini yuklash (multipart upload)
  const videoRes = await fetch(video.videoUrl);
  const videoArray = new Uint8Array(await videoRes.arrayBuffer());

  // 3. YouTube API: Upload
  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status,recordingDetails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/related; boundary=boundary",
      },
      body: buildMultipartPayload(metadata, videoArray),
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error("YouTube upload failed:", err);
    throw new Error(`YouTube upload error: ${uploadRes.status}`);
  }

  console.log(`[YouTube] ✅ ${video.channelName} — ${video.title}`);
  return true;
}

function buildMultipartPayload(metadata: any, videoBytes: Uint8Array): string {
  const boundary = "boundary";
  let payload = "";

  // Metadata qismi
  payload += `--${boundary}\r\n`;
  payload += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
  payload += JSON.stringify(metadata) + "\r\n";

  // Video qismi
  payload += `--${boundary}\r\n`;
  payload += 'Content-Type: video/mp4\r\n\r\n';
  payload += new TextDecoder().decode(videoBytes) + "\r\n";
  payload += `--${boundary}--\r\n`;

  return payload;
      }
