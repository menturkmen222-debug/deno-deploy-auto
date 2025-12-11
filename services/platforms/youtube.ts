// services/platforms/youtube.ts
import type { Env } from "../../index.ts";
import { VideoRequest } from "../../types.ts";

export async function uploadToYouTube(env: Env, video: VideoRequest): Promise<boolean> {
  const refreshToken = env[`${video.channelName.toUpperCase()}_YT_TOKEN` as keyof Env] as string;
  if (!refreshToken) {
    throw new Error(`YouTube token not found for ${video.channelName}`);
  }

  const client_id = "209564473028-2gkh592o4gkba6maepq61sh5np6japen.apps.googleusercontent.com";
  const client_secret = "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";

  // 1️⃣ Access token olish
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

  // 2️⃣ Video URL dan yuklab olish
  const videoRes = await fetch(video.videoUrl);
  if (!videoRes.ok) throw new Error(`Video yuklab bo‘lmadi: ${videoRes.status}`);
  const videoBytes = new Uint8Array(await videoRes.arrayBuffer());

  // 3️⃣ YouTube metadata
  const metadata = {
    snippet: {
      title: video.title || "Auto Short",
      description: video.description || video.prompt,
      tags: video.tags || ["AI", "Shorts"],
      categoryId: "22",
    },
    status: { privacyStatus: "private" },
  };

  // 4️⃣ Multipart body yaratish (binary-safe)
  const boundary = "----YouTubeBoundary" + crypto.randomUUID().substring(0, 8);
  const body = buildMultipartPayload(metadata, videoBytes, boundary);

  // 5️⃣ Video yuklash
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
    throw new Error(`YouTube yuklamadi: ${uploadRes.status}`);
  }

  console.log(`✅ YouTube: ${video.channelName}`);
  return true;
}

// Binary-safe multipart payload
function buildMultipartPayload(metadata: any, videoBytes: Uint8Array, boundary: string): Blob {
  const CRLF = "\r\n";
  const metaPart =
    `--${boundary}${CRLF}` +
    `Content-Type: application/json${CRLF}${CRLF}` +
    JSON.stringify(metadata) + CRLF;

  const videoPartHeader =
    `--${boundary}${CRLF}` +
    `Content-Type: video/mp4${CRLF}${CRLF}`;

  const ending = `${CRLF}--${boundary}--${CRLF}`;

  const blob = new Blob(
    [
      metaPart,
      videoPartHeader,
      videoBytes,
      ending
    ]
  );

  return blob;
    }
