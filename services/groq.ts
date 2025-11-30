export async function generateMetadata(prompt: string): Promise<{ title: string; description: string; tags: string[] }> {
  const systemPrompt = `You are a professional content creator for US audiences. Generate a catchy title (max 60 chars), engaging description (max 200 chars), and 10 relevant SEO tags as a JSON array. Output ONLY valid JSON with keys: "title", "description", "tags".`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${res.statusText}`);
  const json = await res.json();
  let content = json.choices?.[0]?.message?.content?.trim() || "{}";

  if (content.startsWith("```")) {
    content = content.substring(content.indexOf("{"));
    content = content.substring(0, content.lastIndexOf("}") + 1);
  }

  try {
    const parsed = JSON.parse(content);
    return {
      title: (parsed.title || "Auto Shorts").substring(0, 60),
      description: (parsed.description || prompt).substring(0, 200),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : ["ai", "shorts", "automation"],
    };
  } catch {
    return {
      title: "Auto Shorts",
      description: prompt.substring(0, 200),
      tags: ["ai", "shorts", "automation"],
    };
  }
}
