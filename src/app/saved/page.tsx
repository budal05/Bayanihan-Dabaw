import { Bookmark } from "lucide-react";
import { SavedList } from "@/components/saved-list";

export default function SavedPage() { return <><div className="page-heading"><div><p className="eyebrow"><Bookmark size={13} />Just for you</p><h1 className="page-title">Saved posts</h1><p className="page-description">Community updates you’ve bookmarked for later.</p></div></div><SavedList /></>; }
