export type Platform = "youtube" | "tiktok" | "instagram" | "facebook";
export type ChannelId = "channel_1" | "channel_2" | "channel_3" | "channel_4" | "channel_5";

export interface VideoRequest {
  id: string;
  videoUrl: string;
  prompt: string;
  platform: Platform;
  channelId: ChannelId;
  status: "pending" | "processing" | "uploaded" | "failed";
  title?: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
}
