import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getDb } from "@/db";
import { aiUsage } from "@/db/schema";
import { aiSpendThisMonth, getApprovedKit } from "@/lib/queries/marketing";
import { brandSystemPrompt } from "./brand-prompt";
import { monthlyBudgetUsd } from "./budget-rules";
import { costMicroUsd } from "./cost";
import { personalDataFound } from "./personal-data";
import { MODEL, TASKS, outputSchema, taskPrompt, textOf, tidyOutput, type TaskInput, type TaskKey, type TaskOutput } from "./tasks";

/**
 * Run one AI task for a signed-in member of staff.
 *
 * In order: is AI switched on, is this month's limit reached, does the text
 * contain personal details (if so nothing is sent), then the request. Every
 * request is recorded in ai_usage with its cost; the text itself is not.
 */

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 100_000, maxRetries: 1 }));

type Outcome = "ok" | "refused" | "error" | "blocked" | "over_budget";

async function record(o: {
  task: TaskKey;
  actorId: string;
  entityId?: string | null;
  outcome: Outcome;
  usage?: { input: number; output: number; cacheRead: number; cacheWrite: number };
  requestId?: string | null;
  started: number;
}) {
  const u = o.usage ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  try {
    await getDb()
      .insert(aiUsage)
      .values({
        feature: o.task,
        provider: "anthropic",
        model: MODEL,
        actorId: o.actorId,
        entity: TASKS[o.task].entity,
        entityId: o.entityId ?? null,
        inputTokens: u.input,
        outputTokens: u.output,
        cacheReadTokens: u.cacheRead,
        cacheWriteTokens: u.cacheWrite,
        costMicroUsd: costMicroUsd(MODEL, u),
        outcome: o.outcome,
        requestId: o.requestId ?? null,
        durationMs: Date.now() - o.started,
      });
  } catch (err) {
    console.error("[ai] usage not recorded", err);
  }
}

export type RunResult<K extends TaskKey> = { ok: true; output: TaskOutput<K> } | { ok: false; message: string; status: number };

export async function runTask<K extends TaskKey>(
  task: K,
  input: TaskInput<K>,
  o: { actorId: string; entityId?: string | null; image?: { type: "image/jpeg" | "image/png" | "image/webp"; base64: string } }
): Promise<RunResult<K>> {
  const started = Date.now();
  if (!aiConfigured()) return { ok: false, status: 503, message: "AI help isn't switched on yet." };

  const budget = monthlyBudgetUsd();
  if ((await aiSpendThisMonth()) >= budget) {
    await record({ task, actorId: o.actorId, entityId: o.entityId, outcome: "over_budget", started });
    return { ok: false, status: 429, message: `This month's AI limit ($${budget}) has been reached. AI help is available again on the 1st.` };
  }

  const found = personalDataFound(textOf(input as Record<string, unknown>));
  if (found) {
    await record({ task, actorId: o.actorId, entityId: o.entityId, outcome: "blocked", started });
    return { ok: false, status: 400, message: `Nothing was sent: the text includes ${found}. AI help never receives details about clients or anyone else, so take it out and try again.` };
  }

  const { kit } = await getApprovedKit();
  const settings = TASKS[task];
  const content: Anthropic.ContentBlockParam[] = [];
  if (o.image) content.push({ type: "image", source: { type: "base64", media_type: o.image.type, data: o.image.base64 } });
  content.push({ type: "text", text: taskPrompt(task, input) });

  try {
    const response = await getClient().messages.parse({
      model: MODEL,
      max_tokens: settings.maxTokens,
      // Cached for 5 minutes. Each task's answer format is part of what's cached,
      // so the saving comes when the same button is used again soon after.
      system: [{ type: "text", text: brandSystemPrompt(kit), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
      output_config: { effort: settings.effort, format: zodOutputFormat(outputSchema(task)) },
    });
    const usage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
      cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
    };
    const requestId = (response as { _request_id?: string | null })._request_id ?? null;

    if (response.stop_reason === "refusal") {
      await record({ task, actorId: o.actorId, entityId: o.entityId, outcome: "refused", usage, requestId, started });
      return { ok: false, status: 422, message: "The AI declined this request. Try rewording it, or write this part yourself." };
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      await record({ task, actorId: o.actorId, entityId: o.entityId, outcome: "error", usage, requestId, started });
      return { ok: false, status: 502, message: "The AI's answer was incomplete. Please try again, or try a shorter piece." };
    }
    await record({ task, actorId: o.actorId, entityId: o.entityId, outcome: "ok", usage, requestId, started });
    return { ok: true, output: tidyOutput(task, response.parsed_output as TaskOutput<K>) };
  } catch (err) {
    const requestId = err instanceof Anthropic.APIError ? err.requestID : null;
    await record({ task, actorId: o.actorId, entityId: o.entityId, outcome: "error", requestId, started });
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[ai] the API key was refused");
      return { ok: false, status: 503, message: "AI help isn't working: the key was refused. Please tell whoever looks after the website." };
    }
    if (err instanceof Anthropic.RateLimitError) return { ok: false, status: 429, message: "The AI is busy. Please try again in a minute." };
    console.error("[ai] request failed", task, err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
    return { ok: false, status: 502, message: "AI help didn't respond. Please try again in a moment." };
  }
}
