import { FollowList } from "@/components/follow-list";
export default async function FollowingUsersPage({ params }: { params: Promise<{ username: string }> }) { const { username } = await params; return <FollowList username={username} kind="following" />; }
