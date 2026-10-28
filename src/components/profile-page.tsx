"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag, Settings, UserRoundPlus, UserRoundCheck, UsersRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Feed } from "@/components/feed";
import { EmptyState } from "@/components/empty-state";
import { ReportDialog } from "@/components/report-dialog";
import { apiRequest, toast } from "@/lib/client";

type Profile = { _id: string; name: string; username: string; bio?: string; profileImage?: { url: string } | null; createdAt?: string; isFollowing: boolean; isSelf: boolean };
export function ProfilePage({ username }: { username: string }) {
  const [profile, setProfile] = useState<Profile | null>(null); const [counts, setCounts] = useState({ posts: 0, followers: 0, following: 0 }); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [reporting, setReporting] = useState(false);
  useEffect(() => { let alive = true; apiRequest<{ user: Profile; counts: typeof counts }>(`/api/users/${encodeURIComponent(username)}`).then((result) => { if (alive) { setProfile(result.user); setCounts(result.counts); } }).catch((caught) => { if (alive) setError(caught instanceof Error ? caught.message : "Could not load this profile."); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, [username]);
  const follow = async () => {
    if (!profile) return;
    const active = !profile.isFollowing; setProfile({ ...profile, isFollowing: active }); setCounts((value) => ({ ...value, followers: Math.max(0, value.followers + (active ? 1 : -1)) }));
    try { const result = await apiRequest<{ counts: { followers: number } }>(`/api/users/${profile._id}/follow`, { method: "POST", body: JSON.stringify({ active }) }); setCounts((value) => ({ ...value, followers: result.counts.followers })); }
    catch (caught) { setProfile({ ...profile, isFollowing: !active }); setCounts((value) => ({ ...value, followers: Math.max(0, value.followers + (active ? -1 : 1)) })); toast(caught instanceof Error ? caught.message : "Could not update follow.", "error"); }
  };
  if (loading) return <><div className="page-heading"><span className="skeleton" style={{ width: 190, height: 26 }} /></div><div className="post-skeleton"><span className="skeleton" style={{ height: 100 }} /></div></>;
  if (error || !profile) return <EmptyState icon={UsersRound} title="We couldn’t find this profile" description={error || "This community member may have changed their username."} action="Explore the community" href="/explore" />;
  return <><div className="card profile-banner"><div className="profile-top"><Avatar image={profile.profileImage} name={profile.name} size="large" /><div className="profile-info"><h1 className="profile-name">{profile.name}</h1><p className="profile-handle">@{profile.username}{profile.createdAt && <> · Joined {new Date(profile.createdAt).toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</>}</p>{profile.bio && <p className="profile-bio">{profile.bio}</p>}</div>{profile.isSelf ? <Link href="/settings" className="button secondary small"><Settings size={14} />Edit profile</Link> : <div style={{ display: "flex", gap: 6 }}><button className={`button small${profile.isFollowing ? " secondary" : ""}`} onClick={() => void follow()}>{profile.isFollowing ? <UserRoundCheck size={14} /> : <UserRoundPlus size={14} />}{profile.isFollowing ? "Following" : "Follow"}</button><button className="icon-button" aria-label="Report this account" onClick={() => setReporting(true)}><Flag size={15} /></button></div>}</div><div className="profile-stats"><span className="profile-stat"><strong>{counts.posts.toLocaleString()}</strong> posts</span><Link className="profile-stat" href={`/u/${profile.username}/followers`}><strong>{counts.followers.toLocaleString()}</strong> followers</Link><Link className="profile-stat" href={`/u/${profile.username}/following`}><strong>{counts.following.toLocaleString()}</strong> following</Link></div></div><div className="profile-tabs"><button className="profile-tab active">Community posts</button><Link href={`/u/${profile.username}/followers`} className="profile-tab"><UsersRound size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />Followers</Link></div><Feed key={profile._id} userId={profile._id} />{reporting && <ReportDialog targetType="user" targetId={profile._id} title={`Report @${profile.username}`} onClose={() => setReporting(false)} />}</>;
}
