import { VideoRequest } from "../types.ts";

const kv = await Deno.openKv();
const QUEUE_PREFIX = ["video_queue"];

export async function enqueueVideo(video: Omit<VideoRequest, "id" | "status" | "createdAt">): Promise<string> {
  const id = crypto.randomUUID();
  const request: VideoRequest = {
    id,
    ...video,
    status: "pending",
    createdAt: new Date(),
  };
  await kv.set([...QUEUE_PREFIX, id], request);
  return id;
}

export async function getPendingVideos(limit = 1): Promise<VideoRequest[]> {
  const entries = kv.list<VideoRequest>({ prefix: QUEUE_PREFIX });
  const videos: VideoRequest[] = [];
  for await (const { value } of entries) {
    if (value.status === "pending") {
      videos.push(value);
      if (videos.length >= limit) break;
    }
  }
  return videos;
}

export async function updateVideoStatus(id: string, status: VideoRequest["status"], metadata?: Partial<VideoRequest>) {
  const key = [...QUEUE_PREFIX, id];
  const res = await kv.get<VideoRequest>(key);
  if (!res.value) throw new Error(`Video ${id} topilmadi`);
  const updated = { ...res.value, status, ...metadata };
  await kv.set(key, updated);
    }
