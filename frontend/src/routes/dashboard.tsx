import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Navbar } from "@/components/Navbar";
import { PhotoGallery } from "@/components/PhotoGallery";
import { MobileNav, Sidebar } from "@/components/Sidebar";
import { UploadPhoto } from "@/components/UploadPhoto";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MOCK_PHOTOS, type Photo } from "@/services/mock-photos";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your photos — Photos" },
      {
        name: "description",
        content: "Browse your photo library, upload new photos and download originals.",
      },
      { property: "og:title", content: "Your photos — Photos" },
      {
        property: "og:description",
        content: "Browse your photo library, upload new photos and download originals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, isAuthenticated, ready } = useAuth();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (ready && !isAuthenticated) void navigate({ to: "/login", replace: true });
  }, [ready, isAuthenticated, navigate]);

  // Mock read: replace with the backend list endpoint when it exists.
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingPhotos(true);
    const timer = window.setTimeout(() => {
      setPhotos(MOCK_PHOTOS);
      setLoadingPhotos(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        <span className="sr-only">Loading your library</span>
      </div>
    );
  }

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <MobileNav />
      <div className="mx-auto flex w-full max-w-[1600px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold capitalize sm:text-3xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {photos.length > 0
                  ? `${photos.length} photo${photos.length === 1 ? "" : "s"} in your library`
                  : "Your library is ready for its first memory."}
              </p>
            </div>
            <Button className="w-full sm:w-auto" onClick={() => setUploadOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Upload photo
            </Button>
          </div>

          <h2 className="mt-8 mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your photos
          </h2>

          <PhotoGallery
            photos={photos}
            loading={loadingPhotos}
            onUploadClick={() => setUploadOpen(true)}
          />
        </main>
      </div>

      <UploadPhoto
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(photo) => setPhotos((previous) => [photo, ...previous])}
      />
    </div>
  );
}
