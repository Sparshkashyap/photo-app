from fastapi import FastAPI, File, UploadFile, HTTPException
from PIL import Image
from services.caption import generate_caption
import io


app = FastAPI(
    title="Photo App AI Service",
    version="1.0.0",
)


ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}


@app.get("/")
def health_check():
    return {
        "success": True,
        "service": "Photo App AI Service",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "ai_model": "Salesforce/blip-image-captioning-base",
        "status": "ready",
    }


@app.post("/caption")
async def caption_image(
    file: UploadFile = File(...),
):
    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="File content type is missing",
        )

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG, PNG and WEBP images are supported",
        )

    try:
        file_bytes = await file.read()

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty",
            )

        image = Image.open(
            io.BytesIO(file_bytes)
        ).convert("RGB")

    except HTTPException:
        raise

    except Exception as error:
        print("Image processing error:", error)

        raise HTTPException(
            status_code=400,
            detail="Invalid image file",
        )

    try:
        caption = generate_caption(image)

        return {
            "success": True,
            "caption": caption,
        }

    except Exception as error:
        print(
            "Caption generation error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to generate image caption",
        )