from PIL import Image, ImageDraw
import os

input_path = r"C:\Users\ufffu\.gemini\antigravity\brain\02242566-3183-46aa-a1cb-c0e329dc64b7\evil_eye_transparent_1772532151395.png"
output_ico = r"c:\liebe\static\icons\icon.ico"
output_png = r"c:\liebe\static\icons\icon-512.png"

img = Image.open(input_path).convert("RGBA")
width, height = img.size

# Create a circular mask to remove the square background
mask = Image.new("L", (width, height), 0)
draw = ImageDraw.Draw(mask)
# Draw a white circle on the black mask
draw.ellipse((0, 0, width, height), fill=255)

# Apply the mask to the alpha channel
result = Image.new("RGBA", (width, height), (0, 0, 0, 0))
result.paste(img, (0, 0), mask=mask)

# Save the transparency corrected PNG
result.save(output_png, format="PNG")

# Save as ICO with transparency
icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
result.save(output_ico, format="ICO", sizes=icon_sizes)

print(f"Circular icons saved to {output_ico} and {output_png}")
