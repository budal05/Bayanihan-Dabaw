"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bookmark, Compass, HandHeart, Home, MapPin, Plus, Search, ShieldCheck, UsersRound, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { apiRequest } from "@/lib/client";

type CurrentUser = { id: string; name: string; username: string; profileImage?: { url: string } | null; role?: string };
const items = [
  { href: "/", label: "Home feed", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/following", label: "Following", icon: UsersRound },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/saved", label: "Saved posts", icon: Bookmark },
];

function Brand() { return <span className="brand"><span className="brand-mark"><HandHeart size={20} strokeWidth={2.1} /></span><span>Bayanihan Dabaw</span></span>; }
function active(path: string, href: string) { return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`); }

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    apiRequest<{ user: CurrentUser }>("/api/auth/session").then(({ user: value }) => { if (alive) setUser(value); }).catch(() => { if (alive) setUser(null); });
    apiRequest<{ unreadCount: number }>("/api/notifications").then(({ unreadCount }) => { if (alive) setUnread(unreadCount); }).catch(() => undefined);
    const handler = () => { apiRequest<{ user: CurrentUser }>("/api/auth/session").then(({ user: value }) => { if (alive) setUser(value); }).catch(() => { if (alive) setUser(null); }); };
    window.addEventListener("bd-auth-changed", handler);
    return () => { alive = false; window.removeEventListener("bd-auth-changed", handler); };
  }, [pathname]);
  const navItems = user?.role === "admin" ? [...items, { href: "/admin", label: "Moderation", icon: ShieldCheck }] : items;
  const links = navItems.map((item) => <Link className={`nav-link${active(pathname, item.href) ? " active" : ""}`} href={item.href} key={item.href}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.href === "/notifications" && unread > 0 && <span className="nav-badge">{unread > 9 ? "9+" : unread}</span>}</Link>);
  const mobile = [items[0], items[1], { href: "/create", label: "Create", icon: Plus }, items[3], { href: user ? `/u/${user.username}` : "/login", label: "Profile", icon: UserRound }];
  return <div className="app-frame">
    <aside className="app-sidebar"><Link href="/"><Brand /></Link><nav className="sidebar-nav" aria-label="Primary navigation">{links}</nav><div className="sidebar-bottom"><Link href="/create" className="sidebar-create"><Plus size={17} />Create a report</Link>{user ? <Link className="profile-mini" href={`/u/${user.username}`}><Avatar image={user.profileImage} name={user.name} size="small" /><span className="profile-mini-info"><span className="profile-mini-name">{user.name}</span><span className="profile-mini-handle">@{user.username}</span></span><UserRound size={15} color="#879189" /></Link> : <Link href="/login" className="profile-mini"><span className="avatar small"><UserRound size={15} /></span><span className="profile-mini-info"><span className="profile-mini-name">Welcome to the community</span><span className="profile-mini-handle">Sign in to take part</span></span></Link>}</div></aside>
    <header className="topbar"><div className="topbar-note"><MapPin size={14} /><span>Davao City</span><span style={{ color: "#b8c0b9", fontWeight: 400 }}>·</span> Local voices, shared care</div><div className="topbar-actions"><Link href="/explore" className="icon-button" aria-label="Search community"><Search size={17} /></Link>{user ? <Link href={`/u/${user.username}`}><Avatar image={user.profileImage} name={user.name} size="small" /></Link> : <Link href="/login" className="button small">Sign in</Link>}</div></header>
    <header className="mobile-top"><Link href="/"><Brand /></Link><div className="topbar-actions"><Link href="/explore" className="icon-button" aria-label="Search"><Search size={18} /></Link>{user ? <Link href={`/u/${user.username}`}><Avatar image={user.profileImage} name={user.name} size="small" /></Link> : <Link href="/login" className="button small">Sign in</Link>}</div></header>
    <main className="main-region"><div className="main-grid"><div className="main-content">{children}</div><aside className="right-rail"><div className="rail-card"><p className="eyebrow" style={{ marginBottom: 8 }}><MapPin size={12} />Around Davao</p><h2 className="rail-title">A stronger community starts with a story.</h2><p className="rail-subtitle">Share what’s happening in your barangay, ask for a hand, or thank someone who showed up.</p><Link href="/create" className="button soft small" style={{ marginTop: 14 }}><Plus size={14} />Share an update</Link></div><div className="rail-card"><h2 className="rail-title">A little bayanihan goes a long way</h2><div className="rail-list"><div className="rail-tip"><span className="rail-tip-icon"><MapPin size={14} /></span><span>Add a barangay or nearby landmark so neighbors know where help is needed.</span></div><div className="rail-tip"><span className="rail-tip-icon"><ShieldCheck size={14} /></span><span>Share what you know. Community posts are not official government advisories.</span></div><div className="rail-tip"><span className="rail-tip-icon"><HandHeart size={14} /></span><span>For QR donations, double-check the recipient in your wallet app before sending.</span></div></div></div><p className="footer-note">Bayanihan Dabaw · Made for our community<br /><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p></aside></div></main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{mobile.map((item) => <Link href={item.href} key={item.href} className={`mobile-nav-link${active(pathname, item.href) ? " active" : ""}`}><item.icon strokeWidth={active(pathname, item.href) ? 2.2 : 1.8} />{item.label}</Link>)}</nav>
  </div>;
}
