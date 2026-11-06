import { createServerFn } from "@tanstack/react-start";
import { generateChatCompletion, GatewayError } from "@lovable.dev/ai-gateway";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIES, CONDITIONS } from "@/lib/marketplace";

const MODEL = "openai/gpt-6-astra" as const;
const CAT_LIST = CATEGORIES.map((c) => c.value).join(", ");

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type Msg = { role: "system" | "user" | "assistant"; content: string | Part[] };

async function complete(messages: Msg[], json = false): Promise<string> {
  try {
    const res = await generateChatCompletion({
      model: MODEL,
      messages: messages as never,
      ...(json ? { response_format: { type: "json_object" as const } } : {}),
    });
    const content = res.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : "";
  } catch (err) {
    if (err instanceof GatewayError) {
      console.error("AI gateway error", err.code, err.httpStatus, err.ids);
      if (err.httpStatus === 429) throw new Error("The assistant is busy right now. Try again in a minute.");
      if (err.httpStatus === 402) throw new Error("AI credits have run out. Please try again later.");
    }
    throw new Error("The assistant could not answer right now.");
  }
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? (JSON.parse(m[0]) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ---------- Ask compsell assistant ----------
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string; message: string }) => {
    const message = String(input.message ?? "").trim().slice(0, 2000);
    if (!message) throw new Error("Message is empty");
    return { threadId: String(input.threadId), message };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: thread, error: tErr } = await supabase
      .from("ai_threads")
      .select("id,title")
      .eq("id", data.threadId)
      .maybeSingle();
    if (tErr || !thread) throw new Error("Chat not found");

    const { error: uErr } = await supabase
      .from("ai_messages")
      .insert({ thread_id: thread.id, user_id: userId, role: "user", content: data.message });
    if (uErr) throw new Error("Could not save your message");

    const [{ data: history }, { data: listings }] = await Promise.all([
      supabase
        .from("ai_messages")
        .select("role,content")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true })
        .limit(40),
      supabase
        .from("listings")
        .select("id,title,category,condition,price,quantity,city,campus,is_project")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const catalog = (listings ?? [])
      .map(
        (l) =>
          `- [${l.title}](/listing/${l.id}) | ${l.category}${l.is_project ? " (project)" : ""} | ${l.condition} | ₹${l.price} | qty ${l.quantity} | ${l.campus || l.city || "-"}`,
      )
      .join("\n");

    const system = `You are "compsell AI", the built-in assistant of compsell — a student marketplace in India to buy, sell and reuse electronics components and completed projects (tagline: Buy. Sell. Reuse Electronics.).
Help students pick components for projects, explain parts (ESP32, Arduino, sensors, motor drivers...), suggest fair second-hand prices in rupees (₹), write listings, and stay safe when meeting buyers (meet on campus, test before paying, never pay in advance).
When a current listing fits, recommend it using its markdown link exactly as given. Never invent listings. Keep answers short, friendly and practical, with bullet points when helpful.
Current active listings:
${catalog || "(none right now)"}`;

    const reply =
      (await complete([
        { role: "system", content: system },
        ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ])) || "Sorry, I couldn't come up with an answer. Try rephrasing?";

    const { error: aErr } = await supabase
      .from("ai_messages")
      .insert({ thread_id: thread.id, user_id: userId, role: "assistant", content: reply });
    if (aErr) throw new Error("Could not save the reply");

    const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
    if (thread.title === "New chat") patch.title = data.message.slice(0, 60);
    await supabase.from("ai_threads").update(patch).eq("id", thread.id);

    return { reply };
  });

// ---------- AI listing writer ----------
export const writeListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { notes: string; isProject: boolean }) => {
    const notes = String(input.notes ?? "").trim().slice(0, 1500);
    if (notes.length < 3) throw new Error("Tell the AI a little about what you're selling");
    return { notes, isProject: !!input.isProject };
  })
  .handler(async ({ data }) => {
    const text = await complete(
      [
        {
          role: "system",
          content: `You write listings for compsell, an Indian student electronics marketplace. From the seller's rough notes, return JSON only:
{"title": short clear title (max 60 chars), "description": 2-4 honest sentences with key specs, what's included and usage, "category": one of [${CAT_LIST}], "condition": one of [${CONDITIONS.join(", ")}], "price": fair second-hand price in INR as a whole number, "price_reason": one short sentence}
${data.isProject ? "This is a completed student project being sold." : ""}`,
        },
        { role: "user", content: data.notes },
      ],
      true,
    );
    const out = parseJson<Record<string, unknown>>(text, {});
    const category = CATEGORIES.some((c) => c.value === out["category"]) ? String(out["category"]) : "";
    const condition = (CONDITIONS as readonly string[]).includes(String(out["condition"]))
      ? String(out["condition"])
      : "";
    return {
      title: String(out["title"] ?? "").slice(0, 80),
      description: String(out["description"] ?? ""),
      category,
      condition,
      price: Math.max(0, Math.round(Number(out["price"]) || 0)),
      priceReason: String(out["price_reason"] ?? ""),
    };
  });

// ---------- Smart search ----------
export const smartSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => {
    const query = String(input.query ?? "").trim().slice(0, 300);
    if (!query) throw new Error("Type what you're looking for");
    return { query };
  })
  .handler(async ({ data }) => {
    const text = await complete(
      [
        {
          role: "system",
          content: `Convert a student's plain-language search for an electronics marketplace into filters. Return JSON only:
{"q": 1-3 core keywords or "", "category": one of [${CAT_LIST}] or null, "condition": one of [${CONDITIONS.join(", ")}] or null, "min": number or null, "max": number or null (rupees), "place": city/campus text or "", "sort": "newest"|"nearby"|"price_asc"|"price_desc", "summary": short phrase describing what you searched}
Use "nearby" when they mention near me / my campus; "price_asc" for cheap/cheapest.`,
        },
        { role: "user", content: data.query },
      ],
      true,
    );
    const o = parseJson<Record<string, unknown>>(text, {});
    const num = (v: unknown) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));
    const sorts = ["newest", "nearby", "price_asc", "price_desc"];
    return {
      q: typeof o["q"] === "string" ? o["q"] : data.query,
      category: CATEGORIES.some((c) => c.value === o["category"]) ? String(o["category"]) : null,
      condition: (CONDITIONS as readonly string[]).includes(String(o["condition"])) ? String(o["condition"]) : null,
      min: num(o["min"]),
      max: num(o["max"]),
      place: typeof o["place"] === "string" ? o["place"] : "",
      sort: sorts.includes(String(o["sort"])) ? String(o["sort"]) : "newest",
      summary: typeof o["summary"] === "string" ? o["summary"] : data.query,
    };
  });

// ---------- Photo / listing guard ----------
export const screenListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; description: string; images: string[] }) => ({
    title: String(input.title ?? "").slice(0, 200),
    description: String(input.description ?? "").slice(0, 3000),
    images: (Array.isArray(input.images) ? input.images : [])
      .filter((s) => typeof s === "string" && s.startsWith("data:image/"))
      .slice(0, 5),
  }))
  .handler(async ({ data }) => {
    const parts: Part[] = [
      { type: "text", text: `Title: ${data.title}\nDescription: ${data.description || "(none)"}` },
      ...data.images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ];
    const text = await complete(
      [
        {
          role: "system",
          content: `You moderate listings on compsell, a student marketplace ONLY for electronics components, tools, scientific calculators and completed electronics projects.
Reject if: photos are unrelated to the item (selfies, memes, random scenery, screenshots unrelated), inappropriate/offensive/sexual/violent content, the item is not electronics-related, or the text is spam/scam. Accept ordinary, imperfect photos of real items.
Return JSON only: {"ok": boolean, "reason": short friendly explanation for the seller if rejected, else ""}`,
        },
        { role: "user", content: parts },
      ],
      true,
    );
    const o = parseJson<{ ok?: unknown; reason?: unknown }>(text, { ok: true });
    return { ok: o.ok !== false, reason: typeof o.reason === "string" ? o.reason : "" };
  });
