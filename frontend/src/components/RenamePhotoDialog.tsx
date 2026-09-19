import {
  Loader2,
  Pencil,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

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

import { renamePhoto } from "@/services/api";

import type { Photo } from "@/types/photo";

type RenamePhotoDialogProps = {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  photo: Photo;

  onRenamed?: (
    photo: Photo,
  ) => void;
};

export function RenamePhotoDialog({
  open,
  onOpenChange,
  photo,
  onRenamed,
}: RenamePhotoDialogProps) {
  const [name, setName] =
    useState(photo.name);

  const [saving, setSaving] =
    useState(false);

  // Reset the input whenever
  // the dialog is opened.
  useEffect(() => {
    if (open) {
      setName(photo.name);
    }
  }, [open, photo.name]);

  // --------------------------------------------------
  // Rename photo
  // --------------------------------------------------

  async function handleRename() {
    const cleanName =
      name.trim();

    // Validate empty name
    if (!cleanName) {
      toast.error(
        "Photo name cannot be empty",
      );

      return;
    }

    // Validate maximum length
    if (cleanName.length > 120) {
      toast.error(
        "Photo name cannot exceed 120 characters",
      );

      return;
    }

    // If name has not changed,
    // simply close the dialog.
    if (
      cleanName === photo.name
    ) {
      onOpenChange(false);

      return;
    }

    setSaving(true);

    try {
      const response =
        await renamePhoto(
          photo.photoId,
          cleanName,
        );

      const updated =
        response.photo;

      // Preserve the existing photo
      // and update the fields returned
      // by the backend.
      const updatedPhoto: Photo = {
        ...photo,

        name:
          updated.name,

        fileName:
          updated.fileName ??
          photo.fileName,

        originalFileName:
          updated.originalFileName ??
          photo.originalFileName,

        updatedAt:
          updated.updatedAt ??
          photo.updatedAt,
      };

      // Send the updated photo
      // back to the parent component.
      onRenamed?.(
        updatedPhoto,
      );

      toast.success(
        "Photo renamed successfully",
      );

      onOpenChange(false);
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
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        // Do not allow the dialog
        // to close while saving.
        if (!saving) {
          onOpenChange(value);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Rename photo
          </DialogTitle>

          <DialogDescription>
            Give this photo a name you can
            easily recognize later.
          </DialogDescription>
        </DialogHeader>

        {/* --------------------------------------------
            Photo name input
        --------------------------------------------- */}

        <div className="space-y-2">
          <label
            htmlFor={`rename-${photo.photoId}`}
            className="text-sm font-medium"
          >
            Photo name
          </label>

          <input
            id={`rename-${photo.photoId}`}
            value={name}
            maxLength={120}
            autoFocus
            disabled={saving}
            placeholder="Enter photo name"
            onChange={(event) => {
              setName(
                event.target.value,
              );
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                event.preventDefault();

                void handleRename();
              }
            }}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Maximum 120 characters
            </span>

            <span>
              {name.length}/120
            </span>
          </div>
        </div>

        {/* --------------------------------------------
            Dialog actions
        --------------------------------------------- */}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={
              saving ||
              !name.trim()
            }
            onClick={() => {
              void handleRename();
            }}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Pencil
                className="size-4"
                aria-hidden="true"
              />
            )}

            {saving
              ? "Saving..."
              : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RenamePhotoDialog;