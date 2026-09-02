import { useState } from "react";
import { useTheme } from "@trustgraph/trustkit";
import { useTriples } from "@trustgraph/react-state";
import { iri, thumbnailPred } from "./types";
import type { Term } from "@trustgraph/client";

export function Portrait({ entityUri, size = 32 }: { entityUri: string; size?: number }) {
  const { sz } = useTheme();
  const [failed, setFailed] = useState(false);
  const { triples } = useTriples({ s: iri(entityUri), p: thumbnailPred, limit: 1 });

  const obj = triples.length > 0 ? triples[0].o : null;
  const url = obj
    ? obj.t === "i" ? obj.i : obj.t === "l" ? obj.v : null
    : null;

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
