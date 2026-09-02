import { useState } from "react";
import { useTheme } from "@trustgraph/trustkit";
import { OFFICE } from "./types";

const PORTRAITS_BASE = "https://raw.githubusercontent.com/trustgraph-ai/demo-onboarding/master/portraits";

export function portraitUrl(entityUri: string): string | null {
  if (!entityUri.startsWith(OFFICE)) return null;
  const id = entityUri.slice(OFFICE.length);
  if (!id.startsWith("Person_")) return null;
  return `${PORTRAITS_BASE}/${id}.png`;
}

export function Portrait({ entityUri, size = 32 }: { entityUri: string; size?: number }) {
  const { sz } = useTheme();
  const [failed, setFailed] = useState(false);
  const url = portraitUrl(entityUri);

  if (!url || failed) return null;

  const px = sz(size);
  return (
    <img
      src={url}
      alt=""
      onError={() => setFailed(true)}
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  );
}
