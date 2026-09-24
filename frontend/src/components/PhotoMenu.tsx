import {
  Check,
  Copy,
  Download,
  FolderInput,
  Heart,
  Loader2,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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
} from "@/services/api";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

type PhotoMenuProps = {
  photo: Photo;
  folders: Folder[];
  onRenamed?: (photo: Photo) => void;
  onMoved?: (
    photo: Photo,
    folderId: string | null,
  ) => void;
  onDownload?: () => void;
  onTrashed?: (photo: Photo) => void;
  onFavorite?: (photo: Photo) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  ready: boolean;
};

const MENU_GAP = 8;
const VIEWPORT_GAP = 8;

export function PhotoMenu({
  photo,
  folders,
  onRenamed,
  onMoved,
  onDownload,
  onTrashed,
  onFavorite,
}: PhotoMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [shareUrl, setShareUrl] = useState("");
  const [newName, setNewName] = useState(photo.name);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    photo.folderId || "",
  );

  const [renaming, setRenaming] = useState(false);
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isFavorite, setIsFavorite] = useState(
    photo.isFavorite === true,
  );

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
        left = Math.max(
          VIEWPORT_GAP,
          viewportWidth - menuRect.width - VIEWPORT_GAP,
        );
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
    };

    setMenuPosition((previous) => ({
      ...previous,
      ready: false,
    }));

    const frame = window.requestAnimationFrame(
      updateMenuPosition,
    );

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

  async function handleFavorite() {
    if (favoriting || !photo.photoId) {
      return;
    }

    const nextValue = !isFavorite;
    setFavoriting(true);

    try {
      const response = await setFavorite(
        photo.photoId,
        nextValue,
      );

      const updatedPhoto: Photo = {
        ...photo,
        isFavorite:
          response.photo?.isFavorite ?? nextValue,
        updatedAt:
          response.photo?.updatedAt ??
          photo.updatedAt ??
          new Date().toISOString(),
      };

      setIsFavorite(updatedPhoto.isFavorite === true);
      onFavorite?.(updatedPhoto);
      closeMenu();

      toast.success(
        nextValue
          ? "Added to Favorites"
          : "Removed from Favorites",
      );
    } catch (error) {
      console.error("Favorite update failed:", error);

      toast.error("Couldn't update Favorite", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
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

      const rawShareUrl =
        share.shareUrl ||
        `/shared/${encodeURIComponent(share.token)}`;

      const generatedShareUrl =
        new URL(
          rawShareUrl,
          window.location.origin,
        ).toString();

      setShareUrl(generatedShareUrl);
      setCopied(false);
      setShareOpen(true);

      toast.success("Share link created");
    } catch (error) {
      console.error("Share failed:", error);

      toast.error("Share failed", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
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

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: photo.name || photo.fileName || "Photo",
          text: `Check out ${
            photo.name || photo.fileName || "this photo"
          }`,
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
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
      const response = await renamePhoto(
        photo.photoId,
        cleanName,
      );

      const updated = response.photo;

      const updatedPhoto: Photo = {
        ...photo,
        name: updated.name,
        ...(updated.originalFileName || photo.originalFileName
          ? {
              originalFileName:
                updated.originalFileName ?? photo.originalFileName,
            }
          : {}),
        fileName: updated.fileName,
        updatedAt:
          updated.updatedAt ??
          photo.updatedAt ??
          new Date().toISOString(),
      };

      onRenamed?.(updatedPhoto);
      setNewName(updated.name);
      setRenameOpen(false);

      toast.success("Photo renamed successfully");
    } catch (error) {
      console.error("Rename failed:", error);

      toast.error("Rename failed", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
      });
    } finally {
      setRenaming(false);
    }
  }

  async function handleMove() {
    setMoving(true);

    try {
      const folderId = selectedFolderId || null;

      const response = await movePhotoToFolder(
        photo.photoId,
        folderId,
      );

      const updatedPhoto: Photo = {
        ...photo,
        folderId,
        updatedAt:
          response.photo?.updatedAt ??
          photo.updatedAt ??
          new Date().toISOString(),
      };

      onMoved?.(updatedPhoto, folderId);
      setMoveOpen(false);

      toast.success(
        folderId
          ? "Photo moved successfully"
          : "Photo moved to root",
      );
    } catch (error) {
      console.error("Move photo failed:", error);

      toast.error("Move failed", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
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
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
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

  const menu = menuOpen
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Options for ${photo.name}`}
          className="fixed z-[200] w-[min(13rem,calc(100vw-1rem))] rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl ring-1 ring-black/5"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            opacity: menuPosition.ready ? 1 : 0,
            pointerEvents: menuPosition.ready ? "auto" : "none",
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={openRename}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
          >
            <Pencil className="size-4 shrink-0" />
            <span>Rename</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={openMove}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
          >
            <FolderInput className="size-4 shrink-0" />
            <span>Move to folder</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              onDownload?.();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
          >
            <Download className="size-4 shrink-0" />
            <span>Download</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void handleFavorite();
            }}
            disabled={favoriting}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {favoriting ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : (
              <Heart
                className={`size-4 shrink-0 ${
                  isFavorite
                    ? "fill-current text-rose-500"
                    : ""
                }`}
              />
            )}
            <span>
              {isFavorite
                ? "Remove from Favorites"
                : "Add to Favorites"}
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void handleShare();
            }}
            disabled={sharing}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharing ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : (
              <Share2 className="size-4 shrink-0" />
            )}
            <span>{sharing ? "Preparing..." : "Share"}</span>
          </button>

          <div className="my-1.5 h-px bg-border" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              setDeleteOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
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
          className="border-border bg-background/95 shadow-sm sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
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
            <label
              htmlFor={`rename-${photo.photoId}`}
              className="text-sm font-medium"
            >
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
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            <p className="text-xs text-muted-foreground">
              {newName.length}/120
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={renaming}
            >
              Cancel
            </Button>

            <Button
              onClick={() => void handleRename()}
              disabled={renaming || !newName.trim()}
            >
              {renaming ? (
                <Loader2 className="size-4" />
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
            <DialogDescription>
              Choose where you want to store this photo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor={`move-${photo.photoId}`}
              className="text-sm font-medium"
            >
              Folder
            </label>

            <select
              id={`move-${photo.photoId}`}
              value={selectedFolderId}
              disabled={moving}
              onChange={(event) =>
                setSelectedFolderId(event.target.value)
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="">Root / My Photos</option>
              {folders.map((folder) => (
                <option
                  key={folder.folderId}
                  value={folder.folderId}
                >
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
            >
              Cancel
            </Button>

            <Button
              onClick={() => void handleMove()}
              disabled={moving}
            >
              {moving ? (
                <Loader2 className="size-4" />
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
            <DialogDescription>
              Anyone with this link can view the shared photo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="truncate text-sm font-medium">
                {photo.name || photo.fileName || "Photo"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The original photo remains private. The link only grants
                access to this shared photo.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex min-w-0 items-center gap-2">
                <input
                  value={shareUrl}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                  aria-label="Share link"
                  className="h-10 min-w-0 flex-1 rounded-md border border-border bg-muted/30 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleCopyShareUrl()}
                  aria-label="Copy share link"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShareOpen(false)}
            >
              Close
            </Button>

            <Button
              variant="outline"
              onClick={() => void handleNativeShare()}
            >
              <Share2 className="size-4" />
              Share
            </Button>

            <Button onClick={() => void handleCopyShareUrl()}>
              {copied ? "Copied" : "Copy link"}
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
              <strong className="text-foreground">{photo.name}</strong>{" "}
              will be moved to Trash. You can restore it later. The photo
              will not be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={() => void handleTrash()}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-4" />
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
