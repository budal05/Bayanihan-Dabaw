import { UsersRound } from "lucide-react";
import { Feed } from "@/components/feed";

export default function FollowingPage() {
  return <><div className="page-heading"><div><p className="eyebrow"><UsersRound size={13} />People you follow</p><h1 className="page-title">Following</h1><p className="page-description">Updates from neighbors and community voices you follow.</p></div></div><Feed mode="following" /></>;
}
