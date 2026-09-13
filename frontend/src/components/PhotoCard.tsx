import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { requestDownloadUrl } from "@/services/api";
import type { Photo } from "@/services/mock-photos";

export function PhotoCard({ photo }: { photo: Photo }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const { downloadUrl } = await requestDownloadUrl(photo.key);
      // Presigned URLs are fetched straight from storage, never proxied.
      const href = downloadUrl.startsWith("mock://") ? photo.url : downloadUrl;
      const link = document.createElement("a");
      link.href = href;
      link.download = photo.name;
      link.rel = "noopener";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Download started", { description: photo.name });
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
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
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-label={`Download ${photo.name}`}
        className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground shadow-soft transition hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 disabled:opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
      >
        {downloading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
      </button>
    </figure>
  );
}
