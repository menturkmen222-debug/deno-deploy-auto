// services/groq.ts
export async function generateMetadata(prompt: string): Promise<{ title: string; description: string; tags: string[] }> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    console.warn("⚠️ GROQ_API_KEY muhit o'zgaruvchisi yo'q");
    return fallbackMetadata(prompt);
  }

  const systemPrompt = `You are a professional content creator for US audiences. Generate a catchy title (max 60 chars), engaging description (max 200 chars), and 10 relevant SEO tags as a JSON array. Output ONLY valid JSON with keys: "title", "description", "tags".`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // ✅ Yangi model (eski `llama3-8b-8192` dekomission qilingan)
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Groq API xatosi:", res.status, text);
      return fallbackMetadata(prompt);
    }

    const json = await res.json();
    let content = json.choices?.[0]?.message?.content?.trim() || "{}";

    // JSONni tozalash
    if (content.startsWith("```")) {
      content = content.split("```")[1]?.replace("json", "")?.trim() || "{}";
    }

    const parsed = JSON.parse(content);
    return {
      title: (parsed.title || "Auto Shorts").substring(0, 60),
      description: (parsed.description || prompt).substring(0, 200),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : ["AI", "Shorts"],
    };
  } catch (err) {
    console.error("Groq metadata yaratishda xato:", err);
    return fallbackMetadata(prompt);
  }
}

function fallbackMetadata(prompt: string): { title: string; description: string; tags: string[] } {
  return {
    title: "Auto Shorts",
    description: prompt.substring(0, 200),
    tags: ["AI", "Shorts", "Automation"],
  };
}
