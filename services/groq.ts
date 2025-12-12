// services/groq.ts
import type { Env } from "../index.ts";

export async function generateMetadata(env: Env, prompt: string): Promise<{ title: string; description: string; tags: string[] }> {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ GROQ_API_KEY yo'q");
    return fallbackMetadata(prompt);
  }

  // ✅ Aniqroq so'rov — faqat JSON qaytishini talab qilish
  const systemPrompt = `You are a professional YouTube Shorts creator for US audience. Respond ONLY with valid JSON. Keys: "title" (max 55 chars), "description" (max 180 chars), "tags" (array of 5-10 strings).`;

  try {
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

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq error ${res.status}: ${text}`);
    }

    const json = await res.json();
    let content = json.choices?.[0]?.message?.content?.trim() || "{}";

    // ✅ To'g'ri JSONni ajratish
    if (content.includes("```json")) {
      content = content.split("```json")[1].split("```")[0].trim();
    } else if (content.startsWith("```")) {
      content = content.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(content);
    return {
      title: (parsed.title || "AI Shorts").substring(0, 55).trim(),
      description: (parsed.description || prompt).substring(0, 180).trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : ["AI", "Shorts", "Viral"],
    };
  } catch (err) {
    console.error("Groqda xato:", err.message);
    return fallbackMetadata(prompt);
  }
}

function fallbackMetadata(prompt: string): { title: string; description: string; tags: string[] } {
  // ✅ Sizning promptingizni sarlavha sifatida ishlatish
  const title = prompt.split(" ").slice(0, 6).join(" "); // 6 so'zgacha
  return {
    title: title.length > 0 ? title : "AI Shorts",
    description: prompt,
    tags: ["AI", "Shorts", "Auto"],
  };
}
