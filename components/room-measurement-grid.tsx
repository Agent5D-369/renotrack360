"use client";

import { useEffect, useRef } from "react";

const fields = ["length", "width", "sqft", "windows", "doors", "outlets", "switches"] as const;

export function RoomMeasurementGrid({ prefix, inputClassName }: { prefix: string; inputClassName: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const length = root.querySelector<HTMLInputElement>(`input[name="${prefix}.length"]`);
    const width = root.querySelector<HTMLInputElement>(`input[name="${prefix}.width"]`);
    const sqft = root.querySelector<HTMLInputElement>(`input[name="${prefix}.sqft"]`);
    if (!length || !width || !sqft) return;
    const calculate = () => {
      const l = Number(length.value);
      const w = Number(width.value);
      if (l > 0 && w > 0 && !sqft.dataset.manual) sqft.value = String(Math.round(l * w * 100) / 100);
    };
    sqft.addEventListener("input", () => {
      sqft.dataset.manual = "true";
    });
    length.addEventListener("input", calculate);
    width.addEventListener("input", calculate);
    return () => {
      length.removeEventListener("input", calculate);
      width.removeEventListener("input", calculate);
    };
  }, [prefix]);

  return (
    <div ref={rootRef} className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {fields.map((field) => (
        <label key={field} className="grid gap-1 text-xs font-bold uppercase text-muted-foreground">
          {field}
          <input name={`${prefix}.${field}`} type="number" min="0" step="0.01" className={inputClassName} />
        </label>
      ))}
    </div>
  );
}
