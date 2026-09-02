export interface SearchPreset {
  key: string;
  title: string;
  query: string;
}

export const SEARCH_PRESETS: SearchPreset[] = [
  { key: "svc-owner", title: "Service ownership", query: "Who owns the payment gateway service?" },
  { key: "access", title: "Access approval", query: "Who can approve my access to the data warehouse?" },
  { key: "spend", title: "Spend approval", query: "I need £5,000 for a new tool — who approves it?" },
  { key: "tooling", title: "Role tooling", query: "I just joined as a data engineer — what tools do I need?" },
  { key: "escalation", title: "Escalation", query: "My request is stuck — who do I escalate to?" },
];
