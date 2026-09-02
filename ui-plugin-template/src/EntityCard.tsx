import { Card, Badge, useTheme, LoadingState } from "@trustgraph/trustkit";
import { useTriples } from "@trustgraph/react-state";
import { iri, labelPred, officeIri, rdfType, OFFICE } from "./types";
import type { EntityKind } from "./types";
import type { Triple, Term } from "@trustgraph/client";
import { Portrait } from "./Portrait";
import { ProcessVisual } from "./ProcessDetail";

function LabelValue({ name, children }: { name: string; children: React.ReactNode }) {
  const { theme, sz } = useTheme();
  return (
    <div style={{ marginBottom: sz(6) }}>
      <span style={{
        fontSize: sz(11), color: theme.text.hint,
        fontFamily: theme.font.sans, fontWeight: 500,
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {name}
      </span>
      <div style={{
        fontSize: sz(13), color: theme.text.primary,
        fontFamily: theme.font.sans, marginTop: sz(2),
      }}>
        {children}
      </div>
    </div>
  );
}

function RelatedList({ entityUri, predicate, direction, fieldLabel, onClick }: {
  entityUri: string;
  predicate: string;
  direction: "out" | "in";
  fieldLabel: string;
  onClick?: (uri: string) => void;
}) {
  const { theme, sz } = useTheme();
  const s = direction === "out" ? iri(entityUri) : undefined;
  const o = direction === "in" ? iri(entityUri) : undefined;
  const { triples, isLoading } = useTriples({ s, p: officeIri(predicate), o, limit: 50 });

  const uris = triples
    .map((t) => direction === "out" ? t.o : t.s)
    .filter((term): term is Extract<Term, { t: "i" }> => term.t === "i")
    .map((term) => term.i);

  if (isLoading || uris.length === 0) return null;

  return (
    <LabelValue name={fieldLabel}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: sz(4) }}>
        {uris.map((uri) => (
          <RelatedBadge key={uri} uri={uri} onClick={onClick} />
        ))}
      </div>
    </LabelValue>
  );
}

function RelatedBadge({ uri, onClick }: { uri: string; onClick?: (uri: string) => void }) {
  const { theme, sz } = useTheme();
  const { triples } = useTriples({ s: iri(uri), p: labelPred, limit: 1 });
  const { triples: typeTriples } = useTriples({ s: iri(uri), p: rdfType, limit: 5 });

  const name = triples.length > 0 && triples[0].o.t === "l" ? triples[0].o.v : uri.split("#").pop() || uri;

  let kind: EntityKind = "Unknown";
  for (const t of typeTriples) {
    if (t.o.t === "i" && t.o.i.startsWith(OFFICE)) {
      kind = t.o.i.slice(OFFICE.length) as EntityKind;
      break;
    }
  }

  if (kind === "Person") {
    return (
      <div
        onClick={onClick ? () => onClick(uri) : undefined}
        style={{
          display: "inline-flex", alignItems: "center", gap: sz(4),
          cursor: onClick ? "pointer" : "default",
        }}
      >
        <Portrait entityUri={uri} size={20} />
        <Badge color={kindColor(kind)} size="small">{name}</Badge>
      </div>
    );
  }

  return (
    <Badge
      color={kindColor(kind)}
      size="small"
      onClick={onClick ? () => onClick(uri) : undefined}
    >
      {name}
    </Badge>
  );
}

function kindColor(kind: EntityKind): string {
  switch (kind) {
    case "Person": return "#4a9eff";
    case "Role": return "#a855f7";
    case "Team": return "#22c55e";
    case "Department": return "#14b8a6";
    case "Service": return "#f59e0b";
    case "Process": return "#ef4444";
    case "ApprovalStep": return "#f97316";
    case "Channel": return "#06b6d4";
    default: return "#6b7280";
  }
}

function LiteralField({ entityUri, predicate, fieldLabel }: {
  entityUri: string;
  predicate: string;
  fieldLabel: string;
}) {
  const { triples } = useTriples({ s: iri(entityUri), p: officeIri(predicate), limit: 1 });
  if (triples.length === 0) return null;
  const val = triples[0].o.t === "l" ? triples[0].o.v : null;
  if (!val) return null;
  return <LabelValue name={fieldLabel}>{val}</LabelValue>;
}

function SpendLimitField({ entityUri }: { entityUri: string }) {
  const { triples } = useTriples({ s: iri(entityUri), p: officeIri("spendLimit"), limit: 1 });
  if (triples.length === 0) return null;
  const val = triples[0].o.t === "l" ? triples[0].o.v : null;
  if (!val) return null;
  const num = parseFloat(val);
  const formatted = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(num);
  return <LabelValue name="Spend Limit">{formatted}</LabelValue>;
}

export function EntityCard({ entityUri, onClick }: { entityUri: string; onClick?: (uri: string) => void }) {
  const { theme, sz } = useTheme();
  const { triples: labelTriples, isLoading: lblLoading } = useTriples({ s: iri(entityUri), p: labelPred, limit: 1 });
  const { triples: typeTriples, isLoading: typeLoading } = useTriples({ s: iri(entityUri), p: rdfType, limit: 5 });

  const entityLabel = labelTriples.length > 0 && labelTriples[0].o.t === "l"
    ? labelTriples[0].o.v : entityUri.split("#").pop() || entityUri;

  let kind: EntityKind = "Unknown";
  for (const t of typeTriples) {
    if (t.o.t === "i" && t.o.i.startsWith(OFFICE)) {
      kind = t.o.i.slice(OFFICE.length) as EntityKind;
      break;
    }
  }

  if (lblLoading || typeLoading) {
    return <Card><LoadingState message="Loading..." /></Card>;
  }

  if (kind === "Unknown") return null;

  return (
    <Card style={{ marginBottom: sz(8) }}>
      <div style={{ display: "flex", alignItems: "center", gap: sz(8), marginBottom: sz(10) }}>
        {kind === "Person" && <Portrait entityUri={entityUri} size={40} />}
        <div>
          <Badge color={kindColor(kind)} size="small">{kind}</Badge>
          <div style={{
            fontSize: sz(15), fontWeight: 600,
            fontFamily: theme.font.sans, color: theme.text.primary,
            marginTop: sz(2),
          }}>
            {entityLabel}
          </div>
        </div>
      </div>

      {kind === "Person" && (
        <>
          <RelatedList entityUri={entityUri} predicate="hasRole" direction="out" fieldLabel="Role" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="memberOf" direction="out" fieldLabel="Team" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="reportsTo" direction="out" fieldLabel="Reports To" onClick={onClick} />
          <LiteralField entityUri={entityUri} predicate="email" fieldLabel="Email" />
          <LiteralField entityUri={entityUri} predicate="phoneNumber" fieldLabel="Phone" />
          <LiteralField entityUri={entityUri} predicate="joinDate" fieldLabel="Joined" />
        </>
      )}

      {kind === "Role" && (
        <>
          <RelatedList entityUri={entityUri} predicate="requiresAccess" direction="out" fieldLabel="Requires Access To" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="hasRole" direction="in" fieldLabel="People with this Role" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="approvedBy" direction="in" fieldLabel="Approves Steps" onClick={onClick} />
        </>
      )}

      {kind === "Team" && (
        <>
          <RelatedList entityUri={entityUri} predicate="belongsToDepartment" direction="out" fieldLabel="Department" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="managedBy" direction="out" fieldLabel="Manager" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="owns" direction="out" fieldLabel="Owns Services" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="associatedChannel" direction="out" fieldLabel="Channel" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="memberOf" direction="in" fieldLabel="Members" onClick={onClick} />
        </>
      )}

      {kind === "Service" && (
        <>
          <RelatedList entityUri={entityUri} predicate="associatedChannel" direction="out" fieldLabel="Support Channel" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="owns" direction="in" fieldLabel="Owned By" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="requiresAccess" direction="in" fieldLabel="Required By Roles" onClick={onClick} />
        </>
      )}

      {kind === "Process" && (
        <>
          <ProcessVisual entityUri={entityUri} />
          <RelatedList entityUri={entityUri} predicate="associatedChannel" direction="out" fieldLabel="Channel" onClick={onClick} />
        </>
      )}

      {kind === "ApprovalStep" && (
        <>
          <SpendLimitField entityUri={entityUri} />
          <RelatedList entityUri={entityUri} predicate="approvedBy" direction="out" fieldLabel="Approved By" onClick={onClick} />
          <RelatedList entityUri={entityUri} predicate="hasStep" direction="in" fieldLabel="Part of Process" onClick={onClick} />
        </>
      )}

      {kind === "Channel" && (
        <>
          <RelatedList entityUri={entityUri} predicate="associatedChannel" direction="in" fieldLabel="Used By" onClick={onClick} />
        </>
      )}

      {kind === "Department" && (
        <>
          <RelatedList entityUri={entityUri} predicate="belongsToDepartment" direction="in" fieldLabel="Teams" onClick={onClick} />
        </>
      )}
    </Card>
  );
}
