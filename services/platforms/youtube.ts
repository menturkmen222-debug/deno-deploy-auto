// services/platforms/youtube.ts
import { VideoRequest } from "../../types.ts";

const YOUTUBE_TOKENS: Record<string, string> = {
  tech_buni: Deno.env.get("TECH_BUNI_YT_TOKEN")!,
  cooking_buni: Deno.env.get("COOKING_BUNI_YT_TOKEN")!,
  travel_buni: Deno.env.get("TRAVEL_BUNI_YT_TOKEN")!,
  gaming_buni: Deno.env.get("GAMING_BUNI_YT_TOKEN")!,
  life_buni: Deno.env.get("LIFE_BUNI_YT_TOKEN")!,
};

// Refresh tokenni access tokenga aylantirish
async function getAccessToken(refreshToken: string): Promise<string> {
  const client_id = "209564473028-n5s0htgj8ehkiot6if4uju21rss4mnbf.apps.googleusercontent.com";
  const client_secret = "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";

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Access token olishda xato: ${response.status} – ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Multipart payload yaratish
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

export async function uploadToYouTube(video: VideoRequest): Promise<boolean> {
  const refreshToken = YOUTUBE_TOKENS[video.channelName];
  if (!refreshToken) {
    throw new Error(`YouTube token not found for ${video.channelName}`);
  }

  // Access token olish
  const accessToken = await getAccessToken(refreshToken);

  // Video faylini yuklash
  const videoResponse = await fetch(video.videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Cloudinary video yuklanmadi: ${videoResponse.status}`);
  }
  const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());

  // Metadata tayyorlash
  const metadata = {
    snippet: {
      title: video.title || "Auto-Generated Short",
      description: video.description || video.prompt,
      tags: video.tags || ["AI", "Shorts"],
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus: "private", // Keyin "public" qilishingiz mumkin
    },
  };

  // Chegarani yaratish
  const boundary = "----YouTubeBoundary" + crypto.randomUUID().substring(0, 8);

  // So'rov tayyorlash
  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: buildMultipartPayload(metadata, videoBytes, boundary),
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error("YouTube API xato:", errorText);
    throw new Error(`YouTube yuklamadi: ${uploadResponse.status}`);
  }

  console.log(`✅ YouTube: ${video.channelName} — "${video.title}" muvaffaqiyatli yuklandi`);
  return true;
}
