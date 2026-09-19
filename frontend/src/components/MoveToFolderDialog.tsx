import {
  Check,
  Folder,
  FolderOpen,
  Loader2,
} from "lucide-react";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
  movePhotoToFolder,
} from "@/services/api";

import type { Folder as FolderType } from "@/types/folder";

type MoveToFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  photoId: string;

  folders: FolderType[];

  currentFolderId?: string | null;

  onMoved?: (
    folderId: string | null,
  ) => void;
};

export function MoveToFolderDialog({
  open,
  onOpenChange,
  photoId,
  folders,
  currentFolderId,
  onMoved,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] =
    useState<string | null>(
      currentFolderId ?? null,
    );

  const [moving, setMoving] =
    useState(false);

  useEffect(() => {
    if (open) {
      setSelectedFolderId(
        currentFolderId ?? null,
      );
    }
  }, [open, currentFolderId]);

  async function handleMove() {
    if (
      selectedFolderId ===
      (currentFolderId ?? null)
    ) {
      onOpenChange(false);
      return;
    }

    setMoving(true);

    try {
      await movePhotoToFolder(
        photoId,
        selectedFolderId,
      );

      onMoved?.(
        selectedFolderId,
      );

      toast.success(
        selectedFolderId
          ? "Photo moved successfully"
          : "Photo moved to My Photos",
      );

      onOpenChange(false);
    } catch (error) {
      console.error(
        "Move photo failed:",
        error,
      );

      toast.error(
        "Unable to move photo",
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

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!moving) {
          onOpenChange(value);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move photo
          </DialogTitle>

          <DialogDescription>
            Choose where you want to keep this
            photo.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[360px] space-y-2 overflow-y-auto py-2">
          {/* Root */}
          <button
            type="button"
            disabled={moving}
            onClick={() =>
              setSelectedFolderId(null)
            }
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
              selectedFolderId === null
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent"
            }`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
              <FolderOpen className="size-5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                My Photos
              </span>

              <span className="block text-xs text-muted-foreground">
                Root library
              </span>
            </span>

            {selectedFolderId ===
            null ? (
              <Check className="size-4 text-primary" />
            ) : null}
          </button>

          {folders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <Folder className="mx-auto size-8 text-muted-foreground" />

              <p className="mt-3 text-sm font-medium">
                No folders yet
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Create a folder from the
                dashboard first.
              </p>
            </div>
          ) : (
            folders.map((folder) => {
              const selected =
                selectedFolderId ===
                folder.folderId;

              return (
                <button
                  key={folder.folderId}
                  type="button"
                  disabled={moving}
                  onClick={() =>
                    setSelectedFolderId(
                      folder.folderId,
                    )
                  }
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <Folder className="size-5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {folder.name}
                    </span>

                    <span className="block text-xs text-muted-foreground">
                      Folder
                    </span>
                  </span>

                  {selected ? (
                    <Check className="size-4 text-primary" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={moving}
            onClick={() =>
              onOpenChange(false)
            }
          >
            Cancel
          </Button>

          <Button
            disabled={moving}
            onClick={() =>
              void handleMove()
            }
          >
            {moving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}

            {moving
              ? "Moving..."
              : "Move photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}