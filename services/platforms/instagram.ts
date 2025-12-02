// services/platforms/instagram.ts
import { VideoRequest } from "../../types.ts";

const IG_TOKENS: Record<string, string> = {
  tech_buni: Deno.env.get("TECH_BUNI_IG_TOKEN")!,
  cooking_buni: Deno.env.get("COOKING_BUNI_IG_TOKEN")!,
  travel_buni: Deno.env.get("TRAVEL_BUNI_IG_TOKEN")!,
  gaming_buni: Deno.env.get("GAMING_BUNI_IG_TOKEN")!,
  life_buni: Deno.env.get("LIFE_BUNI_IG_TOKEN")!,
};

export async function uploadToInstagram(video: VideoRequest): Promise<boolean> {
  const token = IG_TOKENS[video.channelName];
  if (!token) throw new Error(`Instagram token not found for ${video.channelName}`);

  // 1. Video yuklash
  const videoRes = await fetch(video.videoUrl);
  const videoArray = await videoRes.arrayBuffer();

  // 2. Media container yaratish
  const createRes = await fetch(
    `https://graph.facebook.com/v21.0/me/media?media_type=VIDEO`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_url: video.videoUrl,
        caption: `${video.title || "AI Short"}\n\n#${video.tags?.join(" #") || "AI"}`,
        access_token: token,
      }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error("Instagram container error:", err);
    throw new Error(`Instagram container failed: ${createRes.status}`);
  }

  const { id: containerId } = await createRes.json();

  // 3. Container'ni publish qilish
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/me/media_publish?creation_id=${containerId}`,
    { method: "POST", headers: { "Content-Type": "application/json" } }
  );

  if (!publishRes.ok) {
    console.error("Instagram publish failed");
    throw new Error("Instagram publish failed");
  }

  console.log(`[Instagram] ✅ ${video.channelName} — ${video.title}`);
  return true;
}
