    import {
    ArrowLeft,
    Heart,
    Loader2,
    RefreshCw,
    } from "lucide-react";

    import {
    createFileRoute,
    Link,
    useNavigate,
    } from "@tanstack/react-router";

    import {
    useCallback,
    useEffect,
    useState,
    } from "react";

    import { toast } from "sonner";

    import { Navbar } from "@/components/Navbar";

    import {
    MobileNav,
    Sidebar,
    } from "@/components/Sidebar";

    import {
    PhotoGallery,
    } from "@/components/PhotoGallery";

    import {
    getPhotos,
    type PhotoApiItem,
    } from "@/services/api";

    import type {
    Folder,
    } from "@/types/folder";

    import type {
    Photo,
    } from "@/types/photo";

    import {
    useAuth,
    } from "@/hooks/useAuth";

    import {
    Button,
    } from "@/components/ui/button";

    export const Route =
    createFileRoute(
        "/favorites",
    )({
        component:
        FavoritesPage,
    });

    function FavoritesPage() {
    const {
        isAuthenticated,
        ready,
    } = useAuth();

    const navigate =
        useNavigate();

    const [
        photos,
        setPhotos,
    ] = useState<Photo[]>(
        [],
    );

    const [
        folders,
        setFolders,
    ] = useState<Folder[]>(
        [],
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState("");

    useEffect(() => {
        if (!ready) {
        return;
        }

        if (!isAuthenticated) {
        void navigate({
            to: "/login",
            replace: true,
        });
        }
    }, [
        ready,
        isAuthenticated,
        navigate,
    ]);

    const loadFavorites =
        useCallback(
        async () => {
            if (
            !isAuthenticated
            ) {
            return;
            }

            try {
            setLoading(true);
            setError("");

            const response =
                await getPhotos({
                sort: "newest",
                type: "all",
                });

            const favoritePhotos =
                (
                response.photos ??
                []
                )
                .filter(
                    (
                    photo,
                    ) =>
                    photo.isFavorite ===
                    true,
                )
                .map(
                    (
                    photo: PhotoApiItem,
                    ): Photo => {
                    const fallbackName =
                        photo.name ||
                        photo.fileName ||
                        photo.originalFileName ||
                        "Untitled photo";

                    return {
                        id:
                        photo.photoId,

                        photoId:
                        photo.photoId,

                        userId:
                        photo.userId,

                        key:
                        photo.s3Key,

                        s3Key:
                        photo.s3Key,

                        name:
                        fallbackName,

                        originalFileName:
                        photo.originalFileName ??
                        photo.fileName ??
                        fallbackName,

                        fileName:
                        photo.fileName ??
                        photo.originalFileName ??
                        fallbackName,

                        contentType:
                        photo.contentType,

                        fileSize:
                        photo.fileSize,

                        url:
                        photo.downloadUrl ||
                        photo.url ||
                        "",

                        downloadUrl:
                        photo.downloadUrl ||
                        photo.url ||
                        "",

                        folderId:
                        photo.folderId ??
                        null,

                        createdAt:
                        photo.createdAt,

                        updatedAt:
                        photo.updatedAt ??
                        photo.createdAt,

                        uploadedAt:
                        photo.createdAt,

                        isTrashed:
                        photo.isTrashed ??
                        false,

                        trashedAt:
                        photo.trashedAt ??
                        null,

                        isFavorite:
                        photo.isFavorite ??
                        false,
                    };
                    },
                );

            setPhotos(
                favoritePhotos,
            );
            } catch (error) {
            console.error(
                "Failed to load favorites:",
                error,
            );

            setPhotos([]);

            setError(
                error instanceof Error
                ? error.message
                : "Unable to load Favorites.",
            );
            } finally {
            setLoading(false);
            }
        },
        [
            isAuthenticated,
        ],
        );

    useEffect(() => {
        void loadFavorites();
    }, [
        loadFavorites,
    ]);

    function handleFavoriteChanged(
        updatedPhoto: Photo,
    ) {
        if (
        !updatedPhoto.isFavorite
        ) {
        setPhotos(
            (previous) =>
            previous.filter(
                (photo) =>
                photo.photoId !==
                updatedPhoto.photoId,
            ),
        );

        return;
        }

        setPhotos(
        (previous) =>
            previous.map(
            (photo) =>
                photo.photoId ===
                updatedPhoto.photoId
                ? {
                    ...photo,
                    ...updatedPhoto,
                    }
                : photo,
            ),
        );
    }

    if (
        !ready ||
        !isAuthenticated
    ) {
        return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="size-6 animate-spin text-primary" />
        </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
        <Navbar />

        <MobileNav />

        <div className="mx-auto flex w-full max-w-[1600px]">
            <Sidebar />

            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Link
                    to="/dashboard"
                    className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
                    >
                    <ArrowLeft className="size-4" />

                    Back to Photos
                    </Link>

                    <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                        <Heart className="size-5 fill-current" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                        Favorites
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                        Your favorite photos in one place.
                        </p>
                    </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    onClick={() =>
                    void loadFavorites()
                    }
                    disabled={loading}
                >
                    <RefreshCw
                    className={`mr-2 size-4 ${
                        loading
                        ? "animate-spin"
                        : ""
                    }`}
                    />

                    Refresh
                </Button>
                </div>

                {error ? (
                <div className="mb-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                </div>
                ) : null}

                {!loading &&
                photos.length === 0 ? (
                <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                    <Heart className="size-7" />
                    </div>

                    <h2 className="mt-5 text-xl font-semibold">
                    No favorites yet
                    </h2>

                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Add photos to Favorites
                    from the photo menu and
                    they'll appear here.
                    </p>

                    <Button
                    className="mt-5"
                    onClick={() =>
                        void navigate({
                        to: "/dashboard",
                        })
                    }
                    >
                    Browse Photos
                    </Button>
                </div>
                ) : (
                <PhotoGallery
                    photos={photos}
                    folders={folders}
                    loading={loading}
                    onUploadClick={() => {}}
                    onRetry={() =>
                    void loadFavorites()
                    }
                    onRenamed={() => {}}
                    onMoved={() => {}}
                />
                )}
            </div>
            </main>
        </div>
        </div>
    );
    }

    export default FavoritesPage;