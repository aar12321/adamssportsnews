import Anthropic from "@anthropic-ai/sdk";
import type { BetAnalysis } from "@shared/schema";

// Reads ANTHROPIC_API_KEY from the environment ONLY. Never accept a key
// from user input, never log it, never commit it. When unset, the service
// falls back to a deterministic "AI disabled" response so the rest of the
// app keeps working in dev.
const apiKey = process.env.ANTHROPIC_API_KEY || "";
const client = apiKey ? new Anthropic({ apiKey }) : null;

if (!client) {
  console.warn(
    "[claude] ANTHROPIC_API_KEY not set — AI-powered endpoints will return a disabled response."
  );
}

// Stable system prompt lives above the cache boundary so every call
// writes once and reads cheaply thereafter. ~90% discount on cache hits.
const SYSTEM_PROMPT = `You write short, punchy sports betting commentary for a consumer app.

Rules:
- 2–3 sentences, max 60 words. No preamble, no lists, no markdown.
- Lead with the side you think has the edge and give one concrete reason.
- Flag one real risk to the other side of the bet.
- Plain English. No financial advice boilerplate. No emoji.`;

/** Number of tokens we're willing to spend per explanation. */
const MAX_OUTPUT_TOKENS = 220;

export type MatchupExplanation =
  | { ok: true; text: string; model: string; cached: boolean }
  | { ok: false; reason: string };

/**
 * Summarise a BetAnalysis in 2-3 sentences. Uses Haiku 4.5 for cost —
 * explainer copy doesn't need Opus. Prompt caches the system prompt so
 * repeat calls cost ~10% of first-call input tokens.
 */
export async function explainMatchup(analysis: BetAnalysis): Promise<MatchupExplanation> {
  if (!client) {
    return { ok: false, reason: "AI commentary is disabled (ANTHROPIC_API_KEY not configured)." };
  }

  const userPrompt = buildUserPrompt(analysis);

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const text = textBlock?.text?.trim() ?? "";
    if (!text) {
      return { ok: false, reason: "The model returned an empty response." };
    }
    const cached = (response.usage.cache_read_input_tokens ?? 0) > 0;
    return { ok: true, text, model: response.model, cached };
  } catch (err: any) {
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, reason: "AI commentary is rate-limited right now — try again in a minute." };
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, reason: "ANTHROPIC_API_KEY is invalid." };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, reason: `AI commentary failed (${err.status}).` };
    }
    return { ok: false, reason: err?.message || "AI commentary failed." };
  }
}

function buildUserPrompt(a: BetAnalysis): string {
  const homeMl = a.homeMoneyline > 0 ? `+${a.homeMoneyline}` : `${a.homeMoneyline}`;
  const awayMl = a.awayMoneyline > 0 ? `+${a.awayMoneyline}` : `${a.awayMoneyline}`;
  const homeForm = a.homeRecentForm.join("") || "?";
  const awayForm = a.awayRecentForm.join("") || "?";
  return [
    `Sport: ${a.sport}`,
    `Matchup: ${a.awayTeam} @ ${a.homeTeam}`,
    `Records: ${a.homeTeam} ${a.homeRecord} · ${a.awayTeam} ${a.awayRecord}`,
    `Recent form (W/L, most recent last): ${a.homeTeam} ${homeForm} · ${a.awayTeam} ${awayForm}`,
    `Moneylines: ${a.homeTeam} ${homeMl} · ${a.awayTeam} ${awayMl}`,
    `Model win probability: ${a.homeTeam} ${(a.homeWinProbability * 100).toFixed(0)}% · ${a.awayTeam} ${(a.awayWinProbability * 100).toFixed(0)}%`,
    `Model spread (home): ${a.recommendedSpread > 0 ? "+" : ""}${a.recommendedSpread}`,
    `Model total: ${a.recommendedOverUnder}`,
    a.keyFactors.length ? `Key factors:\n- ${a.keyFactors.join("\n- ")}` : "",
    "",
    "Write 2-3 sentences.",
  ].filter(Boolean).join("\n");
}

export function isClaudeEnabled(): boolean {
  return client !== null;
}
