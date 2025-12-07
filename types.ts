// types.ts
export type Platform = "youtube" | "tiktok" | "instagram" | "facebook";
export type ChannelName = 
  | "tech_buni"
  | "cooking_buni"
  | "travel_buni"
  | "gaming_buni"
  | "life_buni";

export interface VideoRequest {
  id: string;
  videoUrl: string;
  prompt: string;
  channelName: ChannelName;
  platform: Platform;
  status: "pending" | "processing" | "uploaded" | "failed";
  scheduledAt: Date;
  title?: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
}
