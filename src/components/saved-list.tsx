"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { PostCard, type PostData } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { apiRequest } from "@/lib/client";

export function SavedList() {
  const [items, setItems] = useState<PostData[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { apiRequest<{ items: PostData[] }>("/api/saved").then(({ items: value }) => setItems(value)).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load saved posts.")).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="post-skeleton"><span className="skeleton" style={{ height: 220 }} /></div>;
  if (error) return <EmptyState icon={Bookmark} title="Your saved posts are private" description={error} action="Sign in" href="/login" />;
  if (!items.length) return <EmptyState icon={Bookmark} title="Nothing saved just yet" description="Save a community update to come back to it here later." action="Explore Davao" href="/explore" />;
  return <div className="feed-list">{items.map((post) => <PostCard key={post._id} post={post} />)}</div>;
}
