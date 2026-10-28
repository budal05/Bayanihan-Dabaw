"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Compass, MapPin, Search, UsersRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Feed } from "@/components/feed";
import { apiRequest, toast } from "@/lib/client";
import { POST_CATEGORIES, REQUEST_TYPES } from "@/lib/constants";

type Person = { _id: string; name: string; username: string; profileImage?: { url: string } | null; bio?: string; isFollowing: boolean };
export function ExploreClient() {
  const [query, setQuery] = useState(""); const [debounced, setDebounced] = useState(""); const [category, setCategory] = useState(""); const [location, setLocation] = useState(""); const [type, setType] = useState(""); const [sort, setSort] = useState<"latest" | "popular">("latest"); const [users, setUsers] = useState<Person[]>([]); const [searching, setSearching] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(query.trim()), 300); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => {
    if (!debounced) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      if (!alive) return;
      setSearching(true);
      apiRequest<{ items: Person[] }>(`/api/users?q=${encodeURIComponent(debounced)}`).then(({ items }) => { if (alive) setUsers(items); }).catch(() => { if (alive) setUsers([]); }).finally(() => { if (alive) setSearching(false); });
    }, 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [debounced]);
  const follow = async (person: Person) => {
    const active = !person.isFollowing; setUsers((items) => items.map((item) => item._id === person._id ? { ...item, isFollowing: active } : item));
    try { await apiRequest(`/api/users/${person._id}/follow`, { method: "POST", body: JSON.stringify({ active }) }); }
    catch (error) { setUsers((items) => items.map((item) => item._id === person._id ? { ...item, isFollowing: !active } : item)); toast(error instanceof Error ? error.message : "Could not update this follow.", "error"); }
  };
  return <>
    <div className="page-heading"><div><p className="eyebrow"><Compass size={13} />Discover local voices</p><h1 className="page-title">Explore Davao</h1><p className="page-description">Find community stories, people to follow, and recent reports around the city.</p></div></div>
    <div className="search-row"><div className="search-wrap"><Search size={16} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, posts, or topics" aria-label="Search community" /></div></div>
    {debounced && <section aria-label="People search results" style={{ marginTop: 15 }}><h2 className="form-section-title"><UsersRound size={14} style={{ verticalAlign: "middle", marginRight: 5 }} />Community members {searching && <span className="field-hint">Searching…</span>}</h2>{users.length ? <div className="results-list">{users.map((person) => <div className="user-result" key={person._id}><Link href={`/u/${person.username}`}><Avatar image={person.profileImage} name={person.name} /></Link><Link className="user-result-main" href={`/u/${person.username}`}><div className="user-result-name">{person.name}</div><div className="user-result-handle">@{person.username}{person.bio ? ` · ${person.bio}` : ""}</div></Link><button className={`button small${person.isFollowing ? " secondary" : " soft"}`} onClick={() => void follow(person)}>{person.isFollowing ? "Following" : "Follow"}</button></div>)}</div> : !searching && <p className="field-hint" style={{ margin: "10px 0" }}>No matching community members.</p>}</section>}
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 9, marginTop: 19 }}><h2 className="form-section-title">Community posts</h2><div className="feed-tabs"><button className={`feed-tab${sort === "latest" ? " active" : ""}`} onClick={() => setSort("latest")}>Latest</button><button className={`feed-tab${sort === "popular" ? " active" : ""}`} onClick={() => setSort("popular")}>Popular</button></div></div>
    <div className="filter-row" aria-label="Filter community posts"><button className={`filter-chip${!category ? " active" : ""}`} onClick={() => setCategory("")}>All reports</button>{POST_CATEGORIES.map((item) => <button key={item} className={`filter-chip${category === item ? " active" : ""}`} onClick={() => setCategory(category === item ? "" : item)}>{item}</button>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(110px,170px)", gap: 8, marginBottom: 13 }}><label className="search-wrap"><MapPin size={15} /><input className="input" value={location} onChange={(event) => setLocation(event.target.value)} maxLength={60} placeholder="Filter by barangay or area" aria-label="Filter by location" /></label><select className="select" value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by update type"><option value="">All types</option>{REQUEST_TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
    <Feed key={`${debounced}|${category}|${location}|${type}|${sort}`} query={debounced} category={category} location={location} type={type} mode={sort} />
    <p className="field-hint" style={{ marginTop: 14, textAlign: "center" }}><ArrowUpRight size={12} style={{ verticalAlign: "middle" }} /> Popular is sorted by likes, then comments, then newest first. No live map or official verification is implied.</p>
  </>;
}
