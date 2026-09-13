"""Generate non-sensitive OCR regression fixtures, never real user material."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.pdfencrypt import StandardEncryption

out = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "ocr"
out.mkdir(parents=True, exist_ok=True)
image = Image.new("RGB", (1400, 500), "white")
draw = ImageDraw.Draw(image)
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 48)
for y, line in zip((75, 165, 255), ("SYNTHETIC OCR TEST", "REFERENCE ALPHA 12345", "Test date 13 September 2026.")):
    draw.text((75, y), line, fill="black", font=font)
image.save(out / "text.png")
image.save(out / "text.jpg", quality=95)

def native_page(pdf, label):
    pdf.setFont("Helvetica", 14)
    pdf.drawString(50, 760, label)
    pdf.drawString(50, 730, "This is a synthetic document created only for automated extraction tests.")
    pdf.drawString(50, 700, "No real person, case, court or legal deadline is represented.")

pdf = canvas.Canvas(str(out / "digital.pdf"))
native_page(pdf, "NATIVE PAGE ONE: REFERENCE DIGITAL 12345")
pdf.save()
pdf = canvas.Canvas(str(out / "scanned.pdf"))
pdf.drawImage(str(out / "text.png"), 30, 500, width=530, height=190)
pdf.save()
pdf = canvas.Canvas(str(out / "mixed.pdf"))
native_page(pdf, "NATIVE PAGE ONE: ORDER FIRST")
pdf.showPage()
pdf.drawImage(str(out / "text.png"), 30, 500, width=530, height=190)
pdf.showPage()
native_page(pdf, "NATIVE PAGE THREE: ORDER LAST")
pdf.save()
pdf = canvas.Canvas(str(out / "encrypted.pdf"), encrypt=StandardEncryption("fixture-password", canPrint=0))
native_page(pdf, "SYNTHETIC ENCRYPTED FIXTURE")
pdf.save()
(out / "corrupt.pdf").write_bytes(b"%PDF-1.7\ncorrupt synthetic content\n")
(out / "plain.txt").write_text("SYNTHETIC PLAIN TEXT: a non-sensitive document extraction fixture.", encoding="utf-8")
print("Created synthetic OCR fixtures in", out)
