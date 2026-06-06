#!/usr/bin/env python3
"""
resume_parser.py
────────────────
Two modes:

  1. AUTO   — parse a resume PDF → resume_data.json
              python resume_parser.py --pdf resume.pdf [--output out.json]

  2. MANUAL — interactively enter / edit experience & project entries
              python resume_parser.py --manual [--base existing.json] [--output out.json]

Requirements:
    pip install pdfplumber pypdf pytesseract pillow pdf2image
    sudo apt-get install tesseract-ocr poppler-utils
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path


# ════════════════════════════════════════════════════════════════════════════════
#  PDF TEXT EXTRACTION
# ════════════════════════════════════════════════════════════════════════════════

def extract_text_pdfplumber(pdf_path: str) -> str:
    try:
        import pdfplumber
        parts = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    parts.append(t)
        return "\n".join(parts)
    except Exception as e:
        print(f"[pdfplumber] failed: {e}")
        return ""


def extract_text_pypdf(pdf_path: str) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        return "\n".join(p.extract_text() or "" for p in reader.pages)
    except Exception as e:
        print(f"[pypdf] failed: {e}")
        return ""


def extract_text_ocr(pdf_path: str) -> str:
    try:
        import pytesseract
        from pdf2image import convert_from_path
        print("[OCR] Rasterising PDF pages …")
        images = convert_from_path(pdf_path, dpi=200)
        parts = []
        for i, img in enumerate(images):
            print(f"[OCR] Page {i + 1}/{len(images)} …")
            text = pytesseract.image_to_string(img, lang="eng")
            if text.strip():
                parts.append(text)
        return "\n".join(parts)
    except Exception as e:
        print(f"[OCR] failed: {e}")
        return ""


def get_pdf_text(pdf_path: str) -> str:
    for fn, label in [(extract_text_pdfplumber, "pdfplumber"), (extract_text_pypdf, "pypdf")]:
        text = fn(pdf_path)
        if text and len(text.strip()) > 50:
            print(f"[extract] Using {label} ({len(text)} chars)")
            return text
    print("[extract] Falling back to Tesseract OCR …")
    return extract_text_ocr(pdf_path)


# ════════════════════════════════════════════════════════════════════════════════
#  SECTION SPLITTER
# ════════════════════════════════════════════════════════════════════════════════

# Canonical section names + common typos / variants found in real resumes
SECTION_ALIASES: dict[str, str] = {
    # education
    "education": "education",
    # experience variants — including the infamous typo "expierence"
    "experience": "experience",
    "expierence": "experience",
    "work experience": "experience",
    "professional experience": "experience",
    "employment history": "experience",
    "employment": "experience",
    # projects
    "projects": "projects",
    "project": "projects",
    "technical projects": "projects",
    "academic projects": "projects",
    "personal projects": "projects",
    # skills
    "skills": "skills",
    "technical skills": "skills",
    "core skills": "skills",
    "technologies": "skills",
    # leadership / activities
    "leadership": "leadership",
    "leadership and community involvement": "leadership",
    "community involvement": "leadership",
    "activities": "leadership",
    "extracurricular": "leadership",
    "extracurricular activities": "leadership",
    "volunteer": "leadership",
    "volunteering": "leadership",
    # other
    "certifications": "certifications",
    "awards": "achievements",
    "honors": "achievements",
    "achievements": "achievements",
    "summary": "summary",
    "objective": "summary",
    "professional summary": "summary",
    "coursework": "coursework",
    "relevant coursework": "coursework",
    "related coursework": "coursework",
    "publications": "publications",
    "interests": "interests",
}


def canonical_section(line: str) -> str | None:
    """Return canonical section name if line is a section header, else None."""
    clean = line.strip().rstrip(":").lower()
    return SECTION_ALIASES.get(clean)


def split_into_sections(text: str) -> dict[str, str]:
    """Split raw resume text into {canonical_name: content_block} dict."""
    lines = text.splitlines()
    sections: dict[str, str] = {}
    current = "header"
    buf: list[str] = []

    for line in lines:
        canon = canonical_section(line)
        if canon:
            sections[current] = "\n".join(buf).strip()
            current = canon
            buf = []
        else:
            buf.append(line)

    sections[current] = "\n".join(buf).strip()
    return sections


def find_section(sections: dict, *canonical_names: str) -> str:
    for name in canonical_names:
        if name in sections:
            return sections[name]
    return ""


# ════════════════════════════════════════════════════════════════════════════════
#  SHARED PATTERNS
# ════════════════════════════════════════════════════════════════════════════════

BULLET_RE = re.compile(r"^[\s]*[•\-\*\u2022\u2013\u2014>◦▪▸●○]\s+")

# Date range: "May 2025 - Present", "Aug 2025 - Dec 2025", "Jan 2024-Mar 2024"
DATE_RANGE_PAT = re.compile(
    r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})"
    r"\s*[-–—]\s*"
    r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}"
    r"|\d{4}|Present|Current|Now)",
    re.IGNORECASE,
)

# Single date: "Expected Dec 2027", "May 2026"
SINGLE_DATE_PAT = re.compile(
    r"(?:Expected\s+)?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})",
    re.IGNORECASE,
)


def strip_date(text: str) -> str:
    """Remove date range or single date from a string."""
    text = DATE_RANGE_PAT.sub("", text)
    text = SINGLE_DATE_PAT.sub("", text)
    return text.strip(" |-–—")


def extract_bullet_points(block: str) -> list[str]:
    """Collect bullet lines; handle multi-line bullets (continuation lines)."""
    lines = block.splitlines()
    bullets: list[str] = []
    current: str | None = None

    for line in lines:
        if BULLET_RE.match(line):
            if current is not None:
                bullets.append(current.strip())
            current = BULLET_RE.sub("", line).strip()
        elif current is not None and line.strip() and not canonical_section(line):
            # continuation of previous bullet (wrapped line)
            current += " " + line.strip()
        else:
            if current is not None:
                bullets.append(current.strip())
                current = None

    if current is not None:
        bullets.append(current.strip())

    return [b for b in bullets if b]


# ════════════════════════════════════════════════════════════════════════════════
#  HEADER PARSERS
# ════════════════════════════════════════════════════════════════════════════════

def parse_name(header: str) -> str | None:
    """First line that looks like a name (2-5 words, letters only)."""
    for line in header.splitlines():
        s = line.strip()
        if not s or re.search(r"[@|/\\()\d]", s):
            continue
        words = s.split()
        if 2 <= len(words) <= 5 and all(re.match(r"[A-Za-z'\-]+$", w) for w in words):
            return s
    return None


def parse_email(text: str) -> str | None:
    m = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
    return m.group() if m else None


def parse_phone(text: str) -> str | None:
    m = re.search(r"(\+?1[\s.\-]?)?(\(?\d{3}\)?[\s.\-]?)(\d{3}[\s.\-]?\d{4})", text)
    return m.group().strip() if m else None


def parse_linkedin(text: str) -> str | None:
    m = re.search(r"linkedin\.com/in/[\w\-/]+", text, re.IGNORECASE)
    if m:
        url = m.group().rstrip("/")
        return f"https://{url}"
    return None


def parse_github(text: str) -> str | None:
    m = re.search(r"github\.com/[\w\-]+", text, re.IGNORECASE)
    return f"https://{m.group()}" if m else None


def parse_location(header: str) -> str | None:
    """Look for 'City, ST' pattern in header lines."""
    m = re.search(r"\b([A-Z][a-zA-Z ]+,\s*[A-Z]{2})\b", header)
    return m.group(1) if m else None


# ════════════════════════════════════════════════════════════════════════════════
#  EDUCATION PARSER
# ════════════════════════════════════════════════════════════════════════════════

# Degree-type patterns → normalised label
DEGREE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"masters?\s+of\s+science", re.I),       "Master of Science"),
    (re.compile(r"master\s+of\s+arts",       re.I),       "Master of Arts"),
    (re.compile(r"m\.s\.?",                  re.I),       "Master of Science"),
    (re.compile(r"m\.a\.?",                  re.I),       "Master of Arts"),
    (re.compile(r"bachelor[s]?\s+of\s+science", re.I),   "Bachelor of Science"),
    (re.compile(r"bachelor[s]?\s+of\s+arts",    re.I),   "Bachelor of Arts"),
    (re.compile(r"b\.s\.?",                  re.I),       "Bachelor of Science"),
    (re.compile(r"b\.a\.?",                  re.I),       "Bachelor of Arts"),
    (re.compile(r"associate[s]?\s+of\s+\w+", re.I),      "Associate"),
    (re.compile(r"ph\.?d\.?",                re.I),       "PhD"),
]

def normalise_degree(text: str) -> str | None:
    for pat, label in DEGREE_PATTERNS:
        if pat.search(text):
            return label
    return None


def extract_major(line: str) -> str | None:
    """
    Extract just the major/field from a degree line like:
      'Masters of Science in Computer Science Expected Dec 2027'
      'Bachelor of Science in Computer Engineering'
    Returns e.g. 'Computer Science', 'Computer Engineering'
    """
    # Remove date noise first
    clean = strip_date(line)
    # Match "in <Major>" after the degree type
    m = re.search(
        r"(?:of\s+Science\s+in|of\s+Arts\s+in|of\s+Engineering\s+in|in)\s+([A-Za-z][A-Za-z\s&,]+)",
        clean, re.IGNORECASE,
    )
    if m:
        major = m.group(1).strip().rstrip(",")
        # Truncate at common stop words that aren't part of the major name
        for stop in ["expected", "gpa", "university", "college", "school"]:
            idx = major.lower().find(stop)
            if idx > 0:
                major = major[:idx].strip()
        return major
    return None


def parse_gpa(text: str) -> str | None:
    m = re.search(r"GPA[:\s]*([0-9]\.[0-9]{1,3})\s*/?\s*([0-9]\.[0-9])?", text, re.IGNORECASE)
    if m:
        return m.group(1) + (f"/{m.group(2)}" if m.group(2) else "")
    m = re.search(r"([0-9]\.[0-9]{1,3})\s*/\s*4\.0", text)
    return m.group(1) if m else None


def parse_education(block: str) -> list[dict]:
    """
    Handles resumes where multiple degrees at the same institution appear
    as back-to-back lines without blank-line separators.

    Each education entry has:
      institution, degree, major, graduation_date, gpa, relevant_coursework, achievements
    """
    if not block:
        return []

    lines = [l.strip() for l in block.splitlines()]
    entries: list[dict] = []
    current_entry: dict | None = None
    current_bullets: list[str] = []   # bullet lines belonging to current entry
    raw_buf: list[str] = []           # non-bullet lines belonging to current entry

    def flush(entry, bullets, raw):
        """Finalise an entry — pull GPA, coursework, achievements from its lines."""
        if not entry:
            return
        combined = "\n".join(raw) + "\n" + "\n".join(bullets)

        # GPA
        if not entry.get("gpa"):
            for line in bullets:
                if re.search(r"gpa", line, re.I):
                    entry["gpa"] = parse_gpa(line)
                    break

        # Relevant coursework
        cw: list[str] = []
        for line in bullets + raw:
            if re.search(r"coursework", line, re.I):
                after = re.sub(r".*coursework[:\s]*", "", line, flags=re.I)
                cw.extend([c.strip() for c in re.split(r"[,;]", after) if c.strip()])
        entry["relevant_coursework"] = cw

        # Achievements / honors
        ach: list[str] = []
        for line in bullets:
            if re.search(r"achievement|honor|dean|cum laude|distinction", line, re.I):
                after = re.sub(r".*(?:achievement|honor)[s]?[:\s]*", "", line, flags=re.I)
                ach.extend([a.strip() for a in re.split(r"[,;]", after) if a.strip()])
        entry["achievements"] = ach

        entries.append(entry)

    for line in lines:
        if not line:
            continue

        # Check if this line introduces a new degree
        deg_label = normalise_degree(line)
        if deg_label:
            # Save the previous entry before starting a new one
            if current_entry:
                flush(current_entry, current_bullets, raw_buf)

            major = extract_major(line)
            grad_date = None
            dm = DATE_RANGE_PAT.search(line)
            if dm:
                grad_date = dm.group(2).strip()
            else:
                sm = SINGLE_DATE_PAT.search(line)
                if sm:
                    grad_date = sm.group(1).strip()

            current_entry = {
                "institution":        None,   # filled below
                "degree":             deg_label,
                "major":              major,
                "graduation_date":    grad_date,
                "gpa":                None,
                "relevant_coursework": [],
                "achievements":       [],
            }
            current_bullets = []
            raw_buf = [line]

        elif current_entry is None:
            # Lines before the first degree line → institution / location header
            # We'll attach institution retroactively when we see the degree line
            raw_buf = [line]   # keep as pending institution line

        else:
            # Lines belonging to the current degree entry
            if BULLET_RE.match("  " + line) or line.startswith("●"):
                current_bullets.append(line)
            else:
                # Could be institution name (if not yet set) or extra info
                if current_entry["institution"] is None:
                    # The institution line typically comes BEFORE the degree line,
                    # so check raw_buf for it
                    pass
                raw_buf.append(line)

    # Flush last entry
    if current_entry:
        flush(current_entry, current_bullets, raw_buf)

    # Now go back and attach institution names.
    # Strategy: re-scan the original lines to find university/college names
    # (lines that don't contain a degree keyword or bullet) and pair them.
    inst_lines: list[str] = [
        l.strip() for l in block.splitlines()
        if l.strip()
        and not normalise_degree(l)
        and not BULLET_RE.match("  " + l.strip())
        and not l.strip().startswith("●")
        and not re.search(r"coursework|gpa|achievement|honor|dean", l, re.I)
    ]

    # Match institution lines to entries by position
    inst_idx = 0
    for entry in entries:
        if inst_idx < len(inst_lines):
            # Strip city/state from institution line
            inst = re.sub(r",\s*[A-Z][a-zA-Z]+,?\s*[A-Z]{2}$", "", inst_lines[inst_idx]).strip()
            entry["institution"] = inst
            inst_idx += 1

    return [e for e in entries if e.get("degree") or e.get("institution")]


# ════════════════════════════════════════════════════════════════════════════════
#  EXPERIENCE PARSER
# ════════════════════════════════════════════════════════════════════════════════

def parse_experience(block: str) -> list[dict]:
    """
    Handles lines like:
      'ERP Security Administrator | UTDallas Office of Technology  May 2025 - Present'
      'Machine Learning Intern | LLM Software  Aug 2025 - Dec 2025'

    Each entry:
      title, company, location, start_date, end_date, bullet_points
    """
    if not block:
        return []

    entries: list[dict] = []
    current: dict | None = None
    bullet_buf: list[str] = []

    def flush():
        if current is not None:
            current["bullet_points"] = extract_bullet_points("\n".join(bullet_buf))
            entries.append(current)

    for line in block.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        # Detect a new entry header: contains " | " and a date range on the same line,
        # OR looks like "Title | Company  Date" without a bullet
        date_m = DATE_RANGE_PAT.search(stripped)
        has_pipe = "|" in stripped

        if (date_m or has_pipe) and not BULLET_RE.match(line) and not stripped.startswith("●"):
            # Check it's not just a continuation bullet
            flush()
            bullet_buf = []

            # Extract dates first
            start_date = end_date = None
            if date_m:
                start_date = date_m.group(1).strip()
                end_date   = date_m.group(2).strip()

            # Remove date from line to get title | company
            header = DATE_RANGE_PAT.sub("", stripped).strip(" |-–—")

            # Split on pipe first; fall back to comma for "Title, Company [, City ST]"
            if "|" in header:
                parts   = [p.strip() for p in header.split("|", 1)]
                title   = parts[0].strip()
                company = parts[1].strip() if len(parts) > 1 else None
            elif "," in header:
                parts   = [p.strip() for p in header.split(",", 1)]
                title   = parts[0].strip()
                company = parts[1].strip() if len(parts) > 1 else None
            else:
                title   = header.strip()
                company = None

            # Extract location from company string if present
            location = None
            if company:
                loc_m = re.search(r",\s*([A-Z][a-zA-Z ]+,\s*[A-Z]{2})\b", company)
                if loc_m:
                    location = loc_m.group(1)
                    company  = company[:loc_m.start()].strip().rstrip(",")

            current = {
                "title":        title   or None,
                "company":      company or None,
                "location":     location,
                "start_date":   start_date,
                "end_date":     end_date,
            }

        elif current is not None:
            # If company is still missing, check if this non-bullet line is the
            # "Company   City, ST" line that appears directly after the title line.
            if (
                (current.get("company") is None or current.get("location") is None)
                and not BULLET_RE.match(line)
                and not stripped.startswith("●")
                and not DATE_RANGE_PAT.search(stripped)   # not another date header
                and len(bullet_buf) == 0                  # no bullets yet (i.e. 2nd/3rd line of header)
            ):
                # pdfplumber concatenates "Company City, ST" onto one line.
                # Split by finding ", XX" (2-letter state) and working backwards:
                # the city is everything after the last whitespace before ", XX".
                # e.g. "UTDallas Office of Technology Richardson, TX"
                #       → city="Richardson, TX"  company="UTDallas Office of Technology"
                loc_m = re.search(
                    r"(?<=[a-zA-Z])\s+([A-Z][a-zA-Z]+,\s*[A-Z]{2})\s*$",
                    stripped,
                )
                if loc_m:
                    current["location"] = loc_m.group(1).strip()
                    company_part = stripped[: loc_m.start()].strip().rstrip(",").strip()
                    if company_part:
                        current["company"] = company_part
                else:
                    # No "City, ST" pattern — entire line is the company name
                    if current.get("company") is None:
                        current["company"] = stripped or None
            else:
                # Bullet or continuation line
                bullet_buf.append(line)

    flush()
    return [e for e in entries if e.get("title") or e.get("bullet_points")]


# ════════════════════════════════════════════════════════════════════════════════
#  PROJECTS PARSER
# ════════════════════════════════════════════════════════════════════════════════

def parse_projects(block: str) -> list[dict]:
    """
    Handles lines like:
      'EPICS: Indoor Navigation for Visually Impaired | yolov8, IMU sensors, CNN model  Aug 2025 - Present'
      'Build Your Ride: hackathon web app | Eleven Labs AI, Three.js, Nuxt.js, MongoDB  Apr 2025 - May 2025'

    Each entry:
      name, technologies, start_date, end_date, bullet_points
    """
    if not block:
        return []

    entries: list[dict] = []
    current: dict | None = None
    bullet_buf: list[str] = []

    def flush():
        if current is not None:
            current["bullet_points"] = extract_bullet_points("\n".join(bullet_buf))
            entries.append(current)

    for line in block.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        date_m  = DATE_RANGE_PAT.search(stripped)
        has_pipe = "|" in stripped

        if (date_m or has_pipe) and not BULLET_RE.match(line) and not stripped.startswith("●"):
            flush()
            bullet_buf = []

            start_date = end_date = None
            if date_m:
                start_date = date_m.group(1).strip()
                end_date   = date_m.group(2).strip()

            # Remove date portion
            header = DATE_RANGE_PAT.sub("", stripped).strip(" |-–—")

            # Split on first pipe: left = project name, right = technologies
            if "|" in header:
                parts = header.split("|", 1)
                name     = parts[0].strip()
                tech_str = parts[1].strip()
                techs = [t.strip() for t in re.split(r"[,;]", tech_str) if t.strip()]
            else:
                # Technologies may be in parentheses
                tech_m = re.search(r"\(([^)]+)\)", header)
                if tech_m:
                    techs = [t.strip() for t in re.split(r"[,;]", tech_m.group(1)) if t.strip()]
                    name  = re.sub(r"\s*\([^)]+\)", "", header).strip()
                else:
                    name  = header.strip()
                    techs = []

            current = {
                "name":         name       or None,
                "technologies": techs,
                "start_date":   start_date,
                "end_date":     end_date,
            }

        elif current is not None:
            bullet_buf.append(line)

    flush()
    return [e for e in entries if e.get("name") or e.get("bullet_points")]


# ════════════════════════════════════════════════════════════════════════════════
#  SKILLS PARSER
# ════════════════════════════════════════════════════════════════════════════════

def parse_skills_flat(block: str) -> list[str]:
    """
    Returns a flat deduplicated list of skills.
    Handles both categorised ('Languages: Python, Java') and bare lists.
    If no dedicated skills section exists, returns empty list — the tailorer
    can derive skills from project technology tags instead.
    """
    if not block:
        return []

    all_skills: list[str] = []
    for line in block.splitlines():
        # Strip leading category label e.g. "Languages: " or "Tools & Technologies: "
        content = re.sub(r"^[A-Za-z ,/&]+:\s*", "", line).strip()
        if not content:
            continue
        items = [s.strip() for s in re.split(r"[,;|•·/]", content) if s.strip()]
        all_skills.extend(items)

    # Deduplicate, preserve order
    seen: set[str] = set()
    result: list[str] = []
    for s in all_skills:
        if s.lower() not in seen and len(s) > 1:
            seen.add(s.lower())
            result.append(s)
    return result


def skills_from_projects(projects: list[dict]) -> list[str]:
    """Collect all unique technology tags from project entries as a skills fallback."""
    seen: set[str] = set()
    result: list[str] = []
    for proj in projects:
        for tech in proj.get("technologies", []):
            if tech.lower() not in seen and len(tech) > 1:
                seen.add(tech.lower())
                result.append(tech)
    return result


# ════════════════════════════════════════════════════════════════════════════════
#  LEADERSHIP PARSER (same pattern as experience)
# ════════════════════════════════════════════════════════════════════════════════

def parse_leadership(block: str) -> list[dict]:
    """
    Same pipe+date pattern as experience.
    Returns list of {organization, role, start_date, end_date, bullet_points}.
    """
    if not block:
        return []

    entries: list[dict] = []
    current: dict | None = None
    bullet_buf: list[str] = []

    def flush():
        if current is not None:
            current["bullet_points"] = extract_bullet_points("\n".join(bullet_buf))
            entries.append(current)

    for line in block.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        date_m = DATE_RANGE_PAT.search(stripped)

        if date_m and not BULLET_RE.match(line) and not stripped.startswith("●"):
            flush()
            bullet_buf = []

            start_date = date_m.group(1).strip()
            end_date   = date_m.group(2).strip()

            header = DATE_RANGE_PAT.sub("", stripped).strip(" |-–—")

            current = {
                "organization": header or None,
                "role":         None,
                "start_date":   start_date,
                "end_date":     end_date,
            }

        elif current is not None:
            bullet_buf.append(line)

    flush()
    return [e for e in entries if e.get("organization") or e.get("bullet_points")]


# ════════════════════════════════════════════════════════════════════════════════
#  CURRENT POSITION DERIVER
# ════════════════════════════════════════════════════════════════════════════════

def derive_current_position(experience_raw: list) -> tuple:
    """
    Given a list of parsed experience entries, return (current_role, current_org).

    Priority:
      1. Entry whose end_date is "Present" / "Current" / "Now" (case-insensitive)
         or is missing / None / empty string.
      2. Among tied "present" entries, pick the one with the latest start_date.
      3. If nothing is marked current (e.g. between jobs), fall back to the entry
         with the most recent end_date.

    Returns ("", "") if the list is empty or no title/company can be found.
    """
    if not experience_raw:
        return "", ""

    CURRENT_WORDS = {"present", "current", "now"}

    def is_current(entry):
        end = (entry.get("end_date") or "").strip().lower()
        return not end or end in CURRENT_WORDS

    def parse_dt(date_str):
        if not date_str:
            return None
        try:
            from dateutil import parser as dateparser
            return dateparser.parse(date_str)
        except Exception:
            return None

    from datetime import datetime as _dt
    current_entries = [e for e in experience_raw if is_current(e)]

    if current_entries:
        def start_key(e):
            d = parse_dt(e.get("start_date"))
            return d if d else _dt.min
        best = max(current_entries, key=start_key)
    else:
        def end_key(e):
            d = parse_dt(e.get("end_date"))
            return d if d else _dt.min
        best = max(experience_raw, key=end_key)

    return (best.get("title") or "").strip(), (best.get("company") or "").strip()


# ════════════════════════════════════════════════════════════════════════════════
#  MAIN PARSE ORCHESTRATOR
# ════════════════════════════════════════════════════════════════════════════════

def parse_resume(text: str) -> dict:
    sections = split_into_sections(text)

    header_text = find_section(sections, "header")
    edu_text    = find_section(sections, "education")
    exp_text    = find_section(sections, "experience")
    proj_text   = find_section(sections, "projects")
    skills_text = find_section(sections, "skills")
    lead_text   = find_section(sections, "leadership")
    cert_text   = find_section(sections, "certifications")
    ach_text    = find_section(sections, "achievements")

    projects       = parse_projects(proj_text)
    experience_raw = parse_experience(exp_text)

    # Derive current role/org automatically from the structured experience list
    current_role, current_org = derive_current_position(experience_raw)

    # Skills: use dedicated section if it exists, else pull from project tech tags
    flat_skills = parse_skills_flat(skills_text)
    if not flat_skills:
        flat_skills = skills_from_projects(projects)

    # Certifications as flat list
    certs: list[str] = []
    if cert_text:
        for line in cert_text.splitlines():
            c = re.sub(BULLET_RE, "", line).strip()
            if c:
                certs.append(c)

    # Global achievements (awards, honors not inside education)
    achievements: list[str] = []
    if ach_text:
        for line in ach_text.splitlines():
            a = re.sub(BULLET_RE, "", line).strip()
            if a:
                achievements.append(a)

    return {
        "name":           parse_name(header_text),
        "email":          parse_email(text),
        "phone":          parse_phone(text),
        "location":       parse_location(header_text),
        "linkedin":       parse_linkedin(text),
        "github":         parse_github(text),
        "summary":        find_section(sections, "summary") or "",
        "education":      parse_education(edu_text),
        "skills":         flat_skills,
        "certifications": certs,
        # experience_raw: structured list consumed by DB & resume tailorer
        "experience_raw": experience_raw,
        # current_role/current_org: derived from experience_raw, written straight to DB
        "current_role":   current_role,
        "current_org":    current_org,
        "projects_raw":   projects,
        "leadership":     parse_leadership(lead_text),
        "achievements":   achievements,
    }


# ════════════════════════════════════════════════════════════════════════════════
#  MANUAL INPUT MODE
# ════════════════════════════════════════════════════════════════════════════════

def prompt(label: str, default: str = "") -> str:
    hint = f" [{default}]" if default else ""
    val  = input(f"  {label}{hint}: ").strip()
    return val if val else default


def prompt_bullets(existing: list[str] | None = None) -> list[str]:
    if existing:
        print("  Existing bullets (add new ones below, blank line when done):")
        for i, b in enumerate(existing, 1):
            print(f"    {i}. {b}")
    else:
        print("  Enter bullet points one per line (blank line when done):")
    bullets: list[str] = []
    while True:
        line = input("    • ").strip()
        if not line:
            break
        bullets.append(line)
    return bullets if bullets else (existing or [])


def input_experience_entry(existing: dict | None = None) -> dict:
    ex = existing or {}
    print()
    return {
        "title":         prompt("Title",     ex.get("title", "")),
        "company":       prompt("Company",   ex.get("company", "")),
        "location":      prompt("Location",  ex.get("location", "")),
        "start_date":    prompt("Start date (e.g. Jan 2022)", ex.get("start_date", "")),
        "end_date":      prompt("End date   (e.g. Dec 2023 or Present)", ex.get("end_date", "")),
        "bullet_points": prompt_bullets(ex.get("bullet_points")),
    }


def input_project_entry(existing: dict | None = None) -> dict:
    ex = existing or {}
    print()
    tech_default = ", ".join(ex.get("technologies", []))
    tech_str     = prompt("Technologies (comma-separated)", tech_default)
    return {
        "name":          prompt("Project name", ex.get("name", "")),
        "technologies":  [t.strip() for t in tech_str.split(",") if t.strip()],
        "start_date":    prompt("Start date", ex.get("start_date", "")),
        "end_date":      prompt("End date",   ex.get("end_date", "")),
        "bullet_points": prompt_bullets(ex.get("bullet_points")),
    }


def _edit_or_add(label: str, entries: list[dict], input_fn) -> list[dict]:
    """Shared helper for editing/adding experience or project entries."""
    if entries:
        print(f"\n  Found {len(entries)} existing {label} entry/entries.")
        for i, e in enumerate(entries, 1):
            title = e.get("title") or e.get("name") or e.get("organization") or "?"
            print(f"  [{i}] {title}")
        choice = input(f"\n  (e) Edit  (a) Add new  (k) Keep as-is  → ").strip().lower()
    else:
        print(f"\n  No {label} entries found.")
        choice = "a"

    if choice == "e":
        idx_s = input(f"  Which entry? (1–{len(entries)}): ").strip()
        try:
            entries[int(idx_s) - 1] = input_fn(entries[int(idx_s) - 1])
        except (ValueError, IndexError):
            print("  Invalid — skipping.")
        if input("  Add another? (y/n): ").strip().lower() == "y":
            while True:
                entries.append(input_fn())
                if input("  Add another? (y/n): ").strip().lower() != "y":
                    break
    elif choice == "a":
        while True:
            entries.append(input_fn())
            if input(f"  Add another {label} entry? (y/n): ").strip().lower() != "y":
                break

    return entries


def manual_mode(base_json: str | None, output_path: str) -> None:
    if base_json and os.path.isfile(base_json):
        with open(base_json, encoding="utf-8") as f:
            data = json.load(f)
        print(f"\n✅  Loaded: {base_json}")
    else:
        data = {
            "name": "", "email": "", "phone": "", "location": "",
            "linkedin": "", "github": "", "summary": "",
            "education": [], "skills": [], "certifications": [],
            "experience": [], "projects": [], "leadership": [], "achievements": [],
        }
        print("\n⚠  No base JSON — starting blank.")

    print("\n" + "═" * 55 + "\n  PROFESSIONAL EXPERIENCE\n" + "═" * 55)
    data["experience"] = _edit_or_add("experience", data.get("experience", []), input_experience_entry)

    print("\n" + "═" * 55 + "\n  PROJECTS\n" + "═" * 55)
    data["projects"] = _edit_or_add("projects", data.get("projects", []), input_project_entry)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\n✅  Saved → {output_path}\n")


# ════════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    ap = argparse.ArgumentParser(
        description="Resume Parser: auto-parse a PDF or manually enter data.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python resume_parser.py --pdf resume.pdf
  python resume_parser.py --pdf resume.pdf --output resume_data.json
  python resume_parser.py --manual --base resume_data.json --output resume_data.json
  python resume_parser.py --manual --output resume_data.json
        """,
    )
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--pdf",    metavar="FILE",  help="Input resume PDF")
    mode.add_argument("--manual", action="store_true", help="Interactive entry mode")

    ap.add_argument("--base",   metavar="FILE", help="(manual) Existing JSON to edit")
    ap.add_argument("--output", metavar="FILE", default="resume_data.json")
    args = ap.parse_args()

    if args.manual:
        manual_mode(args.base, args.output)
        return

    # ── AUTO MODE ──────────────────────────────────────────────────────────
    if not os.path.isfile(args.pdf):
        print(f"Error: file not found — {args.pdf}")
        sys.exit(1)

    print(f"\n{'='*55}")
    print("  Resume Parser  (OCR + Regex)")
    print(f"  Input : {args.pdf}")
    print(f"  Output: {args.output}")
    print(f"{'='*55}\n")

    raw_text = get_pdf_text(args.pdf)
    if not raw_text.strip():
        print("Error: could not extract text from PDF.")
        sys.exit(1)

    print(f"[extract] {len(raw_text)} chars\n")
    data = parse_resume(raw_text)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅  JSON saved → {args.output}\n")
    print("── Parsed Summary ──────────────────────────────────────")
    print(f"  Name        : {data.get('name', 'N/A')}")
    print(f"  Email       : {data.get('email', 'N/A')}")
    print(f"  Phone       : {data.get('phone', 'N/A')}")
    print(f"  LinkedIn    : {data.get('linkedin', 'N/A')}")
    print(f"  GitHub      : {data.get('github', 'N/A')}")
    print(f"  Education   : {len(data.get('education', []))} degree(s)")
    for edu in data.get("education", []):
        print(f"    • {edu.get('degree')} in {edu.get('major')} @ {edu.get('institution')} ({edu.get('graduation_date')})")
    print(f"  Experience  : {len(data.get('experience', []))} role(s)")
    for exp in data.get("experience", []):
        print(f"    • {exp.get('title')} | {exp.get('company')}  [{exp.get('start_date')} – {exp.get('end_date')}]  ({len(exp.get('bullet_points',[]))} bullets)")
    print(f"  Projects    : {len(data.get('projects', []))} project(s)")
    for proj in data.get("projects", []):
        print(f"    • {proj.get('name')}  [{proj.get('start_date')} – {proj.get('end_date')}]  ({len(proj.get('bullet_points',[]))} bullets)")
    print(f"  Leadership  : {len(data.get('leadership', []))} entry/entries")
    print(f"  Skills      : {len(data.get('skills', []))} skill(s)")
    print("────────────────────────────────────────────────────────\n")
    print("  Tip: run --manual --base to review and fix any parsed fields.\n")


if __name__ == "__main__":
    main()