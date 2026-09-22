import {
  Download,
  FolderInput,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
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
  movePhotoToFolder,
  renamePhoto,
  trashPhoto,
} from "@/services/api";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

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
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [renameOpen, setRenameOpen] =
    useState(false);

  const [moveOpen, setMoveOpen] =
    useState(false);

  const [trashOpen, setTrashOpen] =
    useState(false);

  const [newName, setNewName] =
    useState(
      photo.name ||
        photo.fileName ||
        "",
    );

  const [
    selectedFolderId,
    setSelectedFolderId,
  ] = useState<string>(
    photo.folderId || "",
  );

  const [renaming, setRenaming] =
    useState(false);

  const [moving, setMoving] =
    useState(false);

  const [trashing, setTrashing] =
    useState(false);

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

    if (renaming) {
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

      const updatedPhoto: Photo =
        {
          ...photo,

          ...updated,

          name:
            updated.name ||
            cleanName,

          photoId:
            photo.photoId,
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

  async function handleMove() {
    if (moving) {
      return;
    }

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

      const updatedPhoto: Photo =
        {
          ...photo,

          ...response.photo,

          folderId,

          photoId:
            photo.photoId,
        };

      onMoved?.(
        updatedPhoto,
        folderId,
      );

      setMoveOpen(false);

      toast.success(
        folderId
          ? "Photo moved successfully"
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

  async function handleTrash() {
    if (trashing) {
      return;
    }

    setTrashing(true);

    try {
      await trashPhoto(
        photo.photoId,
      );

      setTrashOpen(false);

      setMenuOpen(false);

      onTrashed?.(photo);

      toast.success(
        "Moved to Trash",
        {
          description:
            `${
              photo.name ||
              photo.fileName ||
              "Photo"
            } can be restored from Trash.`,
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
      setTrashing(false);
    }
  }

  return (
    <>
      <div className="relative">
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
          aria-label={`Options for ${
            photo.name ||
            photo.fileName ||
            "photo"
          }`}
          title="Photo options"
          className="border-border bg-background/95 shadow-sm sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
        >
          <MoreVertical className="size-4" />
        </Button>

        {menuOpen ? (
          <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl">
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
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <Pencil className="size-4" />

              Rename
            </button>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);

                setSelectedFolderId(
                  photo.folderId ||
                    "",
                );

                setMoveOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <FolderInput className="size-4" />

              Move to folder
            </button>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);

                onDownload?.();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <Download className="size-4" />

              Download
            </button>

            <div className="my-1 h-px bg-border" />

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);

                setTrashOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />

              Move to Trash
            </button>
          </div>
        ) : null}
      </div>

      {/* Rename */}

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
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
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

      {/* Move */}

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
                  event.target.value,
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
                setMoveOpen(false)
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

      {/* Trash */}

      <Dialog
        open={trashOpen}
        onOpenChange={(open) => {
          if (!trashing) {
            setTrashOpen(open);
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
                {photo.name ||
                  photo.fileName ||
                  "This photo"}
              </strong>{" "}
              will be moved to
              Trash. You can restore
              it later. It will not be
              permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setTrashOpen(false)
              }
              disabled={trashing}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={() =>
                void handleTrash()
              }
              disabled={trashing}
            >
              {trashing ? (
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