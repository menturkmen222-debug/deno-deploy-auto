// services/platforms/youtube.ts
import type { Env } from "../../index.ts";
import { VideoRequest } from "../../types.ts";

// ✅ Cloudflare Workers uchun tokenlarni `env` orqali olish
const YOUTUBE_TOKENS: Record<string, string> = {
  tech_buni: "TECH_BUNI_YT_TOKEN",
  cooking_buni: "COOKING_BUNI_YT_TOKEN",
  travel_buni: "TRAVEL_BUNI_YT_TOKEN",
  gaming_buni: "GAMING_BUNI_YT_TOKEN",
  life_buni: "LIFE_BUNI_YT_TOKEN",
};

// ✅ `env` orqali token olish
function getToken(env: Env, channelName: string): string {
  const tokenKey = YOUTUBE_TOKENS[channelName as keyof typeof YOUTUBE_TOKENS];
  if (!tokenKey) throw new Error(`YouTube token key not found for ${channelName}`);
  return (env[tokenKey as keyof Env] as string) || "";
}

export async function uploadToYouTube(env: Env, video: VideoRequest): Promise<boolean> {
  const refreshToken = getToken(env, video.channelName);
  if (!refreshToken) {
    throw new Error(`YouTube token not found for ${video.channelName}`);
  }

  const client_id = "209564473028-2gkh592o4gkba6maepq61sh5np6japen.apps.googleusercontent.com";
  const client_secret = "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";

  // 1. Access token olish
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token olishda xato: ${tokenRes.status} – ${err}`);
  }

  const { access_token } = await tokenRes.json();

  // 2. Video faylini yuklash
  const videoRes = await fetch(video.videoUrl);
  if (!videoRes.ok) {
    throw new Error(`Video fayl yuklanmadi: ${videoRes.status}`);
  }
  const videoBytes = new Uint8Array(await videoRes.arrayBuffer());

  // 3. Metadata tayyorlash
  const metadata = {
    snippet: {
      title: video.title || "Auto-Generated Short",
      description: video.description || video.prompt,
      tags: video.tags || ["AI", "Shorts"],
      categoryId: "22",
    },
    status: { privacyStatus: "private" },
  };

  // 4. Multipart payload
  const boundary = "----YouTubeBoundary" + crypto.randomUUID().substring(0, 8);
  let body = "";
  body += `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  body += `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n${new TextDecoder().decode(videoBytes)}\r\n`;
  body += `--${boundary}--\r\n`;

  // 5. YouTube API chaqiruvi
  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error("YouTube xato:", err);
    throw new Error(`YouTube yuklamadi: ${uploadRes.status} – ${err}`);
  }

  console.log(`✅ YouTube: ${video.channelName} → "${video.title}"`);
  return true;
}
