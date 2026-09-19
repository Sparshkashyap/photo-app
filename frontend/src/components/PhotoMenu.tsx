import {
  Download,
  FolderInput,
  Loader2,
  MoreVertical,
  Pencil,
} from "lucide-react";

import { useState } from "react";

import { MoveToFolderDialog } from "@/components/MoveToFolderDialog";
import { RenamePhotoDialog } from "@/components/RenamePhotoDialog";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

type PhotoWithFolder = Photo & {
  folderId?: string | null;
};

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

  onDownload: () => Promise<void>;
};

export function PhotoMenu({
  photo,
  folders,
  onRenamed,
  onMoved,
  onDownload,
}: PhotoMenuProps) {
  const [open, setOpen] =
    useState(false);

  const [renameOpen, setRenameOpen] =
    useState(false);

  const [moveOpen, setMoveOpen] =
    useState(false);

  const [downloading, setDownloading] =
    useState(false);

  // --------------------------------------------------
  // Download
  // --------------------------------------------------

  async function handleDownload() {
    if (downloading) return;

    setDownloading(true);

    try {
      await onDownload();
    } catch (error) {
      console.error(
        "Download failed:",
        error,
      );
    } finally {
      setDownloading(false);
      setOpen(false);
    }
  }

  // --------------------------------------------------
  // Rename
  // --------------------------------------------------

  function handleRenameOpen() {
    setOpen(false);
    setRenameOpen(true);
  }

  // --------------------------------------------------
  // Move
  // --------------------------------------------------

  function handleMoveOpen() {
    setOpen(false);
    setMoveOpen(true);
  }

  const photoWithFolder =
    photo as PhotoWithFolder;

  return (
    <>
      {/* ------------------------------------------------
          Menu
      ------------------------------------------------ */}

      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setOpen(
              (previous) =>
                !previous,
            )
          }
          aria-label={`Options for ${
            photo.name ||
            photo.fileName ||
            "photo"
          }`}
          aria-expanded={open}
          title="Photo options"
          className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground shadow-soft transition hover:bg-accent hover:text-accent-foreground sm:opacity-0 sm:group-hover:opacity-100"
        >
          <MoreVertical
            className="size-4"
            aria-hidden="true"
          />
        </button>

        {open ? (
          <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            {/* Rename */}

            <button
              type="button"
              onClick={handleRenameOpen}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-accent"
            >
              <Pencil
                className="size-4"
                aria-hidden="true"
              />

              <span>
                Rename
              </span>
            </button>

            {/* Move */}

            <button
              type="button"
              onClick={handleMoveOpen}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-accent"
            >
              <FolderInput
                className="size-4"
                aria-hidden="true"
              />

              <span>
                Move to folder
              </span>
            </button>

            {/* Download */}

            <button
              type="button"
              disabled={downloading}
              onClick={() => {
                void handleDownload();
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download
                  className="size-4"
                  aria-hidden="true"
                />
              )}

              <span>
                Download
              </span>
            </button>
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------
          Rename Dialog
      ------------------------------------------------ */}

      <RenamePhotoDialog
        open={renameOpen}
        onOpenChange={
          setRenameOpen
        }
        photo={photo}
        onRenamed={(
          updatedPhoto,
        ) => {
          onRenamed?.(
            updatedPhoto,
          );
        }}
      />

      {/* ------------------------------------------------
          Move To Folder Dialog
      ------------------------------------------------ */}

      <MoveToFolderDialog
        open={moveOpen}
        onOpenChange={
          setMoveOpen
        }
        photoId={
          photo.photoId
        }
        folders={folders}
        currentFolderId={
          photoWithFolder.folderId ??
          null
        }
        onMoved={(
          folderId,
        ) => {
          onMoved?.(
            photo,
            folderId,
          );
        }}
      />
    </>
  );
}

export default PhotoMenu;