import {
  Download,
  FolderInput,
  Loader2,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  toast,
} from "sonner";

import {
  Button,
} from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  movePhotoToFolder,
  renamePhoto,
  trashPhoto,
} from "@/services/api";

import type {
  Folder,
} from "@/types/folder";

import type {
  Photo,
} from "@/types/photo";

type PhotoMenuProps = {
  photo: Photo;

  folders: Folder[];

  onRenamed?: (
    photo: Photo,
  ) => void;

  onMoved?: (
    photo: Photo,
    folderId: string | null,
  ) => void;

  onDownload?: () => void;

  onTrashed?: (
    photo: Photo,
  ) => void;
};

export function PhotoMenu({
  photo,
  folders,
  onRenamed,
  onMoved,
  onDownload,
  onTrashed,
}: PhotoMenuProps) {
  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    renameOpen,
    setRenameOpen,
  ] = useState(false);

  const [
    moveOpen,
    setMoveOpen,
  ] = useState(false);

  const [
    deleteOpen,
    setDeleteOpen,
  ] = useState(false);

  const [
    newName,
    setNewName,
  ] = useState(photo.name);

  const [
    selectedFolderId,
    setSelectedFolderId,
  ] = useState<string>(
    photo.folderId || "",
  );

  const [
    renaming,
    setRenaming,
  ] = useState(false);

  const [
    moving,
    setMoving,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    sharing,
    setSharing,
  ] = useState(false);

  // --------------------------------------------------
  // Menu Reference
  // --------------------------------------------------

  const menuRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  // --------------------------------------------------
  // Close Menu on Outside Click / Escape
  // --------------------------------------------------

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleOutsideClick(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node | null;

      if (
        menuRef.current &&
        target &&
        !menuRef.current.contains(
          target,
        )
      ) {
        setMenuOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [menuOpen]);

  // --------------------------------------------------
  // Share
  // --------------------------------------------------

  async function handleShare() {
    if (sharing) {
      return;
    }

    const shareUrl =
      photo.url ||
      photo.downloadUrl ||
      "";

    if (!shareUrl) {
      toast.error(
        "Unable to share this photo",
        {
          description:
            "No shareable URL is available for this photo.",
        },
      );

      setMenuOpen(false);

      return;
    }

    setSharing(true);
    setMenuOpen(false);

    try {
      const shareTitle =
        photo.name ||
        photo.fileName ||
        "Photo";

      // Native Web Share API
      if (
        typeof navigator !==
          "undefined" &&
        typeof navigator.share ===
          "function"
      ) {
        await navigator.share({
          title: shareTitle,
          text: `Check out ${shareTitle}`,
          url: shareUrl,
        });

        toast.success(
          "Share dialog opened",
        );

        return;
      }

      // Fallback: Copy URL
      if (
        typeof navigator !==
          "undefined" &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(
          shareUrl,
        );

        toast.success(
          "Photo link copied",
          {
            description:
              "The shareable photo link has been copied to your clipboard.",
          },
        );

        return;
      }

      // Last fallback
      const textArea =
        document.createElement(
          "textarea",
        );

      textArea.value = shareUrl;
      textArea.style.position =
        "fixed";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents =
        "none";

      document.body.appendChild(
        textArea,
      );

      textArea.focus();
      textArea.select();

      const copied =
        document.execCommand(
          "copy",
        );

      textArea.remove();

      if (copied) {
        toast.success(
          "Photo link copied",
        );
      } else {
        toast.error(
          "Unable to share photo",
          {
            description:
              "Please copy the photo URL manually.",
          },
        );
      }
    } catch (error) {
      // User closing/cancelling the native
      // share dialog is not an application error.
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "Share failed:",
        error,
      );

      toast.error(
        "Share failed",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setSharing(false);
    }
  }

  // --------------------------------------------------
  // Rename
  // --------------------------------------------------

  async function handleRename() {
    const cleanName =
      newName.trim();

    if (!cleanName) {
      toast.error(
        "Photo name cannot be empty",
      );

      return;
    }

    if (
      cleanName.length > 120
    ) {
      toast.error(
        "Photo name cannot exceed 120 characters",
      );

      return;
    }

    if (
      cleanName === photo.name
    ) {
      setRenameOpen(false);
      return;
    }

    setRenaming(true);

    try {
      const response =
        await renamePhoto(
          photo.photoId,
          cleanName,
        );

      const updated =
        response.photo;

      const updatedAt: string =
        updated.updatedAt ??
        photo.updatedAt ??
        new Date().toISOString();

      const updatedPhoto: Photo = {
        ...photo,

        name:
          updated.name,

        ...(updated.originalFileName || photo.originalFileName
          ? { originalFileName: updated.originalFileName ?? photo.originalFileName }
          : {}),

        fileName:
          updated.fileName,

        updatedAt,
      };

      onRenamed?.(
        updatedPhoto,
      );

      setNewName(
        updated.name,
      );

      setRenameOpen(false);

      toast.success(
        "Photo renamed successfully",
      );
    } catch (error) {
      console.error(
        "Rename failed:",
        error,
      );

      toast.error(
        "Rename failed",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setRenaming(false);
    }
  }

  // --------------------------------------------------
  // Move
  // --------------------------------------------------

  async function handleMove() {
    setMoving(true);

    try {
      const folderId =
        selectedFolderId ||
        null;

      const response =
        await movePhotoToFolder(
          photo.photoId,
          folderId,
        );

      const updatedAt: string =
        response.photo
          ?.updatedAt ??
        photo.updatedAt ??
        new Date().toISOString();

      const updatedPhoto: Photo =
        {
          ...photo,

          folderId,

          updatedAt,
        };

      onMoved?.(
        updatedPhoto,
        folderId,
      );

      setMoveOpen(false);

      toast.success(
        folderId
          ? "Photo moved successfully"
          : "Photo moved to root",
      );
    } catch (error) {
      console.error(
        "Move photo failed:",
        error,
      );

      toast.error(
        "Move failed",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setMoving(false);
    }
  }

  // --------------------------------------------------
  // Trash
  // --------------------------------------------------

  async function handleTrash() {
    if (deleting) {
      return;
    }

    setDeleting(true);

    try {
      await trashPhoto(
        photo.photoId,
      );

      setDeleteOpen(false);

      setMenuOpen(false);

      onTrashed?.(photo);

      toast.success(
        "Moved to Trash",
        {
          description:
            `${photo.name} can be restored from Trash.`,
        },
      );
    } catch (error) {
      console.error(
        "Move to trash failed:",
        error,
      );

      toast.error(
        "Couldn't move photo to Trash",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* ==================================================
          Photo Options Menu
      ================================================== */}

      <div
        ref={menuRef}
        className="relative"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() =>
            setMenuOpen(
              (previous) =>
                !previous,
            )
          }
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Options for ${photo.name}`}
          title="Photo options"
          className="border-border bg-background/95 shadow-sm sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
        >
          <MoreVertical
            className="size-4"
          />
        </Button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl"
          >
            {/* ------------------------------------------------
                Rename
            ------------------------------------------------ */}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);

                setNewName(
                  photo.name,
                );

                setRenameOpen(
                  true,
                );
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <Pencil className="size-4" />

              <span>
                Rename
              </span>
            </button>

            {/* ------------------------------------------------
                Move
            ------------------------------------------------ */}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);

                setSelectedFolderId(
                  photo.folderId ||
                    "",
                );

                setMoveOpen(
                  true,
                );
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <FolderInput className="size-4" />

              <span>
                Move to folder
              </span>
            </button>

            {/* ------------------------------------------------
                Download
            ------------------------------------------------ */}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);

                onDownload?.();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <Download className="size-4" />

              <span>
                Download
              </span>
            </button>

            {/* ------------------------------------------------
                Share
            ------------------------------------------------ */}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void handleShare();
              }}
              disabled={sharing}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4" />
              )}

              <span>
                {sharing
                  ? "Preparing..."
                  : "Share"}
              </span>
            </button>

            {/* ------------------------------------------------
                Separator
            ------------------------------------------------ */}

            <div className="my-1 h-px bg-border" />

            {/* ------------------------------------------------
                Move to Trash
            ------------------------------------------------ */}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);

                setDeleteOpen(
                  true,
                );
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />

              <span>
                Move to Trash
              </span>
            </button>
          </div>
        ) : null}
      </div>

      {/* ==================================================
          Rename Dialog
      ================================================== */}

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          if (!renaming) {
            setRenameOpen(
              open,
            );
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Rename photo
            </DialogTitle>

            <DialogDescription>
              Give this photo a name
              you'll recognize in
              your library.
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
              onChange={(event) =>
                setNewName(
                  event.target
                    .value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
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
              onClick={() =>
                setRenameOpen(
                  false,
                )
              }
              disabled={renaming}
            >
              Cancel
            </Button>

            <Button
              onClick={() =>
                void handleRename()
              }
              disabled={
                renaming ||
                !newName.trim()
              }
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

      {/* ==================================================
          Move Dialog
      ================================================== */}

      <Dialog
        open={moveOpen}
        onOpenChange={(open) => {
          if (!moving) {
            setMoveOpen(
              open,
            );
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Move photo
            </DialogTitle>

            <DialogDescription>
              Choose where you want
              to store this photo.
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
              value={
                selectedFolderId
              }
              disabled={moving}
              onChange={(event) =>
                setSelectedFolderId(
                  event.target
                    .value,
                )
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="">
                Root / My Photos
              </option>

              {folders.map(
                (folder) => (
                  <option
                    key={
                      folder.folderId
                    }
                    value={
                      folder.folderId
                    }
                  >
                    {folder.name}
                  </option>
                ),
              )}
            </select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setMoveOpen(
                  false,
                )
              }
              disabled={moving}
            >
              Cancel
            </Button>

            <Button
              onClick={() =>
                void handleMove()
              }
              disabled={moving}
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

      {/* ==================================================
          Trash Confirmation
      ================================================== */}

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteOpen(
              open,
            );
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Move to Trash?
            </DialogTitle>

            <DialogDescription>
              <strong className="text-foreground">
                {photo.name}
              </strong>{" "}
              will be moved to Trash.
              You can restore it later.
              The photo will not be
              permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteOpen(
                  false,
                )
              }
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={() =>
                void handleTrash()
              }
              disabled={deleting}
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