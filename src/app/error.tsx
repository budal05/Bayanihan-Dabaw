"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Application error", error); }, [error]);
  return <div className="empty-state"><span className="empty-icon" style={{ color: "#a76558", background: "#fff0eb" }}><CircleAlert size={22} /></span><h1 className="empty-title">Something went wrong</h1><p className="empty-description">The page hit an unexpected problem. Try again in a moment.</p><button className="button secondary small" onClick={() => reset()}>Try again</button></div>;
}
