import {
  ArrowLeft,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Video,
} from "lucide-react";

import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";

import {
  getSharedPhoto,
} from "@/services/api";

import type {
  SharedPhoto,
} from "@/types/photo";

export const Route =
  createFileRoute("/share/$token")({
    component:
      SharedPhotoPage,
  });

function SharedPhotoPage() {
  const {
    token,
  } = Route.useParams();

  const navigate =
    useNavigate();

  const [
    photo,
    setPhoto,
  ] = useState<
    SharedPhoto | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSharedPhoto() {
      try {
        setLoading(true);
        setError("");

        const response =
          await getSharedPhoto(
            token,
          );

        if (cancelled) {
          return;
        }

        setPhoto(
          response.photo,
        );
      } catch (error) {
        console.error(
          "Failed to load shared photo:",
          error,
        );

        if (cancelled) {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "This shared link is unavailable.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (token) {
      void loadSharedPhoto();
    } else {
      setError(
        "This shared link is invalid.",
      );
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleDownload() {
    if (!photo?.downloadUrl) {
      toast.error(
        "Download is unavailable.",
      );

      return;
    }

    const link =
      document.createElement(
        "a",
      );

    link.href =
      photo.downloadUrl;

    link.download =
      photo.name ||
      photo.fileName ||
      "photo";

    link.target = "_blank";

    link.rel =
      "noopener noreferrer";

    document.body.appendChild(
      link,
    );

    link.click();

    link.remove();

    toast.success(
      "Download started",
    );
  }

  function handleGoBack() {
    void navigate({
      to: "/dashboard",
    });
  }

  const isVideo =
    photo?.contentType?.startsWith(
      "video/",
    ) ?? false;

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={
              handleGoBack
            }
            className="inline-flex items-center gap-2 text-sm font-medium transition hover:text-primary"
          >
            <ArrowLeft className="size-4" />

            Photos
          </button>

          {photo?.downloadUrl ? (
            <button
              type="button"
              onClick={
                handleDownload
              }
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-accent"
            >
              <Download className="size-4" />

              Download
            </button>
          ) : null}
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
        {/* LOADING */}
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />

            <p className="text-sm text-muted-foreground">
              Loading shared photo...
            </p>
          </div>
        ) : error ? (
          /* ERROR */
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ExternalLink className="size-6" />
            </div>

            <h1 className="mt-5 text-xl font-semibold">
              Link unavailable
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {error}
            </p>

            <button
              type="button"
              onClick={
                handleGoBack
              }
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <ArrowLeft className="size-4" />

              Go to Photos
            </button>
          </div>
        ) : photo ? (
          /* SHARED PHOTO */
          <section className="w-full">
            {/* TITLE */}
            <div className="mb-5">
              <h1 className="truncate text-xl font-semibold sm:text-2xl">
                {photo.name ||
                  photo.fileName ||
                  "Shared photo"}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Shared with a secure link
              </p>
            </div>

            {/* PHOTO CARD */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {/* PREVIEW */}
              <div className="flex min-h-[50vh] items-center justify-center bg-black/5 p-2 sm:p-5">
                {photo.downloadUrl ? (
                  isVideo ? (
                    <video
                      src={
                        photo.downloadUrl
                      }
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-[75vh] max-w-full rounded-xl object-contain"
                    />
                  ) : (
                    <img
                      src={
                        photo.downloadUrl
                      }
                      alt={
                        photo.name ||
                        photo.fileName ||
                        "Shared photo"
                      }
                      className="max-h-[75vh] max-w-full rounded-xl object-contain"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    {isVideo ? (
                      <Video className="size-12" />
                    ) : (
                      <ImageIcon className="size-12" />
                    )}

                    <p>
                      Preview unavailable
                    </p>
                  </div>
                )}
              </div>

              {/* FILE INFO */}
              <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {photo.fileName ||
                      photo.name ||
                      "Shared file"}
                  </p>

                  {photo.fileSize ? (
                    <p className="text-xs text-muted-foreground">
                      {(
                        photo.fileSize /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                    </p>
                  ) : null}
                </div>

                {photo.downloadUrl ? (
                  <button
                    type="button"
                    onClick={
                      handleDownload
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                  >
                    <Download className="size-4" />

                    Download
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default SharedPhotoPage;