"""
OCR Receipt Extraction Service

R&D Component: Optical Character Recognition for Receipt Text Extraction
Hypothesis: pytesseract with preprocessing (grayscale + contrast + noise reduction)
            achieves 75%+ accuracy on receipt text extraction
Methodology: Grayscale conversion, contrast enhancement (2.0x), median filter (size 3),
             Tesseract OCR with PSM 6 (uniform block of text)
Success Metric: F1 score >= 0.75 on vendor, amount, date extraction
Findings: TBD after testing
"""

try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter
    from pdf2image import convert_from_bytes
except ImportError as e:
    print(f"Warning: Missing dependencies - {e}")
    print("Install with: pip install pytesseract pdf2image pillow")

import json
import sys
import os

def preprocess_image(image):
    """
    R&D Hypothesis: Grayscale conversion + contrast enhancement + noise reduction
                    improves OCR accuracy by 20-30% on low-quality receipt scans

    Methodology:
    1. Convert to grayscale (reduces complexity)
    2. Enhance contrast 2.0x (makes text sharper)
    3. Apply median filter size 3 (reduces noise)
    """
    # Convert to grayscale
    image = image.convert('L')

    # Enhance contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)

    # Reduce noise with median filter
    image = image.filter(ImageFilter.MedianFilter(size=3))

    return image

def extract_text_from_image(image_path):
    """
    OCR extraction with preprocessing

    Returns: {
        'text': str,
        'confidence': float (0-1),
        'method': 'pytesseract'
    }
    """
    try:
        if not os.path.exists(image_path):
            return {'error': f'File not found: {image_path}', 'text': '', 'confidence': 0}

        image = Image.open(image_path)
        image = preprocess_image(image)

        # Tesseract OCR with PSM 6 (uniform block of text)
        text = pytesseract.image_to_string(image, lang='eng', config='--psm 6')

        # Get confidence data
        confidence_data = pytesseract.image_to_data(
            image,
            output_type=pytesseract.Output.DICT
        )

        # Calculate average confidence (skip -1 values which mean no text detected)
        valid_confidences = [
            int(c) for c in confidence_data['conf'] if str(c) != '-1'
        ]

        avg_confidence = 0
        if valid_confidences:
            avg_confidence = sum(valid_confidences) / len(valid_confidences) / 100.0

        return {
            'text': text,
            'confidence': avg_confidence,
            'method': 'pytesseract',
            'chars_detected': len(text.strip())
        }
    except Exception as e:
        return {
            'error': str(e),
            'text': '',
            'confidence': 0
        }

def extract_text_from_pdf(pdf_path):
    """
    Convert PDF to images and extract text from each page

    Returns: {
        'text': str (all pages combined),
        'confidence': float (average across pages),
        'pages': int,
        'method': 'pytesseract+pdf2image'
    }
    """
    try:
        if not os.path.exists(pdf_path):
            return {'error': f'File not found: {pdf_path}', 'text': '', 'confidence': 0}

        # Convert PDF to images (one per page)
        with open(pdf_path, 'rb') as f:
            pdf_bytes = f.read()

        images = convert_from_bytes(pdf_bytes)

        all_text = []
        total_confidence = 0

        for img in images:
            img = preprocess_image(img)
            text = pytesseract.image_to_string(img, lang='eng', config='--psm 6')
            all_text.append(text)

            # Simplified confidence (would need full data extraction for accuracy)
            total_confidence += 0.75  # Placeholder

        avg_confidence = total_confidence / len(images) if images else 0

        return {
            'text': '\n\n--- Page Break ---\n\n'.join(all_text),
            'confidence': avg_confidence,
            'pages': len(images),
            'method': 'pytesseract+pdf2image',
            'chars_detected': sum(len(t.strip()) for t in all_text)
        }
    except Exception as e:
        return {
            'error': str(e),
            'text': '',
            'confidence': 0,
            'pages': 0
        }

if __name__ == '__main__':
    # CLI bridge for Node.js
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: python ocrService.py <command> <file_path>',
            'text': '',
            'confidence': 0
        }))
        sys.exit(1)

    command = sys.argv[1]
    file_path = sys.argv[2]

    if command == 'extract_image':
        result = extract_text_from_image(file_path)
    elif command == 'extract_pdf':
        result = extract_text_from_pdf(file_path)
    else:
        result = {'error': f'Unknown command: {command}', 'text': '', 'confidence': 0}

    # Output JSON for Node.js to parse
    print(json.dumps(result))
