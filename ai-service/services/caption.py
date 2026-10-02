from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
import torch


MODEL_NAME = "Salesforce/blip-image-captioning-base"


print("Loading BLIP processor...")

processor = BlipProcessor.from_pretrained(MODEL_NAME)

print("Loading BLIP model...")

model = BlipForConditionalGeneration.from_pretrained(MODEL_NAME)

model.eval()

print("BLIP model loaded successfully!")


def generate_caption(image: Image.Image) -> str:
    """
    Generate an image caption using Salesforce BLIP.
    """

    image = image.convert("RGB")

    inputs = processor(
        images=image,
        return_tensors="pt",
    )

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=30,
        )

    caption = processor.decode(
        output[0],
        skip_special_tokens=True,
    )

    return caption.strip()