"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileWarning } from "lucide-react";
import { PostCard, type PostData } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { apiRequest } from "@/lib/client";

export function PostDetail({ id }: { id: string }) {
  const [post, setPost] = useState<PostData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { let alive = true; apiRequest<{ post: PostData }>(`/api/posts/${id}`).then(({ post: value }) => { if (alive) setPost(value); }).catch((caught) => { if (alive) setError(caught instanceof Error ? caught.message : "Could not load this community post."); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, [id]);
  if (loading) return <div className="post-skeleton"><span className="skeleton" style={{ height: 280 }} /></div>;
  if (error || !post) return <><div className="page-heading"><Link href="/" className="button secondary small"><ArrowLeft size={14} />Back to feed</Link></div><EmptyState icon={FileWarning} title="We couldn’t find this post" description={error || "It may have been removed or the link may be incorrect."} action="Explore community updates" href="/explore" /></>;
  return <><div className="page-heading"><div><p className="eyebrow">Community post · Davao City</p><h1 className="page-title">Community update</h1><p className="page-description">A post shared by a community member. Reports are not automatically verified.</p></div><Link href={`/u/${post.authorId.username}`} className="button secondary small"><ArrowLeft size={14} />View profile</Link></div><PostCard post={post} /></>;
}
