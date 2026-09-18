import {
  Download,
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

import {
  renamePhoto,
  requestDownloadUrl,
} from "@/services/api";

import type { Photo } from "@/types/photo";

export function PhotoCard({
  photo,
  onRenamed,
}: {
  photo: Photo;
  onRenamed?: (photo: Photo) => void;
}) {
  const [downloading, setDownloading] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [renameOpen, setRenameOpen] =
    useState(false);

  const [newName, setNewName] =
    useState(photo.name);

  const [renaming, setRenaming] =
    useState(false);

  // --------------------------------------------------
  // Download
  // --------------------------------------------------

  async function handleDownload() {
    if (downloading) return;

    setDownloading(true);

    try {
      const { downloadUrl } =
        await requestDownloadUrl(
          photo.photoId,
        );

      const link =
        document.createElement("a");

      link.href = downloadUrl;

      link.download =
        photo.name ||
        photo.fileName;

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
            photo.fileName,
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
            "Please try again.",
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

      const updatedPhoto: Photo = {
        ...photo,

        name: updated.name,

        originalFileName:
          updated.originalFileName ??
          photo.originalFileName,

        fileName:
          updated.fileName,

        updatedAt:
          updated.updatedAt,
      };

      onRenamed?.(updatedPhoto);

      setNewName(updated.name);

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
            "Please try again.",
        },
      );
    } finally {
      setRenaming(false);
    }
  }

  return (
    <>
      <figure className="group relative overflow-hidden rounded-xl border border-border bg-surface-muted">
        <img
          src={photo.url}
          alt={photo.name}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-foreground/45 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block" />

        <figcaption className="pointer-events-none absolute inset-x-3 bottom-3 hidden truncate text-xs font-medium text-background opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block">
          {photo.name}
        </figcaption>

        {/* Menu */}
        <div className="absolute right-2 top-2">
          <button
            type="button"
            onClick={() =>
              setMenuOpen(
                (previous) =>
                  !previous,
              )
            }
            aria-label={`Options for ${photo.name}`}
            title="Photo options"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground shadow-soft transition hover:bg-accent hover:text-accent-foreground sm:opacity-0 sm:group-hover:opacity-100"
          >
            <MoreVertical
              className="size-4"
              aria-hidden="true"
            />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);

                  setNewName(
                    photo.name,
                  );

                  setRenameOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <Pencil className="size-4" />

                Rename
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);

                  void handleDownload();
                }}
                disabled={downloading}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}

                Download
              </button>
            </div>
          ) : null}
        </div>
      </figure>

      {/* Rename Dialog */}
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
              Give this photo a name you'll
              recognize in your library.
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
                  event.key === "Enter"
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
    </>
  );
}