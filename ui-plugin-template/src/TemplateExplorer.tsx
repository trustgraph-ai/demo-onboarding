import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme, SearchInput, Badge } from "@trustgraph/trustkit";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore } from "@trustgraph/react-state";
import { BotMessage } from "./BotMessage";
import { EntityCard } from "./EntityCard";
import { buildTriagePrompt, parseTriageResult } from "./triage";
import { processQuestion } from "./answers";
import type { FlowApi } from "./answers";
import { SEARCH_PRESETS } from "./presets";
import type { Message } from "./types";

let msgId = 0;
function nextId() {
  return `msg-${++msgId}`;
}

export function TemplateExplorer() {
  const { theme, sz } = useTheme();
  const socket = useSocket();
  const flowId = useSessionStore((state) => state.flowId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (pendingSubmit.current && query === pendingSubmit.current) {
      pendingSubmit.current = null;
      handleSubmit();
    }
  }, [query]);

  function updateMsg(id: string, updates: Partial<Message>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }

  async function handleSubmit() {
    const text = query.trim();
    if (!text || isProcessing) return;

    setQuery("");
    setIsProcessing(true);

    const userId = nextId();
    const botId = nextId();

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", text, status: "done" },
      { id: botId, role: "bot", text: "", status: "triaging" },
    ]);

    try {
      const api = (socket as any).flow(flowId) as FlowApi;

      const { system, text: prompt } = buildTriagePrompt(text);
      const triageRaw = await api.textCompletion(system, prompt);
      const triage = parseTriageResult(triageRaw);

      updateMsg(botId, { triage, status: "searching" });

      const result = await processQuestion(
        text, triage, api,
        (status) => updateMsg(botId, { status: status as any }),
        (streamedText) => updateMsg(botId, { text: streamedText, status: "answering" }),
      );

      updateMsg(botId, {
        text: result.text,
        entityUris: result.entityUris,
        processes: result.processes,
        status: "done",
      });
    } catch (err: any) {
      updateMsg(botId, {
        status: "error",
        error: err?.message || "An error occurred",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  function handleEntityClick(uri: string) {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "detail", text: "", detailUri: uri, status: "done" },
    ]);
  }

  const pendingSubmit = useRef<string | null>(null);

  function handlePresetClick(presetQuery: string) {
    pendingSubmit.current = presetQuery;
    setQuery(presetQuery);
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "var(--page-height)", background: theme.surface.base,
    }}>
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflow: "auto",
          padding: `${sz(16)}px ${sz(24)}px`,
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: "100%", gap: sz(16),
          }}>
            <div style={{
              fontSize: sz(20), fontWeight: 600,
              fontFamily: theme.font.sans, color: theme.text.primary,
            }}>
              Office Onboarding Assistant
            </div>
            <div style={{
              fontSize: sz(13), fontFamily: theme.font.sans,
              color: theme.text.hint, textAlign: "center", maxWidth: 480,
            }}>
              Ask about service ownership, role tooling, spend approvals,
              escalation paths, or anything about your organisation.
            </div>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: sz(6),
              justifyContent: "center", marginTop: sz(8),
            }}>
              {SEARCH_PRESETS.map((p) => (
                <Badge
                  key={p.key}
                  color={theme.text.secondary}
                  size="small"
                  onClick={() => handlePresetClick(p.query)}
                >
                  {p.title}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) =>
            msg.role === "user" ? (
              <div
                key={msg.id}
                style={{
                  display: "flex", justifyContent: "flex-end",
                  marginBottom: sz(4), marginTop: sz(12),
                }}
              >
                <div style={{
                  background: theme.surface.base,
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: sz(12),
                  padding: `${sz(8)}px ${sz(14)}px`,
                  maxWidth: "80%",
                  fontSize: sz(13),
                  fontFamily: theme.font.sans,
                  color: theme.text.primary,
                }}>
                  {msg.text}
                </div>
              </div>
            ) : msg.role === "detail" && msg.detailUri ? (
              <div key={msg.id} style={{ marginBottom: sz(8) }}>
                <EntityCard entityUri={msg.detailUri} onClick={handleEntityClick} />
              </div>
            ) : (
              <div key={msg.id} style={{ marginBottom: sz(8) }}>
                <BotMessage message={msg} onEntityClick={handleEntityClick} />
              </div>
            ),
          )
        )}
      </div>

      <div style={{
        borderTop: `1px solid ${theme.border.default}`,
        padding: `${sz(8)}px ${sz(16)}px`,
      }}>
        <SearchInput
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          placeholder="Ask a question..."
          buttonText="Send"
          isLoading={isProcessing}
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}
