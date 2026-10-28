"use client";

import { useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { REPORT_REASONS } from "@/lib/constants";
import { apiRequest, toast } from "@/lib/client";

export function ReportDialog({ targetType, targetId, title, onClose }: { targetType: "post" | "comment" | "user"; targetId: string; title: string; onClose: () => void }) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]); const [details, setDetails] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); try { const response = await apiRequest<{ message: string }>("/api/reports", { method: "POST", body: JSON.stringify({ targetType, targetId, reason, details }) }); toast(response.message); onClose(); } catch (error) { toast(error instanceof Error ? error.message : "Could not send your report.", "error"); } finally { setBusy(false); } };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title"><button className="icon-button modal-close" aria-label="Close report form" onClick={onClose}><X size={17} /></button><h2 className="modal-title" id="report-dialog-title"><ShieldAlert size={17} style={{ verticalAlign: "middle", marginRight: 7 }} />{title}</h2><p className="modal-copy">Help the moderation team understand what needs a closer look.</p><form style={{ marginTop: 17 }} onSubmit={(event) => void submit(event)}><div className="field"><label htmlFor="report-reason">Reason</label><select id="report-reason" className="select" value={reason} onChange={(event) => setReason(event.target.value)}>{REPORT_REASONS.map((item) => <option key={item}>{item}</option>)}</select></div><div className="field"><label htmlFor="report-details">Details (optional)</label><textarea id="report-details" className="textarea" style={{ minHeight: 75 }} maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Share a little more context." /></div><button className="button full" type="submit" disabled={busy}>Send to moderation</button></form></div></div>;
}
