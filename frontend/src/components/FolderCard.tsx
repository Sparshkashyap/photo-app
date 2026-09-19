import {
  Folder,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import { useState } from "react";

import { toast } from "sonner";

import type { Folder as FolderType } from "@/types/folder";

import {
  deleteFolder,
  renameFolder,
} from "@/services/api";

export function FolderCard({
  folder,
  selected,
  onSelect,
  onChanged,
}: {
  folder: FolderType;
  selected: boolean;
  onSelect: () => void;
  onChanged: () => void;
}) {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  async function handleRename() {
    const nextName =
      window.prompt(
        "Enter a new folder name:",
        folder.name,
      );

    if (nextName === null) {
      return;
    }

    const cleanName =
      nextName.trim();

    if (!cleanName) {
      toast.error(
        "Folder name cannot be empty",
      );
      return;
    }

    if (
      cleanName === folder.name
    ) {
      setMenuOpen(false);
      return;
    }

    setBusy(true);

    try {
      await renameFolder(
        folder.folderId,
        cleanName,
      );

      toast.success(
        "Folder renamed successfully",
      );

      setMenuOpen(false);

      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to rename folder",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        `Delete "${folder.name}"?\n\nPhotos inside this folder may no longer appear under this folder.`,
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    try {
      await deleteFolder(
        folder.folderId,
      );

      toast.success(
        "Folder deleted",
      );

      setMenuOpen(false);

      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete folder",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`group relative flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
        selected
          ? "border-primary bg-accent"
          : "border-border bg-surface hover:bg-accent/60"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={busy}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <Folder
          className={`size-5 shrink-0 ${
            selected
              ? "fill-current text-primary"
              : "text-muted-foreground"
          }`}
          aria-hidden="true"
        />

        <span className="min-w-0 truncate text-sm font-medium">
          {folder.name}
        </span>
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          setMenuOpen(
            (value) => !value,
          )
        }
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground"
        aria-label={`Options for ${folder.name}`}
      >
        <MoreVertical className="size-4" />
      </button>

      {menuOpen ? (
        <div className="absolute right-2 top-11 z-30 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void handleRename()
            }
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
          >
            <Pencil className="size-4" />
            Rename
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void handleDelete()
            }
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}