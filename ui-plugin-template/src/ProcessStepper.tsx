import { useTheme } from "@trustgraph/trustkit";
import type { ProcessData } from "./types";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

function StepCard({ step, index, isLast, passed }: {
  step: ProcessData["steps"][number];
  index: number;
  isLast: boolean;
  passed: boolean;
}) {
  const { theme, sz } = useTheme();
  const borderColor = passed ? "#22c55e" : "#f97316";

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{
        border: `2px solid ${borderColor}`,
        borderRadius: sz(10),
        padding: `${sz(10)}px ${sz(14)}px`,
        minWidth: sz(160),
        background: theme.surface.base,
      }}>
        <div style={{
          fontSize: sz(10), fontWeight: 600, color: borderColor,
          fontFamily: theme.font.sans, textTransform: "uppercase",
          letterSpacing: "0.05em", marginBottom: sz(4),
        }}>
          Step {index + 1}
        </div>
        <div style={{
          fontSize: sz(13), fontWeight: 600, color: theme.text.primary,
          fontFamily: theme.font.sans, marginBottom: sz(6),
        }}>
          {step.stepName}
        </div>
        {step.spendLimit > 0 && (
          <div style={{
            fontSize: sz(11), color: theme.text.secondary,
            fontFamily: theme.font.mono, marginBottom: sz(4),
          }}>
            up to {fmt(step.spendLimit)}
          </div>
        )}
        <div style={{
          fontSize: sz(11), color: theme.text.hint,
          fontFamily: theme.font.sans,
        }}>
          {step.approverRole}
        </div>
        {step.approverNames.length > 0 && (
          <div style={{
            fontSize: sz(11), color: theme.text.secondary,
            fontFamily: theme.font.sans, marginTop: sz(2),
          }}>
            {step.approverNames.join(", ")}
          </div>
        )}
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

export function ProcessStepper({ process }: { process: ProcessData }) {
  const { theme, sz } = useTheme();

  return (
    <div style={{ marginBottom: sz(12) }}>
      <div style={{
        fontSize: sz(14), fontWeight: 600, color: theme.text.primary,
        fontFamily: theme.font.sans, marginBottom: sz(10),
      }}>
        {process.processName}
        {process.amount !== undefined && (
          <span style={{ fontWeight: 400, color: theme.text.secondary, marginLeft: sz(8) }}>
            for {fmt(process.amount)}
          </span>
        )}
      </div>
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        overflowX: "auto",
        paddingBottom: sz(4),
      }}>
        {process.steps.map((step, i) => (
          <StepCard
            key={i}
            step={step}
            index={i}
            isLast={i === process.steps.length - 1}
            passed={process.amount !== undefined && step.spendLimit < process.amount}
          />
        ))}
      </div>
    </div>
  );
}
