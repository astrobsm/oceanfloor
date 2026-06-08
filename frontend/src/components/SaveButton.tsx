import { useState } from "react";
import { oceanStore, OceanItemKind } from "../api/ocean";

interface Props {
  kind: OceanItemKind;
  title: string;
  payload: unknown;
}

export default function SaveButton({ kind, title, payload }: Props) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      className="ghost"
      onClick={() => {
        oceanStore.save({ kind, title, payload });
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      }}
    >
      {saved ? "Saved ✓" : "Save to Knowledge Ocean"}
    </button>
  );
}
