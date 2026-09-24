import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Share2,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";

import {
  Button,
} from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  createShare,
  revokeShare,
} from "@/services/api";

import type {
  Photo,
} from "@/types/photo";

type SharePhotoDialogProps = {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  photo: Photo;
};

export function SharePhotoDialog({
  open,
  onOpenChange,
  photo,
}: SharePhotoDialogProps) {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    revoking,
    setRevoking,
  ] = useState(false);

  const [
    shareUrl,
    setShareUrl,
  ] = useState("");

  const [
    shareId,
    setShareId,
  ] = useState("");

  const [
    expiresAt,
    setExpiresAt,
  ] = useState<
    string | null
  >(null);

  const [
    copied,
    setCopied,
  ] = useState(false);

  useEffect(() => {
    if (!open) {
      setShareUrl("");
      setShareId("");
      setExpiresAt(null);
      setCopied(false);
    }
  }, [open]);

  async function handleCreateShare() {
    if (
      loading ||
      revoking
    ) {
      return;
    }

    setLoading(true);

    try {
      const response =
        await createShare(
          photo.photoId,
        );

      const share =
        response.share;

      const generatedUrl =
        share.shareUrl ||
        `${window.location.origin}/shared/${encodeURIComponent(
          share.token,
        )}`;

      setShareUrl(
        generatedUrl,
      );

      setShareId(
        share.shareId,
      );

      setExpiresAt(
        share.expiresAt ??
          null,
      );

      setCopied(false);

      toast.success(
        "Share link created",
      );
    } catch (error) {
      console.error(
        "Create share failed:",
        error,
      );

      toast.error(
        "Couldn't create share link",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        shareUrl,
      );

      setCopied(true);

      toast.success(
        "Share link copied",
      );

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Copy share link failed:",
        error,
      );

      toast.error(
        "Couldn't copy link",
        {
          description:
            "Please copy the link manually.",
        },
      );
    }
  }

  function handleOpenLink() {
    if (!shareUrl) {
      return;
    }

    window.open(
      shareUrl,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function handleRevoke() {
    if (
      revoking ||
      loading ||
      !shareId
    ) {
      return;
    }

    setRevoking(true);

    try {
      await revokeShare(
        photo.photoId,
        shareId,
      );

      setShareUrl("");
      setShareId("");
      setExpiresAt(null);
      setCopied(false);

      toast.success(
        "Share link revoked",
      );
    } catch (error) {
      console.error(
        "Revoke share failed:",
        error,
      );

      toast.error(
        "Couldn't revoke share link",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setRevoking(false);
    }
  }

  function formatExpiry(
    value: string | null,
  ) {
    if (!value) {
      return "No expiry information";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "Expiry unavailable";
    }

    return `Expires ${date.toLocaleString()}`;
  }

  function handleDialogChange(
    nextOpen: boolean,
  ) {
    if (
      loading ||
      revoking
    ) {
      return;
    }

    onOpenChange(
      nextOpen,
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={
        handleDialogChange
      }
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5" />

            Share photo
          </DialogTitle>

          <DialogDescription>
            Create a secure link that
            allows anyone with the link
            to view this photo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* PHOTO INFO */}
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="truncate text-sm font-medium">
              {photo.name ||
                photo.fileName ||
                "Photo"}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Anyone with the generated
              link can access this shared
              photo until the link is
              revoked or expires.
            </p>
          </div>

          {/* CREATE SHARE LINK */}
          {!shareUrl ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Link2 className="size-6" />
              </div>

              <h3 className="mt-3 font-medium">
                Create a share link
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Generate a secure public
                viewing link for this photo.
              </p>

              <Button
                type="button"
                className="mt-5"
                onClick={() =>
                  void handleCreateShare()
                }
                disabled={
                  loading ||
                  revoking
                }
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 size-4" />
                )}

                {loading
                  ? "Creating..."
                  : "Create link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* SHARE URL */}
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label="Share link"
                    onFocus={(
                      event,
                    ) => {
                      event.currentTarget.select();
                    }}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      void handleCopy()
                    }
                    disabled={
                      revoking
                    }
                    aria-label="Copy share link"
                    title="Copy link"
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {formatExpiry(
                    expiresAt,
                  )}
                </p>
              </div>

              {/* ACTIONS */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    handleOpenLink
                  }
                  disabled={
                    revoking
                  }
                >
                  <ExternalLink className="mr-2 size-4" />

                  Open link
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void handleCopy()
                  }
                  disabled={
                    revoking
                  }
                >
                  {copied ? (
                    <Check className="mr-2 size-4" />
                  ) : (
                    <Copy className="mr-2 size-4" />
                  )}

                  {copied
                    ? "Copied"
                    : "Copy link"}
                </Button>
              </div>

              {/* REVOKE */}
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-medium">
                  Stop sharing
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Revoking this link will
                  immediately prevent anyone
                  from accessing this shared
                  photo.
                </p>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    void handleRevoke()
                  }
                  disabled={
                    revoking ||
                    loading
                  }
                >
                  {revoking ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <X className="mr-2 size-4" />
                  )}

                  {revoking
                    ? "Revoking..."
                    : "Revoke link"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onOpenChange(false)
            }
            disabled={
              loading ||
              revoking
            }
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SharePhotoDialog;