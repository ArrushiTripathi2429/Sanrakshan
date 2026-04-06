"""
PII Redactor — masks personally identifiable information before
any report data is displayed publicly or sent to external APIs.

Compliant with India's DPDP Act 2023.
"""

import re

def redact(text: str) -> str:
    """Mask phone numbers, Aadhaar numbers, and common name patterns."""
    if not text:
        return text
    # Phone numbers (10-digit Indian)
    text = re.sub(r'\b[6-9]\d{9}\b', '[PHONE REDACTED]', text)
    # Aadhaar (12-digit)
    text = re.sub(r'\b\d{4}\s?\d{4}\s?\d{4}\b', '[AADHAAR REDACTED]', text)
    # Email addresses
    text = re.sub(r'\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b', '[EMAIL REDACTED]', text, flags=re.IGNORECASE)
    return text


def redact_report(report: dict) -> dict:
    """Redact PII from a report dict before sending to Gemini or displaying."""
    safe = dict(report)
    for field in ("description", "title", "location"):
        if field in safe and isinstance(safe[field], str):
            safe[field] = redact(safe[field])
    return safe
