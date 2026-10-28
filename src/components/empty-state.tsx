import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export function EmptyState({ icon: Icon, title, description, action, href }: { icon: LucideIcon; title: string; description: string; action?: string; href?: string }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={23} strokeWidth={1.8} /></span><h2 className="empty-title">{title}</h2><p className="empty-description">{description}</p>{action && href && <Link className="button soft small" href={href}>{action}<ArrowRight size={14} /></Link>}</div>;
}
