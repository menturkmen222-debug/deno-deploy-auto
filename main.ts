// cleanup-kv.ts
const kv = await Deno.openKv();

// Barcha video_queue yozuvlarini o'chirish
const entries = kv.list({ prefix: ["video_queue"] });
const promises: Promise<void>[] = [];

for await (const { key } of entries) {
  console.log("O'chirilmoqda:", key);
  promises.push(kv.delete(key));
}

await Promise.all(promises);
console.log("✅ Barcha video_queue yozuvlari o'chirildi");
