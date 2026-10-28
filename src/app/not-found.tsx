import { MapPinOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() { return <EmptyState icon={MapPinOff} title="This page wandered off" description="The page may have moved, or the link may not be right. Head back to the community feed to find your way." action="Go to the community feed" href="/" />; }
