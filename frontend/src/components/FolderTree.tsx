import {
  Folder,
  FolderOpen,
  Plus,
} from "lucide-react";

import type { Folder as FolderType } from "@/types/folder";

import { Button } from "@/components/ui/button";

import { FolderCard } from "@/components/FolderCard";

export function FolderTree({
  folders,
  selectedFolderId,
  onSelect,
  onCreateFolder,
  onChanged,
}: {
  folders: FolderType[];

  selectedFolderId: string | null;

  onSelect: (
    folderId: string | null,
  ) => void;

  onCreateFolder: () => void;

  onChanged: () => void;
}) {
  return (
    <aside className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="size-4 text-muted-foreground" />

          <h2 className="text-sm font-semibold">
            Folders
          </h2>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onCreateFolder}
          aria-label="Create folder"
          title="Create folder"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {/* Root */}
        <button
          type="button"
          onClick={() =>
            onSelect(null)
          }
          className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
            selectedFolderId === null
              ? "border-primary bg-accent"
              : "border-border bg-surface hover:bg-accent/60"
          }`}
        >
          <Folder
            className={`size-5 ${
              selectedFolderId === null
                ? "fill-current text-primary"
                : "text-muted-foreground"
            }`}
          />

          <span className="text-sm font-medium">
            All photos
          </span>
        </button>

        {folders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
            <Folder className="mx-auto size-7 text-muted-foreground" />

            <p className="mt-2 text-xs text-muted-foreground">
              No folders yet.
            </p>

            <button
              type="button"
              onClick={onCreateFolder}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Create your first folder
            </button>
          </div>
        ) : (
          folders.map((folder) => (
            <FolderCard
              key={folder.folderId}
              folder={folder}
              selected={
                selectedFolderId ===
                folder.folderId
              }
              onSelect={() =>
                onSelect(
                  folder.folderId,
                )
              }
              onChanged={
                onChanged
              }
            />
          ))
        )}
      </div>
    </aside>
  );
}