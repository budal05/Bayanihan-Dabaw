import Link from "next/link";
import { HandHeart, MapPin } from "lucide-react";

export function AuthFrame({ title, description, children, footer }: { title: string; description: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return <div className="auth-wrap"><section className="auth-art"><Link href="/" className="brand"><span className="brand-mark"><HandHeart size={20} /></span>Bayanihan Dabaw</Link><div className="auth-art-content"><p className="eyebrow"><MapPin size={12} />Davao City, Philippines</p><h2>Our city is better when we show up for each other.</h2><p>A place to share what’s happening nearby, ask for support, and celebrate the neighbors who make a difference.</p></div><span style={{ position: "relative", zIndex: 1, color: "#718675", fontSize: 10 }}>Community care, one story at a time.</span></section><section className="card auth-form-card"><h1 className="auth-heading">{title}</h1><p className="auth-copy">{description}</p>{children}{footer && <div className="auth-footer">{footer}</div>}</section></div>;
}
