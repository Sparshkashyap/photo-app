import {
  FolderPlus,
  Loader2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";

import {
  createFolder,
} from "@/services/api";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (
    open: boolean,
  ) => void;
  onCreated: () => void;
}) {
  const [name, setName] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setCreating(false);
    }
  }, [open]);

  async function handleCreate() {
    const cleanName =
      name.trim();

    if (!cleanName) {
      toast.error(
        "Folder name cannot be empty",
      );
      return;
    }

    if (cleanName.length > 100) {
      toast.error(
        "Folder name cannot exceed 100 characters",
      );
      return;
    }

    setCreating(true);

    try {
      await createFolder(
        cleanName,
      );

      toast.success(
        "Folder created successfully",
      );

      onCreated();

      onOpenChange(false);
    } catch (error) {
      console.error(
        "Create folder failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create folder",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!creating) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Create folder
          </DialogTitle>

          <DialogDescription>
            Organize your photos by creating
            a new folder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="folder-name"
            className="text-sm font-medium"
          >
            Folder name
          </label>

          <input
            id="folder-name"
            value={name}
            maxLength={100}
            disabled={creating}
            autoFocus
            placeholder="e.g. College Memories"
            onChange={(event) =>
              setName(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                void handleCreate();
              }
            }}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <p className="text-xs text-muted-foreground">
            {name.length}/100
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={creating}
            onClick={() =>
              onOpenChange(false)
            }
          >
            Cancel
          </Button>

          <Button
            disabled={
              creating ||
              !name.trim()
            }
            onClick={() =>
              void handleCreate()
            }
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FolderPlus className="size-4" />
            )}

            Create folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}