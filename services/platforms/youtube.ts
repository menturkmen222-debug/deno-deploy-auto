// services/platforms/youtube.ts
import { VideoRequest } from "../../types.ts";

const YOUTUBE_TOKENS: Record<string, string> = {
  tech_buni: Deno.env.get("TECH_BUNI_YT_TOKEN")!,
  // ... bosh qa kanallar
};

// Yangi: Refresh tokenni access tokenga aylantirish
async function getAccessToken(refreshToken: string): Promise<string> {
  const client_id = "209564473028-n5s0htgj8ehkiot6if4uju21rss4mnbf.apps.googleusercontent.com";
  const client_secret = "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";

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Access token olishda xato: ${res.status} – ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function uploadToYouTube(video: VideoRequest): Promise<boolean> {
  const refreshToken = YOUTUBE_TOKENS[video.channelName];
  if (!refreshToken) throw new Error(`YouTube token not found for ${video.channelName}`);

  // ✅ Yangi: Refresh tokenni almashish
  const accessToken = await getAccessToken(refreshToken);

  const videoRes = await fetch(video.videoUrl);
  const videoArray = new Uint8Array(await videoRes.arrayBuffer());

  const metadata = {
    snippet: {
      title: video.title || "Auto Short",
      description: video.description || video.prompt,
      tags: video.tags || ["AI", "Shorts"],
      categoryId: "22",
    },
    status: {
      privacyStatus: "private",
    },
  };

  const boundary = "----YouTubeBoundary" + crypto.randomUUID().slice(0, 8);
  const body = buildMultipartPayload(metadata, videoArray, boundary);

  const res = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`, // ✅ access_token
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("YouTube API xato:", err);
    throw new Error(`YouTube yuklamadi: ${res.status}`);
  }

  console.log(`✅ YouTube: ${video.channelName} — "${video.title}"`);
  return true;
}

function buildMultipart(payload: any, videoBytes: Uint8Array, boundary: string): string {
  let payload = "";
  payload += `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n`;
  payload += `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n${new TextDecoder().decode(videoBytes)}\r\n`;
  payload += `--${boundary}--\r\n`;
  return payload;
}
