import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { ToastRegion } from "@/components/toast";

export const metadata: Metadata = {
  title: { default: "Bayanihan Dabaw — Together, we care for our community", template: "%s | Bayanihan Dabaw" },
  description: "A community space for Davao City to share local updates, ask for help, and show up for one another.",
  applicationName: "Bayanihan Dabaw",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ToastRegion /><AppShell>{children}</AppShell></body></html>;
}
