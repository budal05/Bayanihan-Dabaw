"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, UserRoundPlus, UserRoundCheck, UsersRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { apiRequest, toast } from "@/lib/client";

type Person = { _id: string; name: string; username: string; profileImage?: { url: string } | null; isFollowing: boolean };
export function FollowList({ username, kind }: { username: string; kind: "followers" | "following" }) {
  const [items, setItems] = useState<Person[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { let alive = true; apiRequest<{ items: Person[] }>(`/api/users/${encodeURIComponent(username)}/${kind}`).then(({ items: value }) => { if (alive) setItems(value); }).catch((caught) => { if (alive) setError(caught instanceof Error ? caught.message : "Could not load this list."); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, [username, kind]);
  const toggle = async (person: Person) => { const active = !person.isFollowing; setItems((list) => list.map((item) => item._id === person._id ? { ...item, isFollowing: active } : item)); try { await apiRequest(`/api/users/${person._id}/follow`, { method: "POST", body: JSON.stringify({ active }) }); } catch (caught) { setItems((list) => list.map((item) => item._id === person._id ? { ...item, isFollowing: !active } : item)); toast(caught instanceof Error ? caught.message : "Could not update follow.", "error"); } };
  return <><div className="page-heading"><div><p className="eyebrow"><UsersRound size={13} />Community connections</p><h1 className="page-title">{kind === "followers" ? "Followers" : "Following"}</h1><p className="page-description">@{username}’s community connections.</p></div><Link href={`/u/${username}`} className="button secondary small"><ArrowLeft size={14} />Back to profile</Link></div>{loading ? <div className="post-skeleton"><span className="skeleton" style={{ height: 100 }} /></div> : error ? <EmptyState icon={UsersRound} title="Couldn’t load this list" description={error} action="Sign in" href="/login" /> : items.length ? <div className="results-list">{items.map((person) => <div className="user-result" key={person._id}><Link href={`/u/${person.username}`}><Avatar image={person.profileImage} name={person.name} /></Link><Link href={`/u/${person.username}`} className="user-result-main"><div className="user-result-name">{person.name}</div><div className="user-result-handle">@{person.username}</div></Link><button className={`button small${person.isFollowing ? " secondary" : " soft"}`} onClick={() => void toggle(person)}>{person.isFollowing ? <UserRoundCheck size={13} /> : <UserRoundPlus size={13} />}{person.isFollowing ? "Following" : "Follow"}</button></div>)}</div> : <EmptyState icon={UsersRound} title="No community connections yet" description="When neighbors connect with this profile, they’ll appear here." />}</>;
}
