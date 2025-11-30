// types.ts

/**
 * Platforma turlari — 4 ta tarmoq
 */
export type Platform = "youtube" | "tiktok" | "instagram" | "facebook";

/**
 * Kanal nomlari — 5 ta aniq nom
 */
export type ChannelName = 
  | "tech_buni"
  | "cooking_buni"
  | "travel_buni"
  | "gaming_buni"
  | "life_buni";

/**
 * Video so'rovi — Deno KV da saqlanadigan asosiy yozuv
 */
export interface VideoRequest {
  /**
   * Unikal identifikator (UUID)
   */
  id: string;

  /**
   * Cloudinarydagi video URL (bitta video — 4 ta platformaga)
   */
  videoUrl: string;

  /**
   * Foydalanuvchi tomonidan berilgan AI prompti
   */
  prompt: string;

  /**
   * Kanal nomi (masalan: "tech_buni")
   */
  channelName: ChannelName;

  /**
   * Platforma (har bir kanal uchun 4 ta alohida yozuv)
   */
  platform: Platform;

  /**
   * Jarayon holati
   */
  status: "pending" | "processing" | "uploaded" | "failed";

  /**
   * Video yuklanishi rejalashtirilgan vaqti (AQSH soatiga mos UTC)
   * Namuna: 11:00 UTC = 6:00 AM EST
   */
  scheduledAt: Date;

  /**
   * AI tomonidan yaratilgan sarlavha (Groq)
   */
  title?: string;

  /**
   * AI tomonidan yaratilgan tavsif
   */
  description?: string;

  /**
   * SEO teglar (10 taggacha)
   */
  tags?: string[];

  /**
   * Yaratilgan vaqt
   */
  createdAt: Date;
}
