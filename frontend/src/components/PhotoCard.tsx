import {
  Download,
  FolderInput,
  Loader2,
  MoreVertical,
  Pencil,
} from "lucide-react";

import { useState } from "react";
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

import { MoveToFolderDialog } from "@/components/MoveToFolderDialog";

import {
  movePhotoToFolder,
  renamePhoto,
  requestDownloadUrl,
} from "@/services/api";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

type PhotoCardProps = {
  photo: Photo;

  folders: Folder[];

  onRenamed?: (
    photo: Photo,
  ) => void;

  onMoved?: (
    photo: Photo,
    folderId: string | null,
  ) => void;
};

export function PhotoCard({
  photo,
  folders,
  onRenamed,
  onMoved,
}: PhotoCardProps) {
  const [downloading, setDownloading] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [renameOpen, setRenameOpen] =
    useState(false);

  const [moveOpen, setMoveOpen] =
    useState(false);

  const [newName, setNewName] =
    useState(photo.name ?? "");

  const [renaming, setRenaming] =
    useState(false);

  const [moving, setMoving] =
    useState(false);

  // --------------------------------------------------
  // Download
  // --------------------------------------------------

  async function handleDownload() {
    if (downloading) return;

    setDownloading(true);

    try {
      const response =
        await requestDownloadUrl(
          photo.photoId,
        );

      const link =
        document.createElement("a");

      link.href =
        response.downloadUrl;

      link.download =
        photo.name ||
        photo.fileName ||
        "photo";

      link.rel =
        "noopener noreferrer";

      link.target = "_blank";

      document.body.appendChild(link);

      link.click();

      link.remove();

      toast.success(
        "Download started",
        {
          description:
            photo.name ||
            photo.fileName ||
            "Your file",
        },
      );
    } catch (error) {
      console.error(
        "Download failed:",
        error,
      );

      toast.error(
        "Download failed",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setDownloading(false);
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

    if (cleanName.length > 120) {
      toast.error(
        "Photo name cannot exceed 120 characters",
      );

      return;
    }

    if (cleanName === photo.name) {
      setRenameOpen(false);
      return;
    }

    if (renaming) return;

    setRenaming(true);

    try {
      const response =
        await renamePhoto(
          photo.photoId,
          cleanName,
        );

      const updated =
        response.photo;

      const updatedPhoto: Photo = {
        ...photo,

        name:
          updated.name ??
          cleanName,

        originalFileName:
          updated.originalFileName ??
          photo.originalFileName,

        fileName:
          updated.fileName ??
          photo.fileName,

        updatedAt:
          updated.updatedAt ??
          photo.updatedAt,
      };

      onRenamed?.(
        updatedPhoto,
      );

      setNewName(
        updatedPhoto.name,
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
  // Move to Folder
  // --------------------------------------------------

  async function handleMove(
    folderId: string | null,
  ) {
    if (moving) return;

    setMoving(true);

    try {
      await movePhotoToFolder(
        photo.photoId,
        folderId,
      );

      onMoved?.(
        photo,
        folderId,
      );

      setMoveOpen(false);

      toast.success(
        folderId
          ? "Photo moved to folder"
          : "Photo moved to My Photos",
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

  const isVideo =
    photo.contentType?.startsWith(
      "video/",
    ) ?? false;

  return (
    <>
      {/* ------------------------------------------------
          Photo Card
      ------------------------------------------------ */}

      <figure className="group relative overflow-hidden rounded-xl border border-border bg-surface-muted">
        {/* Media */}

        {isVideo ? (
          <video
            src={photo.url}
            controls
            preload="metadata"
            className="aspect-square w-full object-cover"
          />
        ) : (
          <img
            src={photo.url}
            alt={
              photo.name ||
              photo.fileName ||
              "Photo"
            }
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          />
        )}

        {/* Bottom gradient */}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block" />

        {/* Photo name */}

        <figcaption className="pointer-events-none absolute inset-x-3 bottom-3 hidden truncate text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block">
          {photo.name ||
            photo.fileName ||
            "Untitled photo"}
        </figcaption>

        {/* ------------------------------------------------
            Menu
        ------------------------------------------------ */}

        <div className="absolute right-2 top-2">
          <button
            type="button"
            onClick={() =>
              setMenuOpen(
                (previous) =>
                  !previous,
              )
            }
            aria-label={`Options for ${
              photo.name ||
              photo.fileName ||
              "photo"
            }`}
            title="Photo options"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground shadow-soft transition hover:bg-accent hover:text-accent-foreground sm:opacity-0 sm:group-hover:opacity-100"
          >
            <MoreVertical
              className="size-4"
              aria-hidden="true"
            />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
              {/* Rename */}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);

                  setNewName(
                    photo.name ||
                    photo.fileName ||
                    "",
                  );

                  setRenameOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-accent"
              >
                <Pencil className="size-4" />

                <span>
                  Rename
                </span>
              </button>

              {/* Move */}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setMoveOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-accent"
              >
                <FolderInput className="size-4" />

                <span>
                  Move to folder
                </span>
              </button>

              {/* Download */}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);

                  void handleDownload();
                }}
                disabled={downloading}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}

                <span>
                  Download
                </span>
              </button>
            </div>
          ) : null}
        </div>

        {/* ------------------------------------------------
            Download Loading Overlay
        ------------------------------------------------ */}

        {downloading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
            <span className="flex size-10 items-center justify-center rounded-full bg-background/90 shadow">
              <Loader2 className="size-5 animate-spin" />
            </span>
          </div>
        ) : null}
      </figure>

      {/* --------------------------------------------------
          Rename Dialog
      -------------------------------------------------- */}

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
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  event.preventDefault();

                  void handleRename();
                }
              }}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <p className="text-xs text-muted-foreground">
              {newName.length}/120
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRenameOpen(false)
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

      {/* --------------------------------------------------
          Move To Folder Dialog
      -------------------------------------------------- */}

      <MoveToFolderDialog
        open={moveOpen}
        onOpenChange={(open) => {
          if (!moving) {
            setMoveOpen(open);
          }
        }}
        photoId={photo.photoId}
        folders={folders}
        currentFolderId={
          photo.folderId ?? null
        }
        onMoved={handleMove}
      />
    </>
  );
}