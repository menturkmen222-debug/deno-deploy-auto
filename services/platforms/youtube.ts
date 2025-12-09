// services/platforms/youtube.ts
import type { Env } from "../../index.ts";
import { VideoRequest } from "../../types.ts";

export async function uploadToYouTube(env: Env, video: VideoRequest): Promise<boolean> {
  const refreshToken = env[`${video.channelName.toUpperCase()}_YT_TOKEN` as keyof Env] as string;
  if (!refreshToken) {
    throw new Error(`YouTube token not found for ${video.channelName}`);
  }

  const client_id = "209564473028-n5s0htgj8ehkiot6if4uju21rss4mnbf.apps.googleusercontent.com";
  const client_secret = "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";

  // ✅ TO'G'RI: BO'SH JOYSIZ
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

  const videoRes = await fetch(video.videoUrl);
  const videoBytes = new Uint8Array(await videoRes.arrayBuffer());

  const metadata = {
    snippet: {
      title: video.title || "Auto Short",
      description: video.description || video.prompt,
      tags: video.tags || ["AI", "Shorts"],
      categoryId: "22",
    },
    status: { privacyStatus: "private" },
  };

  const boundary = "----YouTubeBoundary" + crypto.randomUUID().substring(0, 8);
  const body = buildMultipartPayload(metadata, videoBytes, boundary);

  // ✅ TO'G'RI: BO'SH JOYSIZ
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

function buildMultipartPayload(metadata: any, videoBytes: Uint8Array, boundary: string): string {
  let payload = "";
  payload += `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  payload += `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n${new TextDecoder().decode(videoBytes)}\r\n`;
  payload += `--${boundary}--\r\n`;
  return payload;
}
