import { useTheme, Badge } from "@trustgraph/trustkit";
import { useTriples } from "@trustgraph/react-state";
import { iri, labelPred, rdfType, OFFICE } from "./types";
import type { EntityKind } from "./types";
import { Portrait } from "./Portrait";

const KIND_COLORS: Record<string, string> = {
  Person: "#4a9eff",
  Role: "#a855f7",
  Team: "#22c55e",
  Department: "#14b8a6",
  Service: "#f59e0b",
  Process: "#ef4444",
  ApprovalStep: "#f97316",
  Channel: "#06b6d4",
};

export function CompactCard({ entityUri, onClick }: {
  entityUri: string;
  onClick: (uri: string) => void;
}) {
  const { theme, sz } = useTheme();
  const { triples: labelTriples } = useTriples({ s: iri(entityUri), p: labelPred, limit: 1 });
  const { triples: typeTriples } = useTriples({ s: iri(entityUri), p: rdfType, limit: 5 });

  const entityLabel = labelTriples.length > 0 && labelTriples[0].o.t === "l"
    ? labelTriples[0].o.v : entityUri.split("#").pop() || entityUri;

  let kind: EntityKind = "Unknown";
  for (const t of typeTriples) {
    if (t.o.t === "i" && t.o.i.startsWith(OFFICE)) {
      kind = t.o.i.slice(OFFICE.length) as EntityKind;
      break;
    }
  }

  if (kind === "Unknown") return null;

  const color = KIND_COLORS[kind] || "#6b7280";

  return (
    <div
      onClick={() => onClick(entityUri)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sz(4),
        padding: `${sz(8)}px ${sz(12)}px`,
        border: `1px solid ${theme.border.default}`,
        borderRadius: sz(8),
        cursor: "pointer",
        minWidth: sz(120),
        maxWidth: sz(200),
        background: theme.surface.base,
      }}
    >
      {kind === "Person" && <Portrait entityUri={entityUri} size={28} />}
      <Badge color={color} size="small">{kind}</Badge>
      <div style={{
        fontSize: sz(12),
        fontFamily: theme.font.sans,
        fontWeight: 500,
        color: theme.text.primary,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {entityLabel}
      </div>
    </div>
  );
}
