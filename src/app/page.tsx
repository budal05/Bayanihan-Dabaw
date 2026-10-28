"use client";

import { useState } from "react";
import { HeartHandshake, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Feed } from "@/components/feed";

export default function HomePage() {
  const [mode, setMode] = useState<"latest" | "following">("latest");
  return <>
    <div className="page-heading"><div><p className="eyebrow"><Sparkles size={13} />Your neighborhood, together</p><h1 className="page-title">Community updates</h1><p className="page-description">What’s happening across Davao, shared by the people who call it home.</p></div><Link href="/create" className="button"><Plus size={16} />Create a report</Link></div>
    <div className="feed-intro"><div className="feed-intro-copy"><span className="feed-intro-icon"><HeartHandshake size={18} /></span><div><p className="feed-intro-title">A little help can change someone’s day.</p><p className="feed-intro-text">Share a local update, lend a hand, or celebrate good news.</p></div></div><div className="feed-tabs" role="tablist" aria-label="Feed type"><button className={`feed-tab${mode === "latest" ? " active" : ""}`} role="tab" aria-selected={mode === "latest"} onClick={() => setMode("latest")}>Latest</button><button className={`feed-tab${mode === "following" ? " active" : ""}`} role="tab" aria-selected={mode === "following"} onClick={() => setMode("following")}>Following</button></div></div>
    <Feed key={mode} mode={mode} />
  </>;
}
