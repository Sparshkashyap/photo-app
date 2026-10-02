from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image


MODEL_NAME = "Salesforce/blip-image-captioning-base"
IMAGE_PATH = "test-image.jpg"


print("Loading processor...")

processor = BlipProcessor.from_pretrained(MODEL_NAME)

print("Loading model...")

model = BlipForConditionalGeneration.from_pretrained(MODEL_NAME)

print("Model loaded successfully!")


print("Loading image...")

image = Image.open(IMAGE_PATH).convert("RGB")

print("Generating caption...")

inputs = processor(
    images=image,
    return_tensors="pt",
)

output = model.generate(
    **inputs,
    max_new_tokens=30,
)

caption = processor.decode(
    output[0],
    skip_special_tokens=True,
)

print()
print("================================")
print("AI CAPTION:")
print(caption)
print("================================")