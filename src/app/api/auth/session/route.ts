import { api, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export const GET = api(async () => {
  const user = await requireUser();
  return json({ user: { id: String(user._id), name: user.name, username: user.username, email: user.email, bio: user.bio, profileImage: user.profileImage, donationWallet: user.donationWallet, role: user.role } });
});
