"""
Named Entity Recognition for Receipt Data

R&D Component: BERT-based NER for Vendor/Amount/Date Extraction
Hypothesis: BERT NER + regex fallback achieves 80%+ F1 score on receipt entity extraction
Methodology: Use pre-trained BERT-base-NER for organizations (vendors),
             regex patterns for amounts ($XX.XX) and dates (various formats)
Success Metric: Vendor F1 >= 90%, Amount F1 >= 85%, Date F1 >= 75%
Findings: TBD after testing
"""

try:
    from transformers import pipeline
except ImportError:
    print("Warning: transformers not installed")
    print("Install with: pip install transformers torch")

import re
import json
import sys

# Initialize NER pipeline (cached after first load)
_ner_pipeline = None

def get_ner_pipeline():
    """Lazy load NER model to reduce startup time"""
    global _ner_pipeline
    if _ner_pipeline is None:
        try:
            _ner_pipeline = pipeline(
                "ner",
                model="dslim/bert-base-NER",
                tokenizer="dslim/bert-base-NER",
                aggregation_strategy="simple"
            )
        except Exception as e:
            print(f"Error loading NER model: {e}", file=sys.stderr)
            _ner_pipeline = None
    return _ner_pipeline

def extract_entities(text):
    """
    R&D Hypothesis: BERT NER + regex fallback achieves 80% F1 on receipt entities
    Target: vendor (90% F1), amount (85% F1), date (75% F1)

    Returns: {
        'vendors': [str],
        'amounts': [float],
        'dates': [str],
        'all_entities': [dict],
        'confidence': float (0-1)
    }
    """
    if not text or not text.strip():
        return {
            'vendors': [],
            'amounts': [],
            'dates': [],
            'all_entities': [],
            'confidence': 0.0
        }

    # Try BERT NER for vendors
    entities = []
    vendors = []

    ner = get_ner_pipeline()
    if ner:
        try:
            entities = ner(text[:512])  # Limit to 512 chars for performance
            # Extract organizations (likely vendors)
            vendors = [
                e['word'].strip()
                for e in entities
                if e['entity_group'] == 'ORG' and len(e['word'].strip()) > 2
            ]
        except Exception as e:
            print(f"NER extraction error: {e}", file=sys.stderr)

    # Regex fallbacks for amounts and dates
    amounts = extract_amounts_regex(text)
    dates = extract_dates_regex(text)

    # Calculate average confidence from NER entities
    confidence = calculate_confidence(entities) if entities else 0.5

    return {
        'vendors': vendors,
        'amounts': amounts,
        'dates': dates,
        'all_entities': entities,
        'confidence': confidence
    }

def extract_amounts_regex(text):
    """
    Extract currency amounts with regex patterns

    Matches:
    - $12.99
    - $1,234.56
    - 45.00
    - £100.00, €50.00, etc.
    """
    # Pattern for currency amounts (with or without currency symbol)
    patterns = [
        r'[$£€¥]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # With symbol
        r'\b(\d{1,3}(?:,\d{3})*\.\d{2})\b'              # Without symbol
    ]

    amounts = []
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            try:
                # Remove commas and convert to float
                amount = float(match.replace(',', ''))
                if 0 < amount < 100000:  # Reasonable range for subscription
                    amounts.append(amount)
            except ValueError:
                continue

    # Remove duplicates and sort
    amounts = sorted(list(set(amounts)))

    return amounts

def extract_dates_regex(text):
    """
    Extract dates in various formats

    Matches:
    - MM/DD/YYYY or DD/MM/YYYY
    - YYYY-MM-DD
    - DD Month YYYY (e.g., 15 January 2025)
    - Month DD, YYYY (e.g., January 15, 2025)
    """
    patterns = [
        r'\d{1,2}/\d{1,2}/\d{2,4}',                     # MM/DD/YYYY
        r'\d{4}-\d{2}-\d{2}',                           # YYYY-MM-DD
        r'\d{1,2}\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}',  # DD Month YYYY
        r'(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{2,4}'   # Month DD YYYY
    ]

    dates = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        dates.extend(matches if isinstance(matches, list) else [matches])

    # Remove duplicates while preserving order
    seen = set()
    unique_dates = []
    for date in dates:
        date_str = date if isinstance(date, str) else ' '.join(date)
        if date_str not in seen:
            seen.add(date_str)
            unique_dates.append(date_str)

    return unique_dates

def calculate_confidence(entities):
    """
    Calculate average confidence from NER entity predictions

    Returns: float (0-1)
    """
    if not entities:
        return 0.0

    scores = [e.get('score', 0) for e in entities]
    if not scores:
        return 0.0

    return sum(scores) / len(scores)

if __name__ == '__main__':
    # Read text from stdin (allows multi-line input from Node.js)
    text = sys.stdin.read()

    result = extract_entities(text)

    # Output JSON for Node.js to parse
    print(json.dumps(result))
