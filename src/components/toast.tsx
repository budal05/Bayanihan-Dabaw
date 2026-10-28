"use client";

import { Check, CircleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

type Toast = { id: number; message: string; kind: "success" | "error" };
export function ToastRegion() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; kind?: "success" | "error" }>).detail;
      const id = Date.now() + Math.random();
      setItems((current) => [...current, { id, message: detail.message, kind: detail.kind ?? "success" }]);
      window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4300);
    };
    window.addEventListener("bd-toast", handle);
    return () => window.removeEventListener("bd-toast", handle);
  }, []);
  return <div className="toast-region" aria-live="polite">{items.map((item) => <div className={`toast${item.kind === "error" ? " error" : ""}`} key={item.id}><span>{item.kind === "error" ? <CircleAlert size={15} /> : <Check size={15} />}</span><span style={{ flex: 1 }}>{item.message}</span><button className="icon-button" style={{ width: 23, height: 23 }} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} aria-label="Dismiss message"><X size={13} /></button></div>)}</div>;
}
