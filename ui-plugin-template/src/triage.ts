import type { TriageResult, Route } from "./types";

const SYSTEM_PROMPT = `You are a classifier for an office onboarding knowledge graph assistant.

Given a user question, classify it into exactly one category and extract the key entity.

Categories:
- service-ownership: asking who owns, maintains, or is responsible for a service or tool
- role-tooling: asking what tools, access, or systems a job role needs
- spend-approval: asking about spend approval chains or who approves a purchase (extract the amount if mentioned)
- escalation: asking about escalation paths, stuck requests, or who to contact when blocked
- general: anything that doesn't fit the above

Respond with ONLY valid JSON, no other text:
{"route": "...", "entity": "...", "amount": null}

entity should be the key subject being asked about (service name, role name, etc).
amount should be a number if a spend amount is mentioned, otherwise null.`;

export function buildTriagePrompt(question: string): { system: string; text: string } {
  return { system: SYSTEM_PROMPT, text: question };
}

export function parseTriageResult(raw: string): TriageResult {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);

    const validRoutes: Route[] = [
      "service-ownership", "role-tooling", "spend-approval",
      "escalation", "general",
    ];

    return {
      route: validRoutes.includes(parsed.route) ? parsed.route : "general",
      entity: typeof parsed.entity === "string" ? parsed.entity : "",
      amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
    };
  } catch {
    return { route: "general", entity: "" };
  }
}
