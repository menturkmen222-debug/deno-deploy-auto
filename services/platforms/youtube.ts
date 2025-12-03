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
  if (!token) {
    throw new Error(`YouTube token not found for ${video.channelName}`);
  }

  const metadata = {
    snippet: {
      title: video.title || "Auto-Generated Short",
      description: video.description || video.prompt,
      tags: video.tags || ["AI", "Shorts"],
      categoryId: "22",
    },
    status: {
      privacyStatus: "private",
      selfDeclaredMadeForKids: false,
    },
    recordingDetails: {
      recordingDate: new Date().toISOString(),
    },
  };

  const videoRes = await fetch(video.videoUrl);
  if (!videoRes.ok) {
    throw new Error(`Failed to fetch video from Cloudinary: ${videoRes.status}`);
  }
  const videoBytes = new Uint8Array(await videoRes.arrayBuffer());

  // Random boundary yaratish
  const boundary = "----YouTubeUploadBoundary" + crypto.randomUUID().slice(0, 8);

  const body = buildMultipartPayload(metadata, videoBytes, boundary);
  const url = "https://www.googleapis.com/upload/youtube/v3/videos" +
              "?uploadType=multipart" +
              "&part=snippet,status,recordingDetails"; // ✅ BEKAS JO'SIZ

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("YouTube API xato:", errorText);
    throw new Error(`YouTube yuklamadi: ${res.status} ${res.statusText}`);
  }

  console.log(`[YouTube] ✅ ${video.channelName} — "${video.title}" yuklandi`);
  return true;
}

function buildMultipartPayload(metadata: any, videoBytes: Uint8Array, boundary: string): string {
  let payload = "";

  // Metadata qismi
  payload += `--${boundary}\r\n`;
  payload += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
  payload += JSON.stringify(metadata) + "\r\n";

  // Video qismi
  payload += `--${boundary}\r\n`;
  payload += "Content-Type: video/mp4\r\n\r\n";
  payload += new TextDecoder().decode(videoBytes) + "\r\n";

  // Yakunlovchi chegaralar
  payload += `--${boundary}--\r\n`;

  return payload;
}
