"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle, X, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest, toast } from "@/lib/client";
import type { ImageRecord } from "@/lib/media";

type Signature = { cloudName: string; apiKey: string; timestamp: number; publicId: string; signature: string; params: Record<string, string | number | boolean>; maxBytes: number; allowedTypes: string[] };

function uploadToCloudinary(file: File, signature: Signature, onProgress: (percent: number) => void) {
  return new Promise<ImageRecord>((resolve, reject) => {
    const data = new FormData();
    data.append("file", file);
    data.append("api_key", signature.apiKey);
    data.append("timestamp", String(signature.timestamp));
    data.append("public_id", signature.publicId);
    data.append("signature", signature.signature);
    for (const [key, value] of Object.entries(signature.params)) data.append(key, String(value));
    const request = new XMLHttpRequest();
    request.open("POST", `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`);
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onerror = () => reject(new Error("Photo upload failed. Please check your connection and try again."));
    request.onload = () => {
      const response = JSON.parse(request.responseText || "{}") as { secure_url?: string; public_id?: string; width?: number; height?: number; error?: { message?: string } };
      if (request.status < 200 || request.status >= 300 || !response.secure_url || !response.public_id) return reject(new Error(response.error?.message ?? "Photo upload failed. Please try again."));
      resolve({ url: response.secure_url, publicId: response.public_id, width: response.width, height: response.height });
    };
    request.send(data);
  });
}

export function ImageUploader({ images, onChange, purpose, max = 5, label = "Add community photos" }: { images: ImageRecord[]; onChange: (images: ImageRecord[]) => void; purpose: "profile" | "posts" | "donations"; max?: number; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState("");
  useEffect(() => { imagesRef.current = images; }, [images]);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/") || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast("Choose a JPG, PNG, or WebP photo.", "error"); return; }
    if (file.size > 8 * 1024 * 1024) { toast("Photos need to be 8 MB or smaller.", "error"); return; }
    setBusy(true); setProgress(0); setCurrentName(file.name);
    const url = URL.createObjectURL(file); setLocalPreview(url);
    try {
      const signature = await apiRequest<Signature>("/api/upload/signature", { method: "POST", body: JSON.stringify({ purpose }) });
      const image = await uploadToCloudinary(file, signature, setProgress);
      const updated = [...imagesRef.current, image];
      imagesRef.current = updated;
      onChange(updated);
      toast("Photo uploaded.");
    } catch (error) { toast(error instanceof Error ? error.message : "Photo upload failed.", "error"); }
    finally { URL.revokeObjectURL(url); setLocalPreview(null); setCurrentName(""); setBusy(false); setProgress(0); if (inputRef.current) inputRef.current.value = ""; }
  };

  return <div>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} className="sr-only" aria-label={label} onChange={(event) => { const files = [...(event.target.files ?? [])]; const remaining = max - images.length; if (files.length > remaining) toast(`You can add up to ${max} photos.`, "error"); const selected = files.slice(0, Math.max(0, remaining)); if (selected.length > 1) { void (async () => { for (const file of selected) await upload(file); })(); } else if (selected[0]) void upload(selected[0]); }} />
    {images.length < max && <button type="button" className="upload-zone" style={{ width: "100%" }} disabled={busy} onClick={() => inputRef.current?.click()}>
      {busy ? <LoaderCircle size={21} className="animate-spin" /> : <span className="empty-icon" style={{ width: 35, height: 35, margin: 0, borderRadius: 11 }}><ImagePlus size={17} /></span>}
      <span style={{ color: "#53665a", fontSize: 11, fontWeight: 700 }}>{busy ? `Uploading ${currentName}` : label}</span>
      <span className="field-hint">JPG, PNG or WebP · up to 8 MB per photo · {images.length}/{max}</span>
      {busy && <span className="progress-track" style={{ width: "75%" }}><span className="progress-bar" style={{ display: "block", width: `${progress}%` }} /></span>}
    </button>}
    {(images.length > 0 || localPreview) && <div className="upload-preview-grid">{images.map((image) => <div className="upload-preview" key={image.publicId}><Image src={image.url} alt="Uploaded preview" fill sizes="120px" /><button type="button" className="upload-remove" aria-label="Remove photo" onClick={() => { const updated = imagesRef.current.filter((item) => item.publicId !== image.publicId); imagesRef.current = updated; onChange(updated); }}><X size={13} /></button></div>)}{localPreview && <div className="upload-preview"><Image src={localPreview} alt="Uploading preview" fill unoptimized sizes="120px" /><span style={{ position: "absolute", inset: "auto 0 0", padding: 6, color: "#fff", background: "rgba(20,40,27,.65)", fontSize: 9 }}><UploadCloud size={12} style={{ verticalAlign: "middle" }} /> Uploading</span></div>}</div>}
  </div>;
}
