import { connectDB } from "@/lib/db";
import { Follow, Post, User } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { api, json, readBody, assertSameOrigin, ApiError } from "@/lib/http";
import { profileSchema } from "@/lib/schemas";
import { validateOwnedImage } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";

export const GET = api(async () => {
  const user = await requireUser();
  await connectDB();
  const [followers, following, posts] = await Promise.all([Follow.countDocuments({ followingId: user._id }), Follow.countDocuments({ followerId: user._id }), Post.countDocuments({ authorId: user._id })]);
  return json({ user: { id: String(user._id), name: user.name, username: user.username, email: user.email, bio: user.bio, profileImage: user.profileImage, donationWallet: user.donationWallet, role: user.role }, counts: { followers, following, posts } });
});

export const PATCH = api(async (request) => {
  assertSameOrigin(request);
  const current = await requireUser();
  await rateLimit(request, "profile-update", 60, 60 * 60 * 1000);
  const input = await readBody(request, profileSchema);
  if (input.profileImage) validateOwnedImage(input.profileImage, String(current._id));
  if (input.donationWallet?.enabled && input.donationWallet.qrImage) validateOwnedImage(input.donationWallet.qrImage, String(current._id));
  const user = await User.findById(current._id);
  if (!user) throw new ApiError(404, "Account not found.");
  if (input.username && input.username !== user.username) {
    const exists = await User.exists({ username: input.username, _id: { $ne: user._id } });
    if (exists) throw new ApiError(409, "That username is already in use.");
  }
  if (input.name) user.nameSearch = input.name.toLowerCase();
  Object.assign(user, input);
  await user.save();
  return json({ user: { id: String(user._id), name: user.name, username: user.username, email: user.email, bio: user.bio, profileImage: user.profileImage, donationWallet: user.donationWallet, role: user.role } });
});
