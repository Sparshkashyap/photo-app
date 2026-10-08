import {
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  FolderInput,
  FolderOpen,
  HardDrive,
  Heart,
  ImageIcon,
  Info,
  Loader2,
  MoreVertical,
  Pencil,
  Ruler,
  Share2,
  Send,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { createPortal } from "react-dom";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  createShare,
  movePhotoToFolder,
  renamePhoto,
  setFavorite,
  trashPhoto,
  generatePhotoCaption,
  requestDownloadUrl,
  requestCopyPhoto,
} from "@/services/api";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

type PhotoMenuProps = {
  photo: Photo;
  folders: Folder[];
  onRenamed?: (photo: Photo) => void;
  onMoved?: (photo: Photo, folderId: string | null) => void;
  onDownload?: () => void;
  onTrashed?: (photo: Photo) => void;
  onFavorite?: (photo: Photo) => void;
  onView?: () => void;
  onCaptionChange?: (photo: Photo, caption: string) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  ready: boolean;
};

const MENU_GAP = 8;
const VIEWPORT_GAP = 8;
const MENU_ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)';

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) {
    return "Unknown";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[exponent]}`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "Unknown";
  }

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(
      2,
      "0",
    )}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getFolderName(photo: Photo, folders: Folder[]) {
  if (!photo.folderId) {
    return "My Photos / Root";
  }

  return (
    folders.find((folder) => folder.folderId === photo.folderId)?.name ||
    `Folder (${photo.folderId})`
  );
}

function PropertyRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/50 px-3 py-2.5 transition-colors hover:bg-background/80">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function PhotoMenu({
  photo,
  folders,
  onRenamed,
  onMoved,
  onDownload,
  onTrashed,
  onFavorite,
  onView,
  onCaptionChange,
}: PhotoMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);

  const [shareUrl, setShareUrl] = useState("");
  const [newName, setNewName] = useState(photo.name);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(photo.folderId || "");

  const [renaming, setRenaming] = useState(false);
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isFavorite, setIsFavorite] = useState(photo.isFavorite === true);

  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);

  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    ready: false,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsFavorite(photo.isFavorite === true);
  }, [photo.isFavorite]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node | null;

      if (!target) {
        return;
      }

      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);

      if (!clickedTrigger && !clickedMenu) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function getItems(): HTMLElement[] {
      const menu = menuRef.current;

      if (!menu) {
        return [];
      }

      return Array.from(menu.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR));
    }

    function handleMenuKeyDown(event: KeyboardEvent) {
      const items = getItems();

      if (items.length === 0) {
        return;
      }

      const activeElement = document.activeElement;
      const currentIndex = items.findIndex((item) => item === activeElement);

      if (event.key === "ArrowDown") {
        event.preventDefault();

        const next = items[(currentIndex + 1 + items.length) % items.length];

        next?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();

        const previous = items[(currentIndex - 1 + items.length) % items.length];

        previous?.focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1]?.focus();
      }
    }

    document.addEventListener("keydown", handleMenuKeyDown);

    return () => {
      document.removeEventListener("keydown", handleMenuKeyDown);
    };
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (!menuOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;

      if (!trigger || !menu) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = triggerRect.right - menuRect.width;

      if (left < VIEWPORT_GAP) {
        left = VIEWPORT_GAP;
      }

      if (left + menuRect.width > viewportWidth - VIEWPORT_GAP) {
        left = Math.max(VIEWPORT_GAP, viewportWidth - menuRect.width - VIEWPORT_GAP);
      }

      let top = triggerRect.bottom + MENU_GAP;

      if (top + menuRect.height > viewportHeight - VIEWPORT_GAP) {
        top = triggerRect.top - menuRect.height - MENU_GAP;
      }

      if (top < VIEWPORT_GAP) {
        top = VIEWPORT_GAP;
      }

      setMenuPosition({
        top,
        left,
        ready: true,
      });

      const items = menu.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR);

      items[0]?.focus();
    };

    setMenuPosition((previous) => ({
      ...previous,
      ready: false,
    }));

    const frame = window.requestAnimationFrame(updateMenuPosition);

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.cancelAnimationFrame(frame);

      window.removeEventListener("resize", updateMenuPosition);

      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleGenerateCaption() {
    if (generatingCaption || !photo.contentType?.startsWith("image/")) {
      return;
    }

    setGeneratingCaption(true);

    try {
      const response = await generatePhotoCaption(photo.photoId);

      onCaptionChange?.(photo, response.caption);
      closeMenu();

      toast.success("Caption added", {
        description: response.caption,
      });
    } catch (error) {
      console.error("AI caption generation failed:", error);

      toast.error("Couldn't generate a caption", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setGeneratingCaption(false);
    }
  }

  async function handleSendAsCopy() {
    if (sharing) return;

    setSharing(true);

    try {
      // This endpoint creates a REAL duplicate in S3 + DynamoDB.
      // Do not use the normal download endpoint here because that only
      // returns the original file.
      const response = await requestCopyPhoto(photo.photoId);
      const copiedPhoto = response.photo;

      if (!copiedPhoto?.downloadUrl) {
        throw new Error("The copied file URL was not returned by the server.");
      }

      const fileResponse = await fetch(copiedPhoto.downloadUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (!fileResponse.ok) {
        throw new Error("Couldn't download the copied file for sharing.");
      }

      const blob = await fileResponse.blob();
      const fileName =
        copiedPhoto.originalFileName ||
        copiedPhoto.fileName ||
        photo.originalFileName ||
        photo.fileName ||
        photo.name ||
        "photo";

      const file = new File([blob], fileName, {
        type:
          copiedPhoto.contentType || photo.contentType || blob.type || "application/octet-stream",
      });

      // Send as Copy means an actual file attachment, never a URL.
      if (typeof navigator.share === "function") {
        const canShareFiles =
          typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] });

        if (canShareFiles) {
          await navigator.share({
            files: [file],
            title: fileName,
            text: "Sent from Photo-App",
          });

          closeMenu();
          toast.success("Copy created and ready to send", {
            description:
              "Choose WhatsApp, Email, Telegram or any app shown by your device's share sheet.",
          });
          return;
        }
      }

      // Desktop browsers that do not expose the native file share sheet
      // cannot attach a local File to WhatsApp/Email programmatically.
      // Download the real copied file instead of copying a URL.
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      closeMenu();
      toast.success("Copy created and downloaded", {
        description:
          "Open your device share sheet to send the copied file to WhatsApp, Email or another app.",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Send as copy failed:", error);

      toast.error("Couldn't send the copied file", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSharing(false);
    }
  }

  async function handleFavorite() {
    if (favoriting || !photo.photoId) {
      return;
    }

    const nextValue = !isFavorite;

    setFavoriting(true);

    try {
      const response = await setFavorite(photo.photoId, nextValue);

      const updatedPhoto: Photo = {
        ...photo,
        isFavorite: response.photo?.isFavorite ?? nextValue,
        updatedAt: response.photo?.updatedAt ?? photo.updatedAt ?? new Date().toISOString(),
      };

      setIsFavorite(updatedPhoto.isFavorite === true);

      onFavorite?.(updatedPhoto);

      closeMenu();

      toast.success(nextValue ? "Added to Favorites" : "Removed from Favorites");
    } catch (error) {
      console.error("Favorite update failed:", error);

      toast.error("Couldn't update Favorite", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setFavoriting(false);
    }
  }

  async function handleShare() {
    if (sharing) {
      return;
    }

    setSharing(true);
    closeMenu();

    try {
      const response = await createShare(photo.photoId);
      const share = response.share;

      const rawShareUrl = share.shareUrl || `/shared/${encodeURIComponent(share.token)}`;

      const generatedShareUrl = new URL(rawShareUrl, window.location.origin).toString();

      setShareUrl(generatedShareUrl);
      setCopied(false);
      setShareOpen(true);

      toast.success("Share link created");
    } catch (error) {
      console.error("Share failed:", error);

      toast.error("Share failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSharing(false);
    }
  }

  async function handleCopyShareUrl() {
    if (!shareUrl) {
      return;
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");

        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";

        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const copiedSuccessfully = document.execCommand("copy");

        textArea.remove();

        if (!copiedSuccessfully) {
          throw new Error("Clipboard access was unavailable.");
        }
      }

      setCopied(true);

      toast.success("Share link copied");

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error("Copy share link failed:", error);

      toast.error("Couldn't copy link");
    }
  }

  async function handleNativeShare() {
    if (!shareUrl) {
      return;
    }

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: photo.name || photo.fileName || "Photo",
          text: `Check out ${photo.name || photo.fileName || "this photo"}`,
          url: shareUrl,
        });

        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Native share failed:", error);
      }
    }

    await handleCopyShareUrl();
  }

  async function handleRename() {
    const cleanName = newName.trim();

    if (!cleanName) {
      toast.error("Photo name cannot be empty");
      return;
    }

    if (cleanName.length > 120) {
      toast.error("Photo name cannot exceed 120 characters");
      return;
    }

    if (cleanName === photo.name) {
      setRenameOpen(false);
      return;
    }

    setRenaming(true);

    try {
      const response = await renamePhoto(photo.photoId, cleanName);

      const updated = response.photo;

      const updatedPhoto: Photo = {
        ...photo,
        name: updated.name,
        ...(updated.originalFileName || photo.originalFileName
          ? {
              originalFileName: updated.originalFileName ?? photo.originalFileName,
            }
          : {}),
        fileName: updated.fileName,
        updatedAt: updated.updatedAt ?? photo.updatedAt ?? new Date().toISOString(),
      };

      onRenamed?.(updatedPhoto);

      setNewName(updated.name);
      setRenameOpen(false);

      toast.success("Photo renamed successfully");
    } catch (error) {
      console.error("Rename failed:", error);

      toast.error("Rename failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setRenaming(false);
    }
  }

  async function handleMove() {
    setMoving(true);

    try {
      const folderId = selectedFolderId || null;

      const response = await movePhotoToFolder(photo.photoId, folderId);

      const updatedPhoto: Photo = {
        ...photo,
        folderId,
        updatedAt: response.photo?.updatedAt ?? photo.updatedAt ?? new Date().toISOString(),
      };

      onMoved?.(updatedPhoto, folderId);

      setMoveOpen(false);

      toast.success(folderId ? "Photo moved successfully" : "Photo moved to root");
    } catch (error) {
      console.error("Move photo failed:", error);

      toast.error("Move failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setMoving(false);
    }
  }

  async function handleTrash() {
    if (deleting) {
      return;
    }

    setDeleting(true);

    try {
      await trashPhoto(photo.photoId);

      setDeleteOpen(false);

      closeMenu();

      onTrashed?.(photo);

      toast.success("Moved to Trash", {
        description: `${photo.name} can be restored from Trash.`,
      });
    } catch (error) {
      console.error("Move to trash failed:", error);

      toast.error("Couldn't move photo to Trash", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  function openRename() {
    closeMenu();

    setNewName(photo.name);

    setRenameOpen(true);
  }

  function openMove() {
    closeMenu();

    setSelectedFolderId(photo.folderId || "");

    setMoveOpen(true);
  }

  function openProperties() {
    closeMenu();

    setDimensions(null);
    setDurationSeconds(null);

    setPropertiesOpen(true);
  }

  useEffect(() => {
    if (!propertiesOpen) {
      return;
    }

    const mediaUrl = photo.url || photo.downloadUrl;

    if (!mediaUrl) {
      return;
    }

    let disposed = false;

    if (photo.contentType.startsWith("video/")) {
      const video = document.createElement("video");

      video.preload = "metadata";

      video.onloadedmetadata = () => {
        if (disposed) {
          return;
        }

        setDimensions({
          width: video.videoWidth,
          height: video.videoHeight,
        });

        setDurationSeconds(Number.isFinite(video.duration) ? video.duration : null);
      };

      video.onerror = () => {
        if (!disposed) {
          setDimensions(null);
          setDurationSeconds(null);
        }
      };

      video.src = mediaUrl;

      video.load();

      return () => {
        disposed = true;

        video.pause();

        video.removeAttribute("src");

        video.load();
      };
    }

    if (photo.contentType.startsWith("image/")) {
      const image = new Image();

      image.onload = () => {
        if (!disposed) {
          setDimensions({
            width: image.naturalWidth,
            height: image.naturalHeight,
          });
        }
      };

      image.onerror = () => {
        if (!disposed) {
          setDimensions(null);
        }
      };

      image.src = mediaUrl;
    }

    return () => {
      disposed = true;
    };
  }, [propertiesOpen, photo.contentType, photo.downloadUrl, photo.url]);

  const menu = menuOpen
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Options for ${photo.name}`}
          className="fixed z-[200] w-[min(13rem,calc(100vw-1rem))] origin-top-right rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl ring-1 ring-black/5 transition-[opacity,transform] duration-100 ease-out"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            opacity: menuPosition.ready ? 1 : 0,
            transform: menuPosition.ready ? "scale(1)" : "scale(0.96)",
            pointerEvents: menuPosition.ready ? "auto" : "none",
          }}
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              closeMenu();
              onView?.();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-accent focus:bg-accent focus:outline-none"
          >
            <Eye className="size-4 shrink-0 text-muted-foreground" />
            <span>View</span>
          </button>

          {photo.contentType?.startsWith("image/") ? (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                void handleGenerateCaption();
              }}
              disabled={generatingCaption}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-accent focus:bg-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:hidden"
            >
              {generatingCaption ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Sparkles className="size-4 shrink-0 text-muted-foreground" />
              )}

              <span>{generatingCaption ? "Generating caption..." : "Generate AI caption"}</span>
            </button>
          ) : null}

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={openRename}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-accent focus:bg-accent focus:outline-none"
          >
            <Pencil className="size-4 shrink-0 text-muted-foreground" />
            <span>Rename</span>
          </button>

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={openMove}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-accent focus:bg-accent focus:outline-none"
          >
            <FolderInput className="size-4 shrink-0 text-muted-foreground" />
            <span>Move to folder</span>
          </button>

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              closeMenu();
              onDownload?.();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-accent focus:bg-accent focus:outline-none"
          >
            <Download className="size-4 shrink-0 text-muted-foreground" />
            <span>Download</span>
          </button>

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => void handleSendAsCopy()}
            disabled={sharing}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-accent focus:bg-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharing ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Send className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span>{sharing ? "Preparing file..." : "Send as Copy"}</span>
          </button>

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              void handleFavorite();
            }}
            disabled={favoriting}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-accent focus:bg-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {favoriting ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Heart
                className={`size-4 shrink-0 transition-colors ${
                  isFavorite ? "fill-current text-rose-500" : "text-muted-foreground"
                }`}
              />
            )}

            <span>{isFavorite ? "Remove from Favorites" : "Add to Favorites"}</span>
          </button>

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              void handleShare();
            }}
            disabled={sharing}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-accent focus:bg-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharing ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Share2 className="size-4 shrink-0 text-muted-foreground" />
            )}

            <span>{sharing ? "Preparing..." : "Share"}</span>
          </button>

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={openProperties}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-accent focus:bg-accent focus:outline-none"
          >
            <Info className="size-4 shrink-0 text-muted-foreground" />
            <span>Properties</span>
          </button>

          <div className="my-1.5 h-px bg-border" />

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              closeMenu();
              setDeleteOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-destructive transition-colors duration-100 hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
          >
            <Trash2 className="size-4 shrink-0" />
            <span>Move to Trash</span>
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="relative">
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            setMenuOpen((previous) => !previous);
          }}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Options for ${photo.name}`}
          title="Photo options"
          className="border-border bg-background/95 shadow-sm transition-transform active:scale-90 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <MoreVertical className="size-4" />
        </Button>
      </div>

      {menu}

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          if (!renaming) {
            setRenameOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename photo</DialogTitle>

            <DialogDescription>
              Give this photo a name you'll recognize in your library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor={`rename-${photo.photoId}`} className="text-sm font-medium">
              Photo name
            </label>

            <input
              id={`rename-${photo.photoId}`}
              value={newName}
              maxLength={120}
              disabled={renaming}
              autoFocus
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleRename();
                }
              }}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            <p
              className={`text-xs ${
                newName.length > 110 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {newName.length}/120
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={renaming}
              className="transition-transform active:scale-95"
            >
              Cancel
            </Button>

            <Button
              onClick={() => void handleRename()}
              disabled={renaming || !newName.trim()}
              className="transition-transform active:scale-95"
            >
              {renaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Pencil className="size-4" />
              )}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={moveOpen}
        onOpenChange={(open) => {
          if (!moving) {
            setMoveOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move photo</DialogTitle>

            <DialogDescription>Choose where you want to store this photo.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor={`move-${photo.photoId}`} className="text-sm font-medium">
              Folder
            </label>

            <select
              id={`move-${photo.photoId}`}
              value={selectedFolderId}
              disabled={moving}
              onChange={(event) => setSelectedFolderId(event.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="">Root / My Photos</option>

              {folders.map((folder) => (
                <option key={folder.folderId} value={folder.folderId}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMoveOpen(false)}
              disabled={moving}
              className="transition-transform active:scale-95"
            >
              Cancel
            </Button>

            <Button
              onClick={() => void handleMove()}
              disabled={moving}
              className="transition-transform active:scale-95"
            >
              {moving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FolderInput className="size-4" />
              )}
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);

          if (!open) {
            setCopied(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-5" />
              Share photo
            </DialogTitle>

            <DialogDescription>Anyone with this link can view the shared photo.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="truncate text-sm font-medium">
                {photo.name || photo.fileName || "Photo"}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                The original photo remains private. The link only grants access to this shared
                photo.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex min-w-0 items-center gap-2">
                <input
                  value={shareUrl}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                  aria-label="Share link"
                  className="h-10 min-w-0 flex-1 rounded-md border border-border bg-muted/30 px-3 text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleCopyShareUrl()}
                  aria-label="Copy share link"
                  title="Copy link"
                  className={`transition-all active:scale-90 ${
                    copied ? "border-emerald-500/50 text-emerald-500" : ""
                  }`}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShareOpen(false)}
              className="transition-transform active:scale-95"
            >
              Close
            </Button>

            <Button
              variant="outline"
              onClick={() => void handleNativeShare()}
              className="transition-transform active:scale-95"
            >
              <Share2 className="size-4" />
              Share
            </Button>

            <Button
              onClick={() => void handleCopyShareUrl()}
              className="transition-transform active:scale-95"
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={propertiesOpen} onOpenChange={setPropertiesOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="size-5" />
              Properties
            </DialogTitle>

            <DialogDescription>
              Complete information about this{" "}
              {photo.contentType.startsWith("video/")
                ? "video"
                : photo.contentType.startsWith("audio/")
                  ? "audio file"
                  : "photo"}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <PropertyRow
              icon={<FileText className="size-4" />}
              label="Name"
              value={photo.name || photo.fileName || "Untitled"}
            />

            <PropertyRow
              icon={<FileText className="size-4" />}
              label="Original filename"
              value={photo.originalFileName || photo.fileName || "Not available"}
            />

            <PropertyRow
              icon={
                photo.contentType.startsWith("video/") ? (
                  <Video className="size-4" />
                ) : (
                  <ImageIcon className="size-4" />
                )
              }
              label="Type"
              value={photo.contentType || "Unknown"}
            />

            <PropertyRow
              icon={<HardDrive className="size-4" />}
              label="File size"
              value={formatFileSize(photo.fileSize)}
            />

            <PropertyRow
              icon={<Ruler className="size-4" />}
              label="Dimensions"
              value={dimensions ? `${dimensions.width} × ${dimensions.height} px` : "Not available"}
            />

            {photo.contentType.startsWith("video/") ? (
              <PropertyRow
                icon={<Clock3 className="size-4" />}
                label="Duration"
                value={durationSeconds !== null ? formatDuration(durationSeconds) : "Not available"}
              />
            ) : null}

            <PropertyRow
              icon={<CalendarDays className="size-4" />}
              label="Uploaded"
              value={formatDateTime(photo.createdAt || photo.uploadedAt)}
            />

            <PropertyRow
              icon={<CalendarDays className="size-4" />}
              label="Last modified"
              value={formatDateTime(photo.updatedAt)}
            />

            <PropertyRow
              icon={<FolderOpen className="size-4" />}
              label="Folder"
              value={getFolderName(photo, folders)}
            />

            <PropertyRow
              icon={<Heart className="size-4" />}
              label="Favorite"
              value={photo.isFavorite ? "Yes" : "No"}
            />

            <PropertyRow
              icon={<Info className="size-4" />}
              label="Status"
              value={photo.isTrashed ? "In Trash" : "Active"}
            />
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Photo ID</p>

            <p className="mt-1 break-all font-mono text-xs text-foreground">{photo.photoId}</p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setPropertiesOpen(false)}
              className="transition-transform active:scale-95"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Trash?</DialogTitle>

            <DialogDescription>
              <strong className="text-foreground">{photo.name}</strong> will be moved to Trash. You
              can restore it later. The photo will not be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="transition-transform active:scale-95"
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={() => void handleTrash()}
              disabled={deleting}
              className="transition-transform active:scale-95"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Move to Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PhotoMenu;
