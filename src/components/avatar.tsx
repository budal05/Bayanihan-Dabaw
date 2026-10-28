import Image from "next/image";

export function Avatar({ image, name, size = "normal" }: { image?: { url?: string } | null; name: string; size?: "small" | "normal" | "large" }) {
  return <span className={`avatar${size === "small" ? " small" : size === "large" ? " large" : ""}`} aria-label={`${name} profile photo`}>
    {image?.url ? <Image src={image.url} alt="" fill sizes={size === "large" ? "86px" : size === "small" ? "33px" : "38px"} /> : name.trim().slice(0, 1).toUpperCase() || "B"}
  </span>;
}
