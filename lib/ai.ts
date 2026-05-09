import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";

// ─── Provider call ────────────────────────────────────────────────────────────

export interface LLMResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
}

const DEFAULT_MODELS: Record<string, string> = {
  ANTHROPIC: "claude-sonnet-4-6",
  OPENAI: "gpt-4o",
  OPENROUTER: "anthropic/claude-sonnet-4-6",
  XAI: "grok-beta",
  MISTRAL: "mistral-large-latest",
  GOOGLE: "gemini-1.5-pro",
};

const BASE_URLS: Record<string, string> = {
  OPENAI: "https://api.openai.com/v1",
  OPENROUTER: "https://openrouter.ai/api/v1",
  XAI: "https://api.x.ai/v1",
  MISTRAL: "https://api.mistral.ai/v1",
  AZURE_OPENAI: "",
};

// Rough cost in cents per million tokens [input, output]
const COST_RATES: Record<string, [number, number]> = {
  "claude-sonnet-4-6": [300, 1500],
  "claude-opus-4-7": [1500, 7500],
  "claude-haiku-4-5": [80, 400],
  "gpt-4o": [250, 1000],
  "gpt-4o-mini": [15, 60],
  "gpt-4-turbo": [1000, 3000],
};

export async function getActiveProvider() {
  return prisma.aiProviderConfig.findFirst({
    where: {
      organizationId: DEFAULT_ORG_ID,
      enabled: true,
      apiKeySecretRef: { not: null },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function callLLM(
  prompt: string,
  workflowArea: string,
  maxTokens = 1024
): Promise<LLMResult> {
  const provider = await getActiveProvider();
  if (!provider?.apiKeySecretRef) {
    throw new Error(
      "No AI provider configured. Add an API key in Settings → AI Provider."
    );
  }

  const model = provider.defaultModel ?? DEFAULT_MODELS[provider.provider] ?? "gpt-4o";
  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;

  if (provider.provider === "ANTHROPIC") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": provider.apiKeySecretRef,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`);
    const d = await res.json();
    text = d.content?.[0]?.text ?? "";
    inputTokens = d.usage?.input_tokens ?? 0;
    outputTokens = d.usage?.output_tokens ?? 0;
  } else {
    // OpenAI-compatible (OpenAI, OpenRouter, xAI, Mistral)
    const baseUrl = provider.baseUrl ?? BASE_URLS[provider.provider] ?? "https://api.openai.com/v1";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKeySecretRef}`,
        "Content-Type": "application/json",
        ...(provider.provider === "OPENROUTER"
          ? { "HTTP-Referer": "https://renotrack360.com", "X-Title": "RenoTrack360" }
          : {}),
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`${provider.provider} error: ${await res.text()}`);
    const d = await res.json();
    text = d.choices?.[0]?.message?.content ?? "";
    inputTokens = d.usage?.prompt_tokens ?? 0;
    outputTokens = d.usage?.completion_tokens ?? 0;
  }

  // Non-blocking usage logging
  const [inRate, outRate] = COST_RATES[model] ?? [300, 1500];
  const estimatedCostCents = Math.round(
    (inputTokens * inRate + outputTokens * outRate) / 1_000_000
  );
  prisma.aiUsageLog.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      providerConfigId: provider.id,
      workflowArea,
      model,
      inputTokens,
      outputTokens,
      estimatedCostCents,
      status: "logged",
    },
  }).catch(() => {});

  return { text: text.trim(), inputTokens, outputTokens, model, provider: provider.provider };
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

export function weeklyReportPrompt(data: {
  jobName: string;
  workCompleted: string;
  issuesFound?: string;
  decisionsNeeded?: string;
  nextWeekPlan?: string;
}): string {
  return `You are helping a renovation contractor write a professional weekly client update.

Job: ${data.jobName}

Work completed this week:
${data.workCompleted}
${data.issuesFound ? `\nIssues found:\n${data.issuesFound}` : ""}
${data.decisionsNeeded ? `\nDecisions needed from client:\n${data.decisionsNeeded}` : ""}
${data.nextWeekPlan ? `\nNext week plan:\n${data.nextWeekPlan}` : ""}

Write a concise, professional client summary in 2-4 sentences. Requirements:
- Plain English, no trade jargon
- Focus on what was accomplished and what comes next
- Mention any client decisions needed clearly
- Written from the contractor's perspective
- No em dashes, no bullet points, no headers
- Sound like a human wrote it, not AI

Return only the client summary text, nothing else.`.trim();
}

export function estimateReviewPrompt(data: {
  projectType?: string;
  jobName?: string;
  total: number;
  items: Array<{ name: string; scopeArea: string; quantity: number; total: number }>;
}): string {
  const itemList = data.items
    .map((i) => `- ${i.scopeArea}: ${i.name} (qty ${i.quantity}) = $${i.total.toLocaleString()}`)
    .join("\n");

  return `You are reviewing a renovation estimate for a contractor. Flag potential issues only.

Project type: ${data.projectType ?? "Renovation"}
Total estimate: $${data.total.toLocaleString()}

Line items:
${itemList}

Review this estimate and flag issues in these categories only:
UNDERPRICED: item appears below typical cost (explain briefly)
MISSING: commonly needed item not in the scope (explain why it is needed)
CLARITY: scope description is vague or could cause a dispute

Rules:
- Flag 3 to 6 items maximum
- Be specific, not generic
- If something looks correct, do not mention it
- If the estimate looks solid overall, say: LOOKS GOOD: [one sentence]
- One issue per line, format: CATEGORY: Item name - reason
- No em dashes, no bullet points beyond the format above`.trim();
}
