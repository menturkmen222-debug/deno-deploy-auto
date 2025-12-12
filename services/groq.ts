// services/groq.ts
import type { Env } from "../index.ts";

export async function generateMetadata(env: Env, prompt: string): Promise<{ title: string; description: string; tags: string[] }> {
  const apiKey = env.GROQ_API_KEY;

  console.log("\n🎯 [Groq AI] Metadata yaratish jarayoni boshlanmoqda...");

  if (!apiKey) {
    console.warn("⚠️ GROQ_API_KEY mavjud emas. Fallback ishlatiladi.");
    return fallbackMetadata(prompt, "No API Key");
  }

  const systemPrompt = `You are a professional YouTube Shorts creator for US audience. Respond ONLY with valid JSON. Keys: "title" (max 55 chars), "description" (max 180 chars), "tags" (array of 5-10 strings).`;

  try {
    console.log("[Groq AI] So'rov yuborilmoqda...");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create metadata for: ${prompt}` }
        ],
        temperature: 0.8,
        max_tokens: 250,
      }),
    });

    console.log(`[Groq AI] HTTP STATUS: ${res.status}`);

    if (!res.ok) {
      const text = await res.text();
      console.error("[Groq AI] Server xatosi:", text);
      return fallbackMetadata(prompt, `HTTP ${res.status}`);
    }

    const json = await res.json();

    // full response log
    console.log("[Groq AI] Full response:", JSON.stringify(json, null, 2));

    let content = json.choices?.[0]?.message?.content?.trim() || "{}";

    // JSON ni ajratish
    if (content.includes("```json")) {
      content = content.split("```json")[1].split("```")[0].trim();
    } else if (content.startsWith("```")) {
      content = content.split("```")[1].split("```")[0].trim();
    }

    try {
      const parsed = JSON.parse(content);

      const title = (parsed.title || "AI Shorts").substring(0, 55).trim();
      const description = (parsed.description || prompt).substring(0, 180).trim();
      const tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : ["AI", "Shorts", "Viral"];

      // ✅ Full log including description
      console.log("[Groq AI] ✅ Metadata tayyor!");
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "🧠 AI metadata yaratildi",
        context: {
          title,
          description,
          tags
        }
      }, null, 2));

      return { title, description, tags };

    } catch (parseErr) {
      console.error("[Groq AI] JSON parsing xatosi:", parseErr);
      console.error("[Groq AI] Content:", content);
      return fallbackMetadata(prompt, "JSON Parse Error");
    }

  } catch (err) {
    console.error("[Groq AI] So‘rov yuborishda yoki tarmoqqa bog‘lanishda xato:", err);
    return fallbackMetadata(prompt, "Request Error");
  }
}

function fallbackMetadata(prompt: string, reason: string): { title: string; description: string; tags: string[] } {
  console.warn(`⚠️ Fallback ishlatilmoqda. Sabab: ${reason}`);
  const title = prompt.split(" ").slice(0, 6).join(" ") || "AI Shorts";
  const description = prompt;
  const tags = ["AI", "Shorts", "Auto"];

  // fallback log
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "warn",
    message: "⚠️ Fallback metadata ishlatildi",
    context: {
      reason,
      title,
      description,
      tags
    }
  }, null, 2));

  return { title, description, tags };
}
