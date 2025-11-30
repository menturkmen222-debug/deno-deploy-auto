const TIKTOK_TOKENS: Record<ChannelId, string> = {
  channel_1: Deno.env.get("TIKTOK_TOKEN_1")!,
  channel_2: Deno.env.get("TIKTOK_TOKEN_2")!,
  channel_3: Deno.env.get("TIKTOK_TOKEN_3")!,
  channel_4: Deno.env.get("TIKTOK_TOKEN_4")!,
  channel_5: Deno.env.get("TIKTOK_TOKEN_5")!,
};

export async function uploadToTikTok(video: any): Promise<boolean> {
  const token = TIKTOK_TOKENS[video.channelId];
  console.log(`[TikTok] Uploading to ${video.channelId}`);
  return true;
}
