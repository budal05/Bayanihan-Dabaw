"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Copy, Flag, Heart, MapPin, MessageCircle, MoreHorizontal, Pencil, Send, ShieldAlert, Trash2, Wallet, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { apiRequest, formatDate, toast } from "@/lib/client";
import { POST_CATEGORIES, REPORT_REASONS } from "@/lib/constants";
import type { ImageRecord } from "@/lib/media";
import { ImageUploader } from "@/components/image-uploader";

type PublicPerson = { _id: string; name: string; username: string; profileImage?: ImageRecord | null; role?: string };
type Donation = { enabled: boolean; provider?: string; displayName?: string; qrImage?: ImageRecord; purpose?: string; requestedAmount?: number; contact?: string };
export type PostData = { _id: string; authorId: PublicPerson; title?: string; caption: string; images: ImageRecord[]; category: string; requestType: string; location?: string; donation?: Donation; likeCount: number; commentCount: number; createdAt: string; isLiked?: boolean; isSaved?: boolean };
type CommentData = { _id: string; authorId: PublicPerson; content: string; createdAt: string };

function amountText(value?: number) { return value ? `₱${value.toLocaleString("en-PH")}` : ""; }

export function PostCard({ post: initialPost }: { post: PostData }) {
  const [post, setPost] = useState(initialPost);
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [saved, setSaved] = useState(Boolean(post.isSaved));
  const [likes, setLikes] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.commentCount);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentCursor, setCommentCursor] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [editId, setEditId] = useState("");
  const [editText, setEditText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title ?? "");
  const [editCaption, setEditCaption] = useState(post.caption);
  const [editCategory, setEditCategory] = useState(post.category);
  const [editLocation, setEditLocation] = useState(post.location ?? "");
  const [editImages, setEditImages] = useState(post.images ?? []);
  const [editBusy, setEditBusy] = useState(false);

  useEffect(() => { apiRequest<{ user: { id: string } }>("/api/auth/session").then((response) => setCurrentUserId(response.user.id)).catch(() => undefined); }, []);
  if (deleted) return null;

  const toggleLike = async () => {
    const previous = liked; const previousCount = likes;
    setLiked(!previous); setLikes(Math.max(0, previousCount + (previous ? -1 : 1)));
    try { const response = await apiRequest<{ likeCount: number }>(`/api/posts/${post._id}/like`, { method: "POST", body: JSON.stringify({ active: !previous }) }); setLikes(response.likeCount); }
    catch (error) { setLiked(previous); setLikes(previousCount); toast(error instanceof Error ? error.message : "Could not update like.", "error"); }
  };

  const toggleSave = async () => {
    const previous = saved; setSaved(!previous);
    try { await apiRequest(`/api/posts/${post._id}/save`, { method: "POST", body: JSON.stringify({ active: !previous }) }); toast(previous ? "Removed from your saved posts." : "Saved for later."); }
    catch (error) { setSaved(previous); toast(error instanceof Error ? error.message : "Could not save this post.", "error"); }
  };

  const loadComments = async (cursor?: string) => {
    if (commentsLoading) return;
    setCommentsLoading(true);
    try { const params = new URLSearchParams(); if (cursor) params.set("cursor", cursor); const response = await apiRequest<{ items: CommentData[]; nextCursor: string | null }>(`/api/posts/${post._id}/comments?${params}`); setComments((current) => cursor ? [...current, ...response.items] : response.items); setCommentCursor(response.nextCursor); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not load comments.", "error"); }
    finally { setCommentsLoading(false); }
  };

  const openComments = () => { const opening = !showComments; setShowComments(opening); if (opening && !comments.length) void loadComments(); };
  const addComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    try { const result = await apiRequest<{ comment: CommentData }>(`/api/posts/${post._id}/comments`, { method: "POST", body: JSON.stringify({ content: commentText }) }); setComments((value) => [result.comment, ...value]); setCommentsCount((value) => value + 1); setCommentText(""); toast("Comment added."); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not add the comment.", "error"); }
  };

  const removeComment = async (id: string) => {
    if (!window.confirm("Remove this comment?")) return;
    try { await apiRequest(`/api/comments/${id}`, { method: "DELETE" }); setComments((value) => value.filter((item) => item._id !== id)); setCommentsCount((value) => Math.max(0, value - 1)); toast("Comment removed."); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not remove the comment.", "error"); }
  };

  const saveCommentEdit = async (id: string) => {
    try { const result = await apiRequest<{ comment: CommentData }>(`/api/comments/${id}`, { method: "PATCH", body: JSON.stringify({ content: editText }) }); setComments((value) => value.map((item) => item._id === id ? result.comment : item)); setEditId(""); toast("Comment updated."); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not update the comment.", "error"); }
  };

  const share = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    try {
      if (navigator.share) await navigator.share({ title: post.title || `Community update from @${post.authorId.username}`, text: post.caption.slice(0, 150), url });
      else { await navigator.clipboard.writeText(url); toast("Post link copied. Share it with your neighbors."); }
    } catch (error) { if (error instanceof Error && error.name !== "AbortError") { try { await navigator.clipboard.writeText(url); toast("Post link copied."); } catch { toast("Could not copy the link. Please copy it from your browser address bar.", "error"); } } }
  };

  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    try { const response = await apiRequest<{ message: string }>("/api/reports", { method: "POST", body: JSON.stringify({ targetType: "post", targetId: post._id, reason, details: reportDetails }) }); toast(response.message); setReporting(false); setReportDetails(""); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not submit this report.", "error"); }
  };

  const deletePost = async () => {
    if (!window.confirm("Delete this community post? This also removes its comments and likes.")) return;
    try { await apiRequest(`/api/posts/${post._id}`, { method: "DELETE" }); setDeleted(true); toast("Community post deleted."); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not delete this post.", "error"); }
  };

  const beginEdit = () => { setEditTitle(post.title ?? ""); setEditCaption(post.caption); setEditCategory(post.category); setEditLocation(post.location ?? ""); setEditImages(post.images ?? []); setEditing(true); };
  const savePostEdit = async (event: React.FormEvent) => {
    event.preventDefault(); setEditBusy(true);
    try {
      const response = await apiRequest<{ post: PostData }>(`/api/posts/${post._id}`, { method: "PATCH", body: JSON.stringify({ title: editTitle, caption: editCaption, category: editCategory, requestType: post.requestType, location: editLocation, images: editImages, donation: post.donation ?? { enabled: false } }) });
      setPost(response.post); setCommentsCount(response.post.commentCount); setEditing(false); toast("Community post updated.");
    } catch (error) { toast(error instanceof Error ? error.message : "Could not update your post.", "error"); }
    finally { setEditBusy(false); }
  };

  const person = post.authorId;
  const owner = currentUserId && currentUserId === String(person?._id);
  const showMenu = owner || Boolean(currentUserId);
  const images = (post.images ?? []).slice(0, 4);
  return <article className="card post-card">
    <header className="post-head"><Link href={`/u/${person.username}`} aria-label={`View ${person.name} profile`}><Avatar image={person.profileImage} name={person.name} /></Link><div className="post-author"><Link className="post-author-name" href={`/u/${person.username}`}>{person.name}</Link><div className="post-meta"><span>@{person.username}</span><span>·</span><time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>{post.location && <><span>·</span><MapPin size={11} /><span>{post.location}</span></>}</div></div><span className="post-category">{post.category}</span>{showMenu && <div className="post-menu"><button className="icon-button" aria-label="Post options" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={18} /></button>{menuOpen && <div style={{ position: "absolute", zIndex: 5, top: 36, right: 0, width: 166, padding: 5, border: "1px solid var(--line)", borderRadius: 11, background: "#fff", boxShadow: "0 8px 20px rgba(25,40,29,.11)" }}>{owner ? <><button className="post-action" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => { setMenuOpen(false); beginEdit(); }}><Pencil size={14} />Edit post</button><button className="post-action" style={{ width: "100%", justifyContent: "flex-start", color: "#a83d49" }} onClick={() => { setMenuOpen(false); void deletePost(); }}><Trash2 size={14} />Delete post</button></> : <button className="post-action" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => { setMenuOpen(false); setReporting(true); }}><Flag size={14} />Report post</button>}</div>}</div>}</header>
    <p className="field-hint" style={{ margin: "10px 0 -7px" }}>Community-submitted · Not an official government announcement.</p><Link href={`/post/${post._id}`} style={{ display: "block" }}><h2 className="post-title">{post.title || post.requestType}</h2><p className="post-caption">{post.caption}</p></Link>
    {post.location && <span className="post-location"><MapPin size={12} />{post.location} · Davao City</span>}
    {images.length > 0 && <div className={`post-images${images.length === 1 ? " one" : " multi"}`}>{images.map((image, index) => <Link href={`/post/${post._id}`} className="post-image" key={image.publicId}><Image src={image.url} alt={`Photo ${index + 1} shared by ${person.name}`} fill sizes="(max-width: 720px) 90vw, 600px" />{index === 3 && post.images.length > 4 && <span className="post-more-images">+{post.images.length - 4}</span>}</Link>)}</div>}
    {post.donation?.enabled && post.donation.qrImage && <section className="donation-box" aria-label="Donation information"><div className="donation-head"><div><div className="donation-label"><Wallet size={14} />Community support · {post.donation.provider}</div><p className="donation-recipient">Recipient: <strong>{post.donation.displayName}</strong>{post.donation.requestedAmount && <> · {amountText(post.donation.requestedAmount)} requested</>}</p>{post.donation.purpose && <p className="donation-purpose">{post.donation.purpose}</p>}{post.donation.contact && <p className="donation-purpose">Contact shared by author: {post.donation.contact}</p>}<button className="button soft small" style={{ marginTop: 9 }} onClick={() => setQrOpen(true)}>How to donate</button></div><button className="donation-qr" onClick={() => setQrOpen(true)} aria-label="Enlarge donation QR code"><Image src={post.donation.qrImage.url} alt="Recipient provided donation QR code" fill sizes="70px" /></button></div><p className="donation-disclaimer">Donations happen in your external wallet or bank app. Bayanihan Dabaw does not hold or process funds. Check the recipient details before sending.</p></section>}
    <div className="post-stats"><span>{likes.toLocaleString("en-PH")} {likes === 1 ? "neighbor appreciates this" : "neighbors appreciate this"}</span><button className="post-action" style={{ flex: "none", minHeight: 25 }} onClick={openComments}>{commentsCount} {commentsCount === 1 ? "comment" : "comments"}</button></div>
    <div className="post-actions"><button className={`post-action${liked ? " liked" : ""}`} aria-pressed={liked} onClick={() => void toggleLike()}><Heart size={16} fill={liked ? "currentColor" : "none"} />{liked ? "Appreciated" : "Appreciate"}</button><button className="post-action" onClick={openComments}><MessageCircle size={16} />Comment</button><button className="post-action" onClick={() => void share()}><Send size={15} />Share</button><button className={`post-action${saved ? " saved" : ""}`} aria-pressed={saved} onClick={() => void toggleSave()}><Bookmark size={15} fill={saved ? "currentColor" : "none"} />Save</button></div>
    {showComments && <section className="comment-panel" aria-label="Comments"><div className="comment-list">{commentCursor && <button className="button secondary small" style={{ justifySelf: "center" }} disabled={commentsLoading} onClick={() => void loadComments(commentCursor)}>{commentsLoading ? "Loading…" : "Load earlier comments"}</button>}{commentsLoading && !comments.length ? <span className="field-hint">Loading comments…</span> : comments.length ? comments.map((comment) => <div className="comment-row" key={comment._id}><Link href={`/u/${comment.authorId.username}`}><Avatar image={comment.authorId.profileImage} name={comment.authorId.name} size="small" /></Link><div className="comment-copy"><div style={{ display: "flex", alignItems: "center", gap: 7 }}><Link href={`/u/${comment.authorId.username}`} className="comment-name">{comment.authorId.name}</Link><time className="post-meta" dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>{currentUserId && (currentUserId === String(comment.authorId._id) || owner) && <span style={{ display: "flex", gap: 3, marginLeft: "auto" }}>{currentUserId === String(comment.authorId._id) && <button className="icon-button" style={{ width: 24, height: 24 }} aria-label="Edit comment" onClick={() => { setEditId(comment._id); setEditText(comment.content); }}><Pencil size={13} /></button>}<button className="icon-button" style={{ width: 24, height: 24 }} aria-label="Delete comment" onClick={() => void removeComment(comment._id)}><X size={13} /></button></span>}</div>{editId === comment._id ? <form onSubmit={(event) => { event.preventDefault(); void saveCommentEdit(comment._id); }} className="inline-form" style={{ marginTop: 6 }}><input className="inline-input" value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={1000} aria-label="Edit comment" /><button className="button small" type="submit">Save</button></form> : <p className="comment-text">{comment.content}</p>}</div></div>) : !commentsLoading && <span className="field-hint">No comments yet. Add the first one.</span>}</div><form className="inline-form" onSubmit={(event) => void addComment(event)}><input className="inline-input" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a thoughtful comment…" maxLength={1000} aria-label="Write a comment" /><button className="button small" type="submit" disabled={!commentText.trim()}><MessageCircle size={13} />Post</button></form></section>}
    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(false); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby={`edit-${post._id}`}><button className="icon-button modal-close" aria-label="Close edit form" onClick={() => setEditing(false)}><X size={17} /></button><h2 className="modal-title" id={`edit-${post._id}`}>Edit your community post</h2><form style={{ marginTop: 16, maxHeight: "70vh", overflow: "auto", paddingRight: 5 }} onSubmit={(event) => void savePostEdit(event)}><div className="field"><label htmlFor={`edit-title-${post._id}`}>Report title</label><input id={`edit-title-${post._id}`} className="input" maxLength={120} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></div><div className="field"><label htmlFor={`edit-caption-${post._id}`}>Description</label><textarea id={`edit-caption-${post._id}`} className="textarea" required minLength={1} maxLength={3000} value={editCaption} onChange={(event) => setEditCaption(event.target.value)} /></div><div className="field"><label htmlFor={`edit-category-${post._id}`}>Category</label><select id={`edit-category-${post._id}`} className="select" value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>{POST_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></div><div className="field"><label htmlFor={`edit-location-${post._id}`}>Location or barangay</label><input id={`edit-location-${post._id}`} className="input" maxLength={100} value={editLocation} onChange={(event) => setEditLocation(event.target.value)} /></div><div className="field"><label>Post photos</label><ImageUploader images={editImages} onChange={setEditImages} purpose="posts" max={5} /></div><div className="notice warning" style={{ marginBottom: 14 }}>Donation details on this post are kept as they are. To change a QR code, remove it from the post and create a new post with your updated donation details.</div><button className="button full" type="submit" disabled={editBusy}>{editBusy ? "Saving…" : "Save changes"}</button></form></div></div>}
    {reporting && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReporting(false); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby={`report-${post._id}`}><button className="icon-button modal-close" aria-label="Close report form" onClick={() => setReporting(false)}><X size={17} /></button><h2 className="modal-title" id={`report-${post._id}`}><ShieldAlert size={17} style={{ verticalAlign: "middle", marginRight: 7 }} />Report this community post</h2><p className="modal-copy">Help the moderation team understand what needs a closer look.</p><form style={{ marginTop: 17 }} onSubmit={(event) => void submitReport(event)}><div className="field"><label htmlFor={`reason-${post._id}`}>Reason</label><select id={`reason-${post._id}`} className="select" value={reason} onChange={(event) => setReason(event.target.value)}>{REPORT_REASONS.map((item) => <option key={item}>{item}</option>)}</select></div><div className="field"><label htmlFor={`detail-${post._id}`}>Details (optional)</label><textarea id={`detail-${post._id}`} className="textarea" style={{ minHeight: 75 }} maxLength={1000} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Share a little more context." /></div><button className="button full" type="submit">Send to moderation</button></form></div></div>}
    {qrOpen && post.donation?.qrImage && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQrOpen(false); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby={`qr-title-${post._id}`}><button className="icon-button modal-close" aria-label="Close donation details" onClick={() => setQrOpen(false)}><X size={17} /></button><h2 className="modal-title" id={`qr-title-${post._id}`}>How to donate</h2><p className="modal-copy">Open {post.donation.provider} or your compatible banking app, scan this QR code, and check that the recipient is <strong>{post.donation.displayName}</strong> before sending. {post.donation.purpose ? `Purpose: ${post.donation.purpose}.` : ""}</p><div className="qr-modal-image"><Image src={post.donation.qrImage.url} alt="Donation QR code supplied by the post author" fill sizes="340px" /></div><div className="notice warning"><ShieldAlert size={16} style={{ flex: "none" }} />Donations go directly through the external wallet or bank you choose. Bayanihan Dabaw does not hold or process funds and does not verify this QR code.</div><div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}><a className="button secondary small" href={post.donation.qrImage.url} target="_blank" rel="noreferrer"><Copy size={13} />Open QR image</a></div></div></div>}
  </article>;
}
