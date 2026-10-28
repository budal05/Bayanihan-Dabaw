"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/client";
import { PostCard, type PostData } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { MessageCircle } from "lucide-react";

type FeedResponse = { items: PostData[]; nextCursor: string | null };
export function Feed({ query = "", category = "", location = "", type = "", mode = "latest", userId = "", compact = false }: { query?: string; category?: string; location?: string; type?: string; mode?: "latest" | "following" | "popular"; userId?: string; compact?: boolean }) {
  const [items, setItems] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const requestPage = useCallback(async (next: string | null, reset = false) => {
    if (reset) { setLoading(true); setError(""); }
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (location) params.set("location", location);
      if (type) params.set("type", type);
      if (userId) params.set("userId", userId);
      if (mode === "following") params.set("following", "1");
      if (mode === "popular") params.set("sort", "popular");
      if (next) params.set("cursor", next);
      const response = await apiRequest<FeedResponse>(`/api/posts?${params}`);
      setItems((current) => reset ? response.items : [...current, ...response.items]);
      setCursor(response.nextCursor); setHasMore(Boolean(response.nextCursor));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load community posts."); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [query, category, location, type, mode, userId]);
  useEffect(() => { const timer = window.setTimeout(() => { void requestPage(null, true); }, 0); return () => window.clearTimeout(timer); }, [requestPage]);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || loadingMore || loading) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting && cursor) void requestPage(cursor); }, { rootMargin: "500px" });
    observer.observe(node); return () => observer.disconnect();
  }, [cursor, hasMore, loadingMore, loading, requestPage]);
  if (loading) return <div className="feed-list" aria-label="Loading community posts">{[0, 1, 2].map((item) => <div className="post-skeleton" key={item}><div style={{ display: "flex", gap: 10 }}><span className="skeleton" style={{ width: 38, height: 38, borderRadius: "50%" }} /><span style={{ flex: 1, display: "grid", gap: 7, alignContent: "center" }}><span className="skeleton" style={{ width: "31%", height: 9 }} /><span className="skeleton" style={{ width: "20%", height: 7 }} /></span></div><span className="skeleton" style={{ width: "83%", height: 12 }} /><span className="skeleton" style={{ width: "100%", height: compact ? 120 : 210 }} /></div>)}</div>;
  if (error) return <div className="empty-state"><span className="empty-icon" style={{ color: "#a76558", background: "#fff0eb" }}><CircleAlert size={22} /></span><h2 className="empty-title">We couldn’t load the community feed</h2><p className="empty-description">{error}. If you’re setting up the site, check the database configuration and try again.</p><button className="button secondary small" onClick={() => void requestPage(null, true)}><RefreshCw size={14} />Try again</button></div>;
  if (!items.length) return <EmptyState icon={MessageCircle} title={mode === "following" ? "Your Following feed is quiet" : "No community posts yet"} description={mode === "following" ? "Follow people around Davao to see their updates here, or browse the latest community posts." : "Be the first to share a community update, ask for a hand, or celebrate a little win."} action={mode === "following" ? "Explore the community" : "Create a report"} href={mode === "following" ? "/explore" : "/create"} />;
  return <><div className="feed-list">{items.map((post) => <PostCard post={post} key={String(post._id)} />)}</div>{hasMore && <div className="load-more"><button className="button secondary small" disabled={loadingMore} onClick={() => cursor && void requestPage(cursor)}>{loadingMore ? "Loading…" : "Load more"}</button></div>}<div ref={sentinel} aria-hidden="true" style={{ height: 1 }} />{!hasMore && <p className="footer-note">You’re all caught up with community updates.</p>}</>;
}
