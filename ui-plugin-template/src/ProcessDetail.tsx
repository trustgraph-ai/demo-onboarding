import { useTheme } from "@trustgraph/trustkit";
import { useTriples } from "@trustgraph/react-state";
import { iri, labelPred, officeIri } from "./types";
import type { Term } from "@trustgraph/client";

function useLabel(uri: string): string {
  const { triples } = useTriples({ s: iri(uri), p: labelPred, limit: 1 });
  return triples.length > 0 && triples[0].o.t === "l"
    ? triples[0].o.v : uri.split("#").pop() || uri;
}

export function ProcessVisual({ entityUri }: { entityUri: string }) {
  const { theme, sz } = useTheme();
  const processName = useLabel(entityUri);

  const { triples: stepTriples, isLoading } = useTriples({
    s: iri(entityUri), p: officeIri("hasStep"), limit: 20,
  });

  const stepUris = stepTriples
    .map((t) => t.o)
    .filter((term): term is Extract<Term, { t: "i" }> => term.t === "i")
    .map((term) => term.i);

  if (isLoading || stepUris.length === 0) return null;

  return (
    <div style={{ marginTop: sz(8) }}>
      <div style={{
        display: "flex", alignItems: "flex-start",
        overflowX: "auto", paddingBottom: sz(4), gap: 0,
      }}>
        {stepUris.map((uri, i) => (
          <VisualStep key={uri} stepUri={uri} index={i} isLast={i === stepUris.length - 1} />
        ))}
      </div>
    </div>
  );
}

function VisualStep({ stepUri, index, isLast }: {
  stepUri: string;
  index: number;
  isLast: boolean;
}) {
  const { theme, sz } = useTheme();
  const stepName = useLabel(stepUri);

  const { triples: limitTriples } = useTriples({
    s: iri(stepUri), p: officeIri("spendLimit"), limit: 1,
  });
  const spendLimit = limitTriples.length > 0 && limitTriples[0].o.t === "l"
    ? parseFloat(limitTriples[0].o.v) : 0;

  const { triples: approverTriples } = useTriples({
    s: iri(stepUri), p: officeIri("approvedBy"), limit: 5,
  });
  const approverRoleUris = approverTriples
    .map((t) => t.o)
    .filter((term): term is Extract<Term, { t: "i" }> => term.t === "i")
    .map((term) => term.i);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{
        border: `2px solid #f97316`,
        borderRadius: sz(10),
        padding: `${sz(10)}px ${sz(14)}px`,
        minWidth: sz(160),
        background: theme.surface.base,
      }}>
        <div style={{
          fontSize: sz(10), fontWeight: 600, color: "#f97316",
          fontFamily: theme.font.sans, textTransform: "uppercase",
          letterSpacing: "0.05em", marginBottom: sz(4),
        }}>
          Step {index + 1}
        </div>
        <div style={{
          fontSize: sz(13), fontWeight: 600, color: theme.text.primary,
          fontFamily: theme.font.sans, marginBottom: sz(6),
        }}>
          {stepName}
        </div>
        {spendLimit > 0 && (
          <div style={{
            fontSize: sz(11), color: theme.text.secondary,
            fontFamily: theme.font.mono, marginBottom: sz(4),
          }}>
            up to {fmt(spendLimit)}
          </div>
        )}
        {approverRoleUris.map((uri) => (
          <ApproverLabel key={uri} roleUri={uri} />
        ))}
      </div>

      {!isLast && (
        <div style={{
          display: "flex", alignItems: "center",
          padding: `0 ${sz(4)}px`, color: theme.text.hint,
          fontSize: sz(16),
        }}>
          →
        </div>
      )}
    </div>
  );
}

function ApproverLabel({ roleUri }: { roleUri: string }) {
  const { theme, sz } = useTheme();
  const roleName = useLabel(roleUri);

  const { triples: personTriples } = useTriples({
    p: officeIri("hasRole"), o: iri(roleUri), limit: 50,
  });
  const personUris = personTriples
    .map((t) => t.s)
    .filter((term): term is Extract<Term, { t: "i" }> => term.t === "i")
    .map((term) => term.i);

  return (
    <div>
      <div style={{
        fontSize: sz(11), color: theme.text.hint,
        fontFamily: theme.font.sans,
      }}>
        {roleName}
      </div>
      {personUris.map((uri) => (
        <PersonName key={uri} uri={uri} />
      ))}
    </div>
  );
}

function PersonName({ uri }: { uri: string }) {
  const { theme, sz } = useTheme();
  const name = useLabel(uri);
  return (
    <div style={{
      fontSize: sz(11), color: theme.text.secondary,
      fontFamily: theme.font.sans,
    }}>
      {name}
    </div>
  );
}
