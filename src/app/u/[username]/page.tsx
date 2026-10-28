import { ProfilePage } from "@/components/profile-page";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) { const { username } = await params; return <ProfilePage username={username} />; }
