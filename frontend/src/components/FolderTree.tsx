import {
  Folder,
  FolderPlus,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  toast,
} from "sonner";

import type { Folder as FolderType } from "@/types/folder";

import {
  deleteFolder,
  renameFolder,
} from "@/services/api";

import { Button } from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ==================================================
// TYPES
// ==================================================

type FolderTreeProps = {
  folders: FolderType[];

  selectedFolderId:
    | string
    | null;

  onSelect: (
    folderId: string | null,
  ) => void;

  onCreateFolder: () => void;

  onChanged: () => void;
};

// ==================================================
// COMPONENT
// ==================================================

export function FolderTree({
  folders,
  selectedFolderId,
  onSelect,
  onCreateFolder,
  onChanged,
}: FolderTreeProps) {
  const [
    editingFolderId,
    setEditingFolderId,
  ] = useState<
    string | null
  >(null);

  const [
    editingName,
    setEditingName,
  ] = useState("");

  const [
    savingFolderId,
    setSavingFolderId,
  ] = useState<
    string | null
  >(null);

  const [
    deletingFolderId,
    setDeletingFolderId,
  ] = useState<
    string | null
  >(null);

  // ==================================================
  // START RENAME
  // ==================================================

  function startRename(
    folder: FolderType,
  ) {
    setEditingFolderId(
      folder.folderId,
    );

    setEditingName(
      folder.name,
    );
  }

  // ==================================================
  // CANCEL RENAME
  // ==================================================

  function cancelRename() {
    setEditingFolderId(
      null,
    );

    setEditingName("");
  }

  // ==================================================
  // SAVE RENAME
  // ==================================================

  async function saveRename(
    folderId: string,
  ) {
    const trimmedName =
      editingName.trim();

    if (!trimmedName) {
      toast.error(
        "Folder name cannot be empty.",
      );

      return;
    }

    try {
      setSavingFolderId(
        folderId,
      );

      await renameFolder(
        folderId,
        trimmedName,
      );

      toast.success(
        "Folder renamed",
      );

      cancelRename();

      onChanged();
    } catch (error) {
      console.error(
        "Failed to rename folder:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to rename folder.",
      );
    } finally {
      setSavingFolderId(
        null,
      );
    }
  }

  // ==================================================
  // DELETE FOLDER
  // ==================================================

  async function handleDeleteFolder(
    folder: FolderType,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${folder.name}"? Photos inside this folder will not be deleted.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingFolderId(
        folder.folderId,
      );

      await deleteFolder(
        folder.folderId,
      );

      if (
        selectedFolderId ===
        folder.folderId
      ) {
        onSelect(null);
      }

      toast.success(
        "Folder deleted",
      );

      onChanged();
    } catch (error) {
      console.error(
        "Failed to delete folder:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete folder.",
      );
    } finally {
      setDeletingFolderId(
        null,
      );
    }
  }

  // ==================================================
  // EMPTY STATE
  // ==================================================

  const hasFolders =
    folders.length > 0;

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="space-y-3">
      {/* ==================================================
          FOLDER GRID
          ================================================== */}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {/* ==================================================
            ALL PHOTOS CARD
            ================================================== */}

        <button
          type="button"
          onClick={() =>
            onSelect(null)
          }
          aria-current={
            selectedFolderId ===
            null
              ? "page"
              : undefined
          }
          className={[
            "group relative flex min-h-[92px] flex-col justify-between rounded-xl border p-4 text-left transition-all",
            selectedFolderId ===
            null
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-background hover:border-primary/40 hover:bg-muted/50",
          ].join(" ")}
        >
          <div className="flex items-start justify-between">
            <div
              className={[
                "flex size-10 items-center justify-center rounded-xl transition",
                selectedFolderId ===
                null
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary group-hover:bg-primary/15",
              ].join(" ")}
            >
              <Folder className="size-5" />
            </div>
          </div>

          <div className="mt-3">
            <p className="truncate text-sm font-semibold">
              All photos
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Library
            </p>
          </div>
        </button>

        {/* ==================================================
            CREATE FOLDER CARD
            ================================================== */}

        <button
          type="button"
          onClick={
            onCreateFolder
          }
          className="group flex min-h-[92px] flex-col justify-between rounded-xl border border-dashed border-border bg-background p-4 text-left transition-all hover:border-primary/50 hover:bg-muted/50"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
            <FolderPlus className="size-5" />
          </div>

          <div className="mt-3">
            <p className="truncate text-sm font-semibold">
              New folder
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Create folder
            </p>
          </div>
        </button>

        {/* ==================================================
            FOLDERS
            ================================================== */}

        {folders.map(
          (folder) => {
            const selected =
              selectedFolderId ===
              folder.folderId;

            const editing =
              editingFolderId ===
              folder.folderId;

            const saving =
              savingFolderId ===
              folder.folderId;

            const deleting =
              deletingFolderId ===
              folder.folderId;

            return (
              <div
                key={
                  folder.folderId
                }
                className={[
                  "group relative min-h-[92px] rounded-xl border p-4 transition-all",
                  selected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-background hover:border-primary/40 hover:bg-muted/50",
                ].join(" ")}
              >
                {/* ==================================================
                    MENU
                    ================================================== */}

                <div className="absolute right-2 top-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                    >
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-full text-muted-foreground opacity-70 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                        aria-label={`Actions for ${folder.name}`}
                        disabled={
                          saving ||
                          deleting
                        }
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      className="w-44"
                    >
                      <DropdownMenuItem
                        onSelect={() =>
                          startRename(
                            folder,
                          )
                        }
                      >
                        <Pencil className="size-4" />

                        Rename
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() =>
                          void handleDeleteFolder(
                            folder,
                          )
                        }
                      >
                        <Trash2 className="size-4" />

                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* ==================================================
                    CONTENT
                    ================================================== */}

                {editing ? (
                  <div className="flex h-full flex-col justify-between gap-2 pr-2">
                    <Input
                      autoFocus
                      value={
                        editingName
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditingName(
                          event.target
                            .value,
                        )
                      }
                      onKeyDown={(
                        event,
                      ) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          event.preventDefault();

                          void saveRename(
                            folder.folderId,
                          );
                        }

                        if (
                          event.key ===
                          "Escape"
                        ) {
                          event.preventDefault();

                          cancelRename();
                        }
                      }}
                      className="h-9 text-sm"
                      disabled={
                        saving
                      }
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          void saveRename(
                            folder.folderId,
                          )
                        }
                        disabled={
                          saving
                        }
                      >
                        {saving
                          ? "Saving..."
                          : "Save"}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={
                          cancelRename
                        }
                        disabled={
                          saving
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onSelect(
                        folder.folderId,
                      )
                    }
                    className="flex h-full w-full flex-col justify-between text-left"
                  >
                    <div className="flex items-start">
                      <div
                        className={[
                          "flex size-10 items-center justify-center rounded-xl transition",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                        ].join(
                          " ",
                        )}
                      >
                        <Folder className="size-5" />
                      </div>
                    </div>

                    <div className="mt-3 pr-5">
                      <p className="truncate text-sm font-semibold">
                        {
                          folder.name
                        }
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Folder
                      </p>
                    </div>
                  </button>
                )}
              </div>
            );
          },
        )}
      </div>

      {/* ==================================================
          NO FOLDERS MESSAGE
          ================================================== */}

      {!hasFolders ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center">
          <p className="text-sm font-medium">
            No folders yet
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Create a folder to organize your photos.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default FolderTree;