import { useTheme, Badge, LoadingState } from "@trustgraph/trustkit";
import { CompactCard } from "./CompactCard";
import { ProcessStepper } from "./ProcessStepper";
import type { Message } from "./types";

const MAX_CARDS = 5;

const STATUS_TEXT: Record<string, string> = {
  triaging: "Understanding your question...",
  searching: "Searching the knowledge graph...",
  answering: "Generating answer...",
};

function InlineParts({ text }: { text: string }) {
  const { theme } = useTheme();
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, j) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={j} style={{ color: theme.text.primary, fontWeight: 600 }}>{p.slice(2, -2)}</strong>
          : <span key={j}>{p}</span>
      )}
    </>
  );
}

function MarkdownText({ text }: { text: string }) {
  const { theme, sz } = useTheme();
  const lines = text.split("\n");

  return (
    <div style={{
      fontSize: sz(13), fontFamily: theme.font.sans,
      color: theme.text.secondary, lineHeight: 1.6,
    }}>
      {lines.map((line, i) => {
        if (line.trimStart().startsWith("- ")) {
          const content = line.trimStart().slice(2);
          return (
            <div key={i} style={{ paddingLeft: sz(12), marginBottom: sz(4) }}>
              {"• "}<InlineParts text={content} />
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} style={{ height: sz(8) }} />;
        return (
          <div key={i} style={{ marginBottom: sz(4) }}>
            <InlineParts text={line} />
          </div>
        );
      })}
    </div>
  );
}

export function BotMessage({
  message, onEntityClick,
}: {
  message: Message;
  onEntityClick: (uri: string) => void;
}) {
  const { theme, sz } = useTheme();

  const isStreaming = message.status === "answering" && !!message.text;

  if (!isStreaming && message.status !== "done" && message.status !== "error") {
    return (
      <div style={{ padding: `${sz(12)}px 0` }}>
        <LoadingState message={STATUS_TEXT[message.status] || "Thinking..."} />
      </div>
    );
  }

  if (message.status === "error") {
    return (
      <div style={{
        padding: sz(12), fontSize: sz(13),
        fontFamily: theme.font.sans, color: "#ef4444",
      }}>
        Something went wrong: {message.error || "Unknown error"}
      </div>
    );
  }

  const cardUris = message.status === "done"
    ? (message.entityUris || []).slice(0, MAX_CARDS)
    : [];

  return (
    <div style={{ padding: `${sz(8)}px 0` }}>
      {message.triage && message.triage.route !== "general" && (
        <div style={{ marginBottom: sz(8) }}>
          <Badge color="#6b7280" size="small">
            {message.triage.route.replace("-", " ")}
          </Badge>
        </div>
      )}

      {message.text && <MarkdownText text={message.text} />}

      {message.processes && message.processes.length > 0 && (
        <div style={{ marginTop: message.text ? sz(12) : 0 }}>
          {message.processes.map((proc, i) => (
            <ProcessStepper key={i} process={proc} />
          ))}
        </div>
      )}

      {cardUris.length > 0 && (
        <div style={{
          display: "flex",
          gap: sz(8),
          marginTop: sz(12),
          overflowX: "auto",
          paddingBottom: sz(4),
        }}>
          {cardUris.map((uri) => (
            <CompactCard key={uri} entityUri={uri} onClick={onEntityClick} />
          ))}
        </div>
      )}
    </div>
  );
}
