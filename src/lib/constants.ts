export const POST_CATEGORIES = [
  "Road and Infrastructure",
  "Flooding and Disaster",
  "Garbage and Environment",
  "Missing Person or Pet",
  "Community Assistance",
  "Medical or Emergency Assistance",
  "Fundraising",
  "Community Announcement",
  "Other",
] as const;

export const REQUEST_TYPES = [
  "Report a Problem",
  "Request Help",
  "Community Update",
  "Fundraising",
  "Volunteer Activity",
] as const;

export const REPORT_REASONS = ["Abuse", "Misinformation", "Scam or misleading donation", "Impersonation", "Inappropriate image", "Other"] as const;
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const SESSION_DAYS = 14;
