#!/usr/bin/env python3
"""
job_scraper.py v3 — Direct company career page scraper

Strategy:
  1. Google Search → discover actual job listings on real company career pages
  2. Scrape ATS APIs directly (Greenhouse, Lever, Ashby) — these return clean JSON
     with real apply URLs, company names, locations, dates
  3. LinkedIn guest API for broad coverage (real job page links)
  4. ALL filters (location, title, type, company, skills) are AND-gated — strict
  5. Sort by: recency-weighted relevance (recent + matching = ranked higher)
  6. Every URL goes to the actual job posting / apply page

No Indeed. No RemoteOK. No Jobicy. Only real company pages + ATS platforms.
"""

import argparse, json, re, sys, time, math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import quote_plus, urlencode, urlparse
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
import xml.etree.ElementTree as ET


# ══════════════════════════════════════════════════════════════════════════════
# LOCATION ENGINE
# ══════════════════════════════════════════════════════════════════════════════

US_STATES = {
    "alabama":"al","alaska":"ak","arizona":"az","arkansas":"ar","california":"ca",
    "colorado":"co","connecticut":"ct","delaware":"de","florida":"fl","georgia":"ga",
    "hawaii":"hi","idaho":"id","illinois":"il","indiana":"in","iowa":"ia","kansas":"ks",
    "kentucky":"ky","louisiana":"la","maine":"me","maryland":"md","massachusetts":"ma",
    "michigan":"mi","minnesota":"mn","mississippi":"ms","missouri":"mo","montana":"mt",
    "nebraska":"ne","nevada":"nv","new hampshire":"nh","new jersey":"nj","new mexico":"nm",
    "new york":"ny","north carolina":"nc","north dakota":"nd","ohio":"oh","oklahoma":"ok",
    "oregon":"or","pennsylvania":"pa","rhode island":"ri","south carolina":"sc",
    "south dakota":"sd","tennessee":"tn","texas":"tx","utah":"ut","vermont":"vt",
    "virginia":"va","washington":"wa","west virginia":"wv","wisconsin":"wi","wyoming":"wy",
    "district of columbia":"dc",
}
US_STATES_REV = {v: k for k, v in US_STATES.items()}

CITY_ALIASES = {
    "new york":["new york city","nyc","ny city","manhattan","brooklyn","queens","bronx"],
    "los angeles":["la","l.a.","los angeles ca","socal"],
    "san francisco":["sf","s.f.","bay area","san francisco ca"],
    "austin":["austin tx","austin texas","atx"],
    "chicago":["chicago il","chicago illinois","chi","windy city"],
    "seattle":["seattle wa","seattle washington"],
    "boston":["boston ma","boston massachusetts"],
    "dallas":["dallas tx","dallas texas","dfw","dallas fort worth","dallas-fort worth"],
    "houston":["houston tx","houston texas"],
    "denver":["denver co","denver colorado"],
    "atlanta":["atlanta ga","atlanta georgia"],
    "miami":["miami fl","miami florida"],
    "washington":["washington dc","washington d.c.","d.c.","dc"],
    "san diego":["san diego ca","san diego california"],
    "portland":["portland or","portland oregon"],
    "phoenix":["phoenix az","phoenix arizona"],
    "raleigh":["raleigh nc","raleigh north carolina","research triangle"],
    "nashville":["nashville tn","nashville tennessee"],
    "minneapolis":["minneapolis mn","minneapolis minnesota","twin cities"],
}


def normalize_location(raw: str) -> dict:
    s = raw.lower().strip().rstrip(".")
    remote_words = ("remote","anywhere","work from home","wfh","distributed","worldwide")
    if s in remote_words or s.startswith("remote"):
        return {"city":"","state":"","state_full":"","tokens":{"remote","anywhere","distributed"},
                "is_remote":True,"is_us":False,"raw":raw}

    parts = re.split(r"[,\s]+", s)
    city_parts, state_abbr, state_full_name = [], "", ""
    for p in parts:
        if p in US_STATES_REV:
            state_abbr, state_full_name = p, US_STATES_REV[p]
        elif p in US_STATES:
            state_full_name, state_abbr = p, US_STATES[p]
        else:
            city_parts.append(p)

    city = " ".join(city_parts).strip()
    tokens: set = set()
    if city:
        tokens.add(city)
        for canonical, aliases in CITY_ALIASES.items():
            if city == canonical or city in aliases:
                tokens.add(canonical)
                tokens.update(a for a in aliases if len(a) > 2)
                break
    if state_abbr:
        tokens.add(state_abbr)
        tokens.add(state_full_name)
    if city and state_abbr:
        tokens.update([
            f"{city}, {state_abbr}", f"{city} {state_abbr}",
            f"{city}, {state_full_name}", f"{city} {state_full_name}",
        ])
    return {"city":city,"state":state_abbr,"state_full":state_full_name,
            "tokens":tokens,"is_remote":False,"is_us":bool(state_abbr),"raw":raw}


def location_matches(job_location: str, loc_info: dict) -> bool:
    if not job_location:
        return False
    jl = job_location.lower().strip()

    if loc_info["is_remote"]:
        return any(w in jl for w in ["remote","anywhere","work from home","distributed","worldwide"])

    # Pure remote job when user asked for a city → reject (unless hybrid + city present)
    if re.search(r'\bremote\b', jl) and "hybrid" not in jl and "onsite" not in jl:
        # allow "Remote - Austin, TX" style
        city = loc_info.get("city","")
        if city and city not in jl:
            return False

    for tok in loc_info["tokens"]:
        if tok and len(tok) > 1 and tok in jl:
            return True

    city = loc_info.get("city","")
    state = loc_info.get("state","")
    state_full = loc_info.get("state_full","")
    if city and city in jl: return True
    if state and re.search(rf'\b{re.escape(state)}\b', jl): return True
    if state_full and state_full in jl: return True
    return False


# ══════════════════════════════════════════════════════════════════════════════
# DATA MODEL
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class Job:
    title: str
    company: str
    location: str
    job_type: str          # full-time | part-time | internship | contract | remote
    posted_at: datetime
    url: str               # MUST be a direct apply/job-detail page
    source: str            # e.g. "Greenhouse", "Lever", "LinkedIn", "Google"
    description: str = ""
    skills: list = field(default_factory=list)
    relevance_score: float = 0.0

    @property
    def posted_ago(self) -> str:
        now = datetime.now(timezone.utc)
        p = self.posted_at if self.posted_at.tzinfo else self.posted_at.replace(tzinfo=timezone.utc)
        diff = now - p
        h = int(diff.total_seconds() / 3600)
        if h < 1:   return "Just now"
        if h < 24:  return f"{h}h ago"
        if h < 48:  return "Yesterday"
        return f"{diff.days}d ago"

    def age_days(self) -> float:
        now = datetime.now(timezone.utc)
        p = self.posted_at if self.posted_at.tzinfo else self.posted_at.replace(tzinfo=timezone.utc)
        return max(0.0, (now - p).total_seconds() / 86400)


# ══════════════════════════════════════════════════════════════════════════════
# FILTER ENGINE  — strict AND-gate
# ══════════════════════════════════════════════════════════════════════════════

def compute_relevance(job: Job, title_keywords: list, skills: list) -> float:
    """
    Score 0-100. Combines:
      - Title keyword match density
      - Skill match ratio
      - Recency bonus (decays over 30 days)
    """
    text = (job.title + " " + job.description).lower()
    title_text = job.title.lower()

    # Title score: bonus if keywords appear in title
    title_hits = sum(1 for kw in title_keywords if kw in title_text)
    title_score = (title_hits / max(len(title_keywords), 1)) * 40

    # Description keyword score
    desc_hits = sum(1 for kw in title_keywords if kw in text)
    desc_score = (desc_hits / max(len(title_keywords), 1)) * 20

    # Skill score
    skill_hits = sum(1 for s in skills if s.lower() in text)
    skill_score = (skill_hits / max(len(skills), 1)) * 30 if skills else 20

    # Recency score: 10 pts for today, decays to 0 at 30+ days
    age = job.age_days()
    recency_score = max(0.0, 10.0 * math.exp(-age / 10))

    return round(title_score + desc_score + skill_score + recency_score, 2)


def passes_all_filters(job: Job, *, loc_info: dict, job_type: str,
                        company: str, skills: list, title_keywords: list) -> tuple:
    reasons = []

    # 1. Title keyword
    if title_keywords:
        haystack = (job.title + " " + job.description[:400]).lower()
        if not any(kw in haystack for kw in title_keywords):
            reasons.append("title mismatch")

    # 2. Location — hard
    if loc_info.get("tokens") and not loc_info["is_remote"]:
        if not location_matches(job.location, loc_info):
            reasons.append(f"location '{job.location}' ≠ {loc_info.get('city','?')},{loc_info.get('state','?')}")

    # 3. Job type
    if job_type:
        haystack = (job.job_type+" "+job.title+" "+job.description[:400]).lower()
        if job_type.lower() not in haystack:
            reasons.append(f"type mismatch: {job_type}")

    # 4. Company — partial match OK
    if company:
        if company.lower() not in job.company.lower():
            reasons.append(f"company mismatch: wanted '{company}', got '{job.company}'")

    # 5. Skills — ALL must appear
    if skills:
        haystack = (job.title+" "+job.description).lower()
        missing = [s for s in skills if s.lower() not in haystack]
        if missing:
            reasons.append(f"missing skills: {missing}")

    return (len(reasons) == 0, reasons)


# ══════════════════════════════════════════════════════════════════════════════
# HTTP HELPERS
# ══════════════════════════════════════════════════════════════════════════════

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/124.0.0.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def fetch(url: str, timeout: int = 15, extra: dict = None, json_mode: bool = False) -> Optional[str]:
    try:
        h = {**HEADERS, **(extra or {})}
        if json_mode:
            h["Accept"] = "application/json, */*;q=0.8"
        req = Request(url, headers=h)
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            ce = resp.info().get("Content-Encoding","")
            if ce == "gzip":
                import gzip; raw = gzip.decompress(raw)
            return raw.decode("utf-8", errors="replace")
    except Exception as e:
        print(f"    [warn] {url[:65]}... → {type(e).__name__}: {str(e)[:40]}", file=sys.stderr)
        return None

def parse_date(s: str) -> datetime:
    if not s: return datetime.now(timezone.utc)
    fmts = [
        "%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S GMT",
        "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d",
    ]
    for fmt in fmts:
        try:
            dt = datetime.strptime(s.strip(), fmt)
            return dt.replace(tzinfo=timezone.utc) if not dt.tzinfo else dt
        except ValueError: continue
    return datetime.now(timezone.utc)

def relative_to_dt(text: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    t = text.lower().strip()
    if not t or t in ("just now","just posted","today","active today","new"): return now
    m = re.search(r"(\d+)\s*(second|minute|hour|day|week|month)", t)
    if not m: return None
    n, u = int(m.group(1)), m.group(2)
    d = {"second":timedelta(seconds=n),"minute":timedelta(minutes=n),
         "hour":timedelta(hours=n),"day":timedelta(days=n),
         "week":timedelta(weeks=n),"month":timedelta(days=n*30)}
    return now - d.get(u, timedelta(0))

def clean(s: str) -> str:
    return re.sub(r"<[^>]+>", " ", s or "").strip()

def infer_type(text: str) -> str:
    t = text.lower()
    if "intern" in t: return "internship"
    if "part-time" in t or "part time" in t: return "part-time"
    if "contract" in t: return "contract"
    if "temporary" in t or "temp " in t: return "contract"
    if "remote" in t: return "remote"
    return "full-time"

def extract_us_location(text: str, fallback: str = "") -> str:
    """Find 'City, ST' pattern in arbitrary text."""
    m = re.search(
        r'\b([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?),\s*'
        r'(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|'
        r'MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|'
        r'VT|VA|WA|WV|WI|WY|DC)\b', text)
    return f"{m.group(1)}, {m.group(2)}" if m else fallback


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 1 — GREENHOUSE ATS  (boards.greenhouse.io/COMPANY/jobs/ID)
# Returns real apply links. Used by: Airbnb, Stripe, Figma, Discord, Notion,
# Snowflake, Databricks, Robinhood, Reddit, Twitch, many more.
# ══════════════════════════════════════════════════════════════════════════════

# Greenhouse slugs for well-known companies
GREENHOUSE_COMPANIES = [
    # FAANG-adjacent / Big Tech
    "airbnb","stripe","figma","discord","notion","twitch","reddit","robinhood",
    "coinbase","databricks","snowflake","canva","duolingo","brex","plaid",
    "chime","affirm","checkr","gusto","lattice","rippling","airtable",
    # Austin-area companies
    "dell","nxp","oracle","opcity","homeaway","vrbo","bumble","match",
    "applied materials","samsung austin","google fiber","cloudflare",
    "doge","whole foods market","atlassian","zendesk","paypal",
    # Mid-size / growing
    "benchling","carta","coreweave","scale","weights-biases",
    "anthropic","openai","cohere","mistral","perplexity",
]


def scrape_greenhouse(title_kw: list, location: str, loc_info: dict,
                       job_type: str, company_filter: str) -> list:
    """
    Hit the Greenhouse board API for each company.
    Endpoint: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
    Returns real greenhouse.io apply links.
    """
    print("  → Greenhouse ATS (direct API)...", end=" ", flush=True)
    jobs = []

    # If company filter given, only hit that company's board
    slugs = [company_filter.lower().replace(" ","-")] if company_filter else GREENHOUSE_COMPANIES

    for slug in slugs[:25]:  # cap to avoid rate-limit
        url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
        text = fetch(url, json_mode=True)
        if not text: continue
        try:
            data = json.loads(text)
        except: continue

        for item in data.get("jobs", []):
            job_title = item.get("title","")
            # Filter by title keywords
            if not any(kw in job_title.lower() for kw in title_kw):
                continue

            # Location
            office = item.get("location",{})
            loc_name = office.get("name","") if isinstance(office, dict) else str(office)
            if not location_matches(loc_name, loc_info) and loc_info.get("tokens"):
                continue

            # URL — Greenhouse boards page IS the apply page
            apply_url = item.get("absolute_url","")
            if not apply_url:
                job_id = item.get("id","")
                apply_url = f"https://boards.greenhouse.io/{slug}/jobs/{job_id}"

            # Date — Greenhouse uses updated_at
            updated = item.get("updated_at","") or item.get("created_at","")
            posted_at = parse_date(updated)

            # Description
            desc = clean(item.get("content",""))[:500]

            # Job type from metadata
            jtype = job_type or infer_type(job_title + " " + desc)
            meta = item.get("metadata",[]) or []
            for m in meta:
                if isinstance(m, dict) and "employment" in m.get("name","").lower():
                    jtype = m.get("value","") or jtype

            jobs.append(Job(
                title=job_title,
                company=slug.replace("-"," ").title(),
                location=loc_name or location,
                job_type=jtype,
                posted_at=posted_at,
                url=apply_url,
                source="Greenhouse",
                description=desc,
            ))
        time.sleep(0.15)

    print(f"{len(jobs)} raw"); return jobs


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 2 — LEVER ATS  (jobs.lever.co/COMPANY)
# Used by: Netflix (some roles), Shopify, GitHub, Figma, Notion, Asana,
# HubSpot, Zoom, many startups
# ══════════════════════════════════════════════════════════════════════════════

LEVER_COMPANIES = [
    "netflix","shopify","hubspot","zoom","asana","squarespace","twilio",
    "pagerduty","fastly","segment","hashicorp","vercel","linear",
    "retool","loom","mercury","pilot","remote","dbt-labs","prefect",
    "grafana-labs","posthog","clickhouse","warpbuild","resend",
    "supabase","neon","fly","turso","modal","wandb","replit",
    # Austin companies
    "cloudflare","homeward","opcity","keller-williams","realpage",
    "civitas","bigcommerce","lifesize","opcity","vrbo",
]


def scrape_lever(title_kw: list, location: str, loc_info: dict,
                  job_type: str, company_filter: str) -> list:
    """
    Lever provides a public JSON API per company.
    Endpoint: https://api.lever.co/v0/postings/COMPANY?mode=json
    Links go directly to jobs.lever.co/COMPANY/UUID (apply page).
    """
    print("  → Lever ATS (direct API)...", end=" ", flush=True)
    jobs = []

    slugs = [company_filter.lower().replace(" ","-")] if company_filter else LEVER_COMPANIES

    for slug in slugs[:25]:
        params = {"mode":"json","limit":50}
        if location and not loc_info["is_remote"]:
            params["location"] = location
        url = f"https://api.lever.co/v0/postings/{slug}?" + urlencode(params)
        text = fetch(url, json_mode=True)
        if not text: continue
        try:
            data = json.loads(text)
        except: continue
        if not isinstance(data, list): continue

        for item in data:
            job_title = item.get("text","")
            if not any(kw in job_title.lower() for kw in title_kw):
                continue

            categories = item.get("categories",{})
            loc_name = categories.get("location","") or categories.get("allLocations","")
            if isinstance(loc_name, list):
                loc_name = ", ".join(loc_name)

            if not location_matches(loc_name, loc_info) and loc_info.get("tokens"):
                continue

            apply_url = item.get("hostedUrl","") or item.get("applyUrl","")
            if not apply_url:
                apply_url = f"https://jobs.lever.co/{slug}/{item.get('id','')}"

            posted_ts = item.get("createdAt",0)
            if isinstance(posted_ts, (int,float)) and posted_ts > 1e9:
                posted_at = datetime.fromtimestamp(posted_ts/1000, tz=timezone.utc)
            else:
                posted_at = datetime.now(timezone.utc)

            desc_obj = item.get("descriptionPlain","") or clean(item.get("description",""))
            desc = (desc_obj[:500] if desc_obj else "")

            commit = categories.get("commitment","")
            jtype = job_type or infer_type((commit+" "+job_title).lower())

            jobs.append(Job(
                title=job_title,
                company=slug.replace("-"," ").title(),
                location=loc_name or location,
                job_type=jtype,
                posted_at=posted_at,
                url=apply_url,
                source="Lever",
                description=desc,
            ))
        time.sleep(0.15)

    print(f"{len(jobs)} raw"); return jobs


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 3 — ASHBY ATS  (jobs.ashbyhq.com/COMPANY)
# Used by: Linear, Vercel, Descript, Ramp, Modern Treasury, etc.
# ══════════════════════════════════════════════════════════════════════════════

ASHBY_COMPANIES = [
    "linear","ramp","moderntreasury","descript","anduril","figma",
    "scale","runway","wayve","cohere","perplexity","midjourney",
    "poolside","sakana","imbue","llamaindex","langchain",
    "vanta","watershed","plain","incident.io","turntable",
]


def scrape_ashby(title_kw: list, location: str, loc_info: dict,
                  job_type: str, company_filter: str) -> list:
    """
    Ashby has an undocumented but stable public JSON endpoint.
    Links go to jobs.ashbyhq.com/COMPANY/UUID.
    """
    print("  → Ashby ATS (direct API)...", end=" ", flush=True)
    jobs = []
    slugs = [company_filter.lower().replace(" ","-")] if company_filter else ASHBY_COMPANIES

    for slug in slugs[:20]:
        url = f"https://jobs.ashbyhq.com/api/non-user-graphql"
        # Ashby uses GraphQL — use the public REST fallback
        rest_url = f"https://jobs.ashbyhq.com/{slug}"
        # Actually hit the JSON endpoint Ashby exposes
        api_url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true"
        text = fetch(api_url, json_mode=True)
        if not text: continue
        try:
            data = json.loads(text)
        except: continue

        for item in data.get("jobs", data if isinstance(data, list) else []):
            if not isinstance(item, dict): continue
            job_title = item.get("title","") or item.get("name","")
            if not job_title or not any(kw in job_title.lower() for kw in title_kw):
                continue

            loc_raw = item.get("location","") or item.get("locationName","")
            if isinstance(loc_raw, dict): loc_raw = loc_raw.get("name","")

            if not location_matches(loc_raw, loc_info) and loc_info.get("tokens"):
                continue

            job_id = item.get("id","") or item.get("jobId","")
            apply_url = item.get("jobUrl","") or item.get("applyUrl","")
            if not apply_url and job_id:
                apply_url = f"https://jobs.ashbyhq.com/{slug}/{job_id}"

            pub = item.get("publishedAt","") or item.get("createdAt","")
            posted_at = parse_date(pub) if pub else datetime.now(timezone.utc)

            desc = clean(item.get("descriptionHtml","") or item.get("description",""))[:500]
            jtype = job_type or infer_type(job_title+" "+desc)

            jobs.append(Job(
                title=job_title,
                company=slug.replace("-"," ").title(),
                location=loc_raw or location,
                job_type=jtype,
                posted_at=posted_at,
                url=apply_url,
                source="Ashby",
                description=desc,
            ))
        time.sleep(0.15)

    print(f"{len(jobs)} raw"); return jobs


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 4 — DIRECT FAANG CAREER PAGES
# Google, Amazon, Apple, Microsoft, Meta — each has its own jobs API/RSS
# ══════════════════════════════════════════════════════════════════════════════

def scrape_google_careers(title_kw: list, location: str, loc_info: dict, job_type: str) -> list:
    """Google Careers JSON search API."""
    print("  → Google Careers...", end=" ", flush=True)
    # Google Careers uses an internal API but exposes search via URL
    # We'll use their public search endpoint
    query = " ".join(title_kw)
    params = {
        "q": query,
        "location": location,
        "jex": "ENTRY_LEVEL,MID",
        "hl": "en_US",
    }
    url = "https://careers.google.com/api/v3/search/?" + urlencode(params)
    text = fetch(url, json_mode=True, extra={"Referer":"https://careers.google.com/"})
    jobs = []
    if text:
        try:
            data = json.loads(text)
            for item in data.get("jobs", []):
                job_title = item.get("title","")
                if not any(kw in job_title.lower() for kw in title_kw): continue
                locs = item.get("locations",[])
                loc_name = locs[0].get("display","") if locs else location
                if not location_matches(loc_name, loc_info) and loc_info.get("tokens"): continue
                job_id = item.get("id","")
                apply_url = f"https://careers.google.com/jobs/results/{job_id}"
                pub = item.get("publishDate","") or item.get("apply_end_date","")
                posted_at = parse_date(pub) if pub else datetime.now(timezone.utc)
                desc = clean(item.get("description","") or item.get("summary",""))[:500]
                jobs.append(Job(
                    title=job_title, company="Google", location=loc_name,
                    job_type=job_type or infer_type(job_title+desc),
                    posted_at=posted_at, url=apply_url,
                    source="Google Careers", description=desc,
                ))
        except: pass
    print(f"{len(jobs)} raw"); return jobs


def scrape_amazon_jobs(title_kw: list, location: str, loc_info: dict, job_type: str) -> list:
    """Amazon Jobs search API."""
    print("  → Amazon Jobs...", end=" ", flush=True)
    query = " ".join(title_kw)
    # Amazon Jobs uses a search API
    params = {
        "base_query": query,
        "loc_query": location,
        "job_count": 20,
        "result_limit": 20,
        "sort": "relevant",
        "country": "USA",
        "category[]": [],
    }
    url = "https://www.amazon.jobs/en/search.json?" + urlencode(params)
    text = fetch(url, json_mode=True, extra={"Referer":"https://www.amazon.jobs/"})
    jobs = []
    if text:
        try:
            data = json.loads(text)
            for item in data.get("jobs",[]):
                job_title = item.get("title","")
                if not any(kw in job_title.lower() for kw in title_kw): continue
                loc_name = item.get("location","")
                if not location_matches(loc_name, loc_info) and loc_info.get("tokens"): continue
                job_id = item.get("id_icims","")
                apply_url = f"https://www.amazon.jobs/en/jobs/{job_id}" if job_id else ""
                pub = item.get("posted_date","")
                posted_at = parse_date(pub) if pub else datetime.now(timezone.utc)
                desc = clean(item.get("description","") or item.get("description_short",""))[:500]
                jobs.append(Job(
                    title=job_title, company="Amazon", location=loc_name,
                    job_type=job_type or infer_type(job_title),
                    posted_at=posted_at, url=apply_url,
                    source="Amazon Jobs", description=desc,
                ))
        except: pass
    print(f"{len(jobs)} raw"); return jobs


def scrape_microsoft_careers(title_kw: list, location: str, loc_info: dict, job_type: str) -> list:
    """Microsoft Careers search."""
    print("  → Microsoft Careers...", end=" ", flush=True)
    query = " ".join(title_kw)
    params = {
        "q": query, "l": location, "pg": 1, "pgSz": 20, "o": "Relevance",
        "flt": "true",
    }
    url = "https://gcsservices.careers.microsoft.com/search/api/v1/search?" + urlencode(params)
    text = fetch(url, json_mode=True, extra={"Referer":"https://careers.microsoft.com/"})
    jobs = []
    if text:
        try:
            data = json.loads(text)
            for item in data.get("operationResult",{}).get("result",{}).get("jobs",[]):
                job_title = item.get("title","")
                if not any(kw in job_title.lower() for kw in title_kw): continue
                loc_name = item.get("primaryWorkLocation","") or item.get("workLocation","")
                if not location_matches(loc_name, loc_info) and loc_info.get("tokens"): continue
                job_id = item.get("jobId","")
                apply_url = f"https://careers.microsoft.com/us/en/job/{job_id}" if job_id else ""
                pub = item.get("postedDate","")
                posted_at = parse_date(pub) if pub else datetime.now(timezone.utc)
                desc = clean(item.get("description",""))[:500]
                jobs.append(Job(
                    title=job_title, company="Microsoft", location=loc_name,
                    job_type=job_type or infer_type(job_title),
                    posted_at=posted_at, url=apply_url,
                    source="Microsoft Careers", description=desc,
                ))
        except: pass
    print(f"{len(jobs)} raw"); return jobs


def scrape_meta_careers(title_kw: list, location: str, loc_info: dict, job_type: str) -> list:
    """Meta Careers GraphQL search."""
    print("  → Meta Careers...", end=" ", flush=True)
    query = " ".join(title_kw)
    url = "https://www.metacareers.com/graphql"
    payload = json.dumps({
        "operationName": "SearchJobsQuery",
        "variables": {
            "search_input": {
                "q": query,
                "location_id": "US",
                "results_per_page": 20,
                "page": 1,
                "sort_by_new": True,
            }
        },
        "doc_id": "4282745741744391",
    }).encode()
    jobs = []
    try:
        req = Request(url, data=payload, headers={
            **HEADERS,
            "Content-Type": "application/json",
            "Referer": "https://www.metacareers.com/jobs",
        })
        with urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read())
        for item in data.get("data",{}).get("job_search",{}).get("results",[]):
            job_title = item.get("title","")
            if not any(kw in job_title.lower() for kw in title_kw): continue
            loc_name = ", ".join(item.get("locations",[])) or location
            if not location_matches(loc_name, loc_info) and loc_info.get("tokens"): continue
            job_id = item.get("id","")
            apply_url = f"https://www.metacareers.com/jobs/{job_id}" if job_id else ""
            pub = item.get("post_date","")
            posted_at = parse_date(pub) if pub else datetime.now(timezone.utc)
            desc = clean(item.get("description","") or item.get("custom_fields",""))[:500]
            jobs.append(Job(
                title=job_title, company="Meta", location=loc_name,
                job_type=job_type or infer_type(job_title),
                posted_at=posted_at, url=apply_url,
                source="Meta Careers", description=desc,
            ))
    except: pass
    print(f"{len(jobs)} raw"); return jobs


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 5 — LINKEDIN GUEST API (real LinkedIn job page links)
# ══════════════════════════════════════════════════════════════════════════════

def scrape_linkedin(title: str, location: str, loc_info: dict, job_type: str) -> list:
    """
    LinkedIn guest API. Links are linkedin.com/jobs/view/ID — real job pages.
    """
    print("  → LinkedIn Jobs...", end=" ", flush=True)
    type_map = {"full-time":"F","fulltime":"F","part-time":"P","parttime":"P",
                "internship":"I","contract":"C"}
    f_jt = type_map.get(job_type.lower().replace(" ","")) if job_type else ""
    params = {"keywords": title, "location": location, "sortBy": "DD", "start": 0}
    if f_jt: params["f_JT"] = f_jt

    url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?" + urlencode(params)
    html = fetch(url)
    if not html: print("no response"); return []

    jobs = []
    title_re  = re.compile(r'class="base-search-card__title"[^>]*>\s*(.*?)\s*</h3>', re.S)
    co_re     = re.compile(r'class="base-search-card__subtitle"[^>]*>.*?<a[^>]*>\s*(.*?)\s*</a>', re.S)
    loc_re    = re.compile(r'class="job-search-card__location"[^>]*>\s*(.*?)\s*</span>', re.S)
    time_re   = re.compile(r'<time[^>]*datetime="([^"]+)"')
    link_re   = re.compile(r'href="(https://www\.linkedin\.com/jobs/view/[^"?&]+)')
    # Also grab the entity URN which lets us build a real apply link
    urn_re    = re.compile(r'data-entity-urn="urn:li:jobPosting:(\d+)"')

    for card in re.split(r'<li[^>]*>', html)[1:]:
        m = title_re.search(card)
        if not m: continue
        job_title = clean(m.group(1))
        m_co   = co_re.search(card)
        m_loc  = loc_re.search(card)
        m_time = time_re.search(card)
        m_link = link_re.search(card)
        m_urn  = urn_re.search(card)

        loc_name = clean(m_loc.group(1)) if m_loc else location
        # Location filter
        if not location_matches(loc_name, loc_info) and loc_info.get("tokens"):
            continue

        posted_at = parse_date(m_time.group(1)) if m_time else datetime.now(timezone.utc)

        # Prefer direct LinkedIn job URL
        if m_link:
            apply_url = m_link.group(1)
        elif m_urn:
            apply_url = f"https://www.linkedin.com/jobs/view/{m_urn.group(1)}/"
        else:
            continue  # skip if no URL

        company = clean(m_co.group(1)) if m_co else "Unknown"

        jobs.append(Job(
            title=job_title, company=company, location=loc_name,
            job_type=job_type or infer_type(job_title),
            posted_at=posted_at, url=apply_url, source="LinkedIn",
        ))

    print(f"{len(jobs)} raw"); return jobs


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 6 — GOOGLE SEARCH → discover additional career pages
# Finds jobs on company sites not covered by the ATS lists above
# ══════════════════════════════════════════════════════════════════════════════

KNOWN_CAREER_DOMAINS = {
    "careers.google.com", "amazon.jobs", "jobs.apple.com", "careers.microsoft.com",
    "metacareers.com", "jobs.netflix.com", "careers.salesforce.com",
    "careers.adobe.com", "jobs.stripe.com", "careers.airbnb.com",
    "careers.uber.com", "careers.lyft.com", "careers.shopify.com",
    "boards.greenhouse.io", "jobs.lever.co", "jobs.ashbyhq.com",
    "apply.workday.com", "careers.twitter.com", "jobs.github.com",
    "careers.cloudflare.com", "jobs.twilio.com", "careers.databricks.com",
    "careers.snowflake.com", "careers.palantir.com", "careers.coinbase.com",
    "careers.doordash.com", "careers.instacart.com", "careers.figma.com",
    "careers.notion.so", "careers.discord.com", "jobs.gusto.com",
}

# Domains to skip (aggregators / irrelevant)
SKIP_DOMAINS = {
    "indeed.com","glassdoor.com","ziprecruiter.com","monster.com",
    "careerbuilder.com","simplyhired.com","dice.com","snagajob.com",
    "remoteok.com","jobicy.com","weworkremotely.com","flexjobs.com",
    "otta.com","builtin.com","wellfound.com",
    "google.com","youtube.com","facebook.com","twitter.com",
    "reddit.com","quora.com","wikipedia.org","support.google.com",
}


def _google_search(query: str, num: int = 15) -> Optional[str]:
    params = {"q": query, "num": num, "hl": "en", "gl": "us", "cr": "countryUS"}
    url = "https://www.google.com/search?" + urlencode(params)
    return fetch(url, extra={"Referer":"https://www.google.com/","Accept-Language":"en-US,en;q=0.9"})


def _parse_serp_jobs(html: str, search_title: str, location: str,
                      loc_info: dict, job_type: str) -> list:
    """
    Extract job postings from a Google SERP.
    Only accepts URLs that go to real job/apply pages (career domains or ATS).
    """
    jobs = []
    link_h3 = re.compile(
        r'<a[^>]+href="(https?://([^/"]+)[^"]*)"[^>]*>[^<]*<h3[^>]*>([^<]+)</h3>',
        re.DOTALL)
    date_re  = re.compile(r'(\d+)\s*(hour|day|week|minute)s?\s*ago', re.I)
    snip_re  = re.compile(r'(?:VwiC3b|IsZvec|MUxGbd)[^"]*"[^>]*>(.*?)</(?:span|div)>', re.DOTALL)
    seen = set()

    title_words = search_title.lower().split()

    for m in link_h3.finditer(html):
        url, domain, raw_title = m.group(1), m.group(2).lower(), clean(m.group(3))
        if url in seen or len(url) > 350: continue
        seen.add(url)

        # Skip aggregators and irrelevant domains
        if any(skip in domain for skip in SKIP_DOMAINS): continue
        if any(q in url for q in ["/search?","/url?","accounts.google"]): continue

        # Must loosely match title
        if not any(w in raw_title.lower() for w in title_words): continue

        # Skip if URL doesn't look like a real job page
        if not any([
            any(cd in domain for cd in ["greenhouse.io","lever.co","ashbyhq.com",
                                         "workday.com","careers.","jobs.","career."]),
            "/jobs/" in url, "/careers/" in url, "/job/" in url,
            "/apply/" in url, "/opening/" in url,
        ]):
            continue

        company = _company_from_domain(domain)
        idx = html.find(url)
        nearby = html[max(0,idx-100): idx+700]
        dm = date_re.search(nearby)
        posted_at = (relative_to_dt(dm.group(0)) or datetime.now(timezone.utc)) if dm else datetime.now(timezone.utc)
        sm = snip_re.search(nearby)
        desc = clean(sm.group(1))[:400] if sm else ""
        loc = extract_us_location(nearby + " " + desc, location)
        if not location_matches(loc, loc_info) and loc_info.get("tokens"):
            loc = location  # keep it for title match but it'll fail filter later

        jobs.append(Job(
            title=raw_title, company=company, location=loc,
            job_type=job_type or infer_type(raw_title+" "+desc),
            posted_at=posted_at, url=url,
            source="CompanySite", description=desc,
        ))
    return jobs


def _company_from_domain(domain: str) -> str:
    known = {
        "google":"Google","amazon":"Amazon","apple":"Apple","microsoft":"Microsoft",
        "meta":"Meta","netflix":"Netflix","salesforce":"Salesforce","adobe":"Adobe",
        "stripe":"Stripe","airbnb":"Airbnb","uber":"Uber","lyft":"Lyft",
        "twilio":"Twilio","github":"GitHub","shopify":"Shopify","snowflake":"Snowflake",
        "databricks":"Databricks","palantir":"Palantir","coinbase":"Coinbase",
        "doordash":"DoorDash","instacart":"Instacart","canva":"Canva","figma":"Figma",
        "notion":"Notion","discord":"Discord","cloudflare":"Cloudflare",
        "nvidia":"NVIDIA","amd":"AMD","intel":"Intel","oracle":"Oracle",
        "ibm":"IBM","qualcomm":"Qualcomm","dell":"Dell","hp":"HP",
        "atlassian":"Atlassian","hubspot":"HubSpot","zoom":"Zoom","slack":"Slack",
        "gusto":"Gusto","rippling":"Rippling","brex":"Brex","ramp":"Ramp",
        "greenhouse":"(Greenhouse)","lever":"(Lever)","workday":"(Workday)",
    }
    for k, v in known.items():
        if k in domain: return v
    # Extract from subdomain like careers.company.com
    m = re.search(r'(?:careers|jobs|apply)\.([^.]+)\.', domain)
    if m: return m.group(1).title()
    m2 = re.search(r'^([^.]+)\.', domain)
    if m2: return m2.group(1).replace("-"," ").title()
    return domain.title()


def scrape_via_google(title: str, location: str, loc_info: dict,
                       job_type: str, company_filter: str, skills: list) -> list:
    """Use Google search to find company career pages and ATS postings."""
    print("  → Google search (company career pages)...", end=" ", flush=True)
    jobs = []
    loc_q = location.replace(",","").strip()
    co_q  = f'"{company_filter}"' if company_filter else ""
    type_q = f'"{job_type}"' if job_type else ""
    skills_q = " ".join(skills[:3]) if skills else ""

    # Query 1: ATS platforms + location
    ats = " OR ".join([
        "site:boards.greenhouse.io", "site:jobs.lever.co",
        "site:jobs.ashbyhq.com", "site:apply.workday.com",
    ])
    q1 = f'"{title}" {co_q} {type_q} {loc_q} {skills_q} ({ats})'
    h1 = _google_search(q1.strip())
    if h1: jobs.extend(_parse_serp_jobs(h1, title, location, loc_info, job_type))
    time.sleep(0.5)

    # Query 2: FAANG career pages
    faang = " OR ".join([
        "site:careers.google.com", "site:amazon.jobs", "site:jobs.apple.com",
        "site:careers.microsoft.com", "site:metacareers.com",
    ])
    q2 = f'"{title}" {loc_q} {co_q} ({faang})'
    h2 = _google_search(q2.strip())
    if h2: jobs.extend(_parse_serp_jobs(h2, title, location, loc_info, job_type))
    time.sleep(0.5)

    # Query 3: startup/mid-size career pages
    q3 = f'"{title}" jobs {loc_q} {type_q} {co_q} (site:careers.* OR site:jobs.* OR "/careers/" OR "/jobs/")'
    q3 = f'"{title}" {type_q} {loc_q} {co_q} careers OR jobs -site:indeed.com -site:linkedin.com -site:glassdoor.com -site:ziprecruiter.com'
    h3 = _google_search(q3.strip())
    if h3: jobs.extend(_parse_serp_jobs(h3, title, location, loc_info, job_type))

    print(f"{len(jobs)} raw"); return jobs


# ══════════════════════════════════════════════════════════════════════════════
# DISPLAY
# ══════════════════════════════════════════════════════════════════════════════

COLORS = {
    "reset":"\033[0m","bold":"\033[1m","dim":"\033[2m",
    "cyan":"\033[96m","green":"\033[92m","yellow":"\033[93m",
    "red":"\033[91m","blue":"\033[94m","magenta":"\033[95m",
    "white":"\033[97m","gray":"\033[90m","orange":"\033[38;5;208m",
}
SOURCE_COLORS = {
    "Greenhouse":"\033[92m","Lever":"\033[96m","Ashby":"\033[94m",
    "LinkedIn":"\033[34m","Google Careers":"\033[91m",
    "Amazon Jobs":"\033[38;5;208m","Microsoft Careers":"\033[94m",
    "Meta Careers":"\033[94m","CompanySite":"\033[93m",
}
TYPE_SYMBOLS = {
    "full-time":"●","part-time":"◑","internship":"★","contract":"◆","remote":"⌂",
}
SOURCE_LABELS = {
    "Greenhouse":"🌿 Greenhouse","Lever":"🎛  Lever","Ashby":"🔷 Ashby",
    "LinkedIn":"💼 LinkedIn","Google Careers":"🔵 Google","Amazon Jobs":"📦 Amazon",
    "Microsoft Careers":"🪟 Microsoft","Meta Careers":"📘 Meta",
    "CompanySite":"🏢 Company Site",
}

def c(col: str, txt: str) -> str:
    return f"{COLORS.get(col,'')}{txt}{COLORS['reset']}"

def print_job(job: Job, index: int) -> None:
    sym = TYPE_SYMBOLS.get(job.job_type, "○")
    src_col = SOURCE_COLORS.get(job.source, COLORS["white"])
    src_label = SOURCE_LABELS.get(job.source, job.source)
    src_badge = f"{src_col}{src_label}{COLORS['reset']}"
    type_col = ("green" if job.job_type == "full-time"
                else "yellow" if job.job_type in ("internship","remote")
                else "cyan")
    score_bar = "▰" * min(int(job.relevance_score / 10), 10)

    print(f"\n  {c('bold',f'{index:02d}.')} {c('bold', job.title)}")
    print(f"      🏢 {c('white', job.company)}   📍 {job.location}   "
          f"{c(type_col, sym+' '+job.job_type.upper())}")
    print(f"      {src_badge}   {c('gray','⏱ '+job.posted_ago)}   "
          f"{c('dim','relevance: ')}{c('cyan', score_bar)} {c('dim',str(job.relevance_score))}")
    print(f"      🔗 {c('cyan', job.url)}")
    if job.skills:
        print(f"      {c('dim','  '.join('#'+s for s in job.skills[:6]))}")
    if job.description:
        preview = job.description[:140].replace("\n"," ").strip()
        print(f"      {c('dim', preview+'…')}")


def print_header(args, loc_info: dict) -> None:
    print("\n"+"═"*74)
    print(f"  {c('bold',c('cyan','🔍 JOB SCRAPER v3'))}  {c('dim','— Direct company career pages · ATS APIs · FAANG')}")
    print("─"*74)
    print(f"  {c('bold','Job Title  :')} {args.title}")
    if args.location:
        cs = (f"{loc_info['city'].title()}, {loc_info['state'].upper()}"
              if loc_info.get('city') else args.location)
        print(f"  {c('bold','Location   :')} {args.location}  {c('dim',f'→ enforcing: {cs}')}")
    if args.type:    print(f"  {c('bold','Job Type   :')} {args.type}")
    if args.company: print(f"  {c('bold','Company    :')} {args.company}")
    if args.skills:  print(f"  {c('bold','Skills     :')} {', '.join(args.skills)}")
    print(f"  {c('bold','Sort by    :')} {args.sort}")
    print(f"  {c('yellow','⚠  All criteria are mandatory — only matching jobs listed')}")
    print("═"*74)


def print_summary(jobs: list, raw: int, filtered: int) -> None:
    from collections import Counter
    print("\n"+"═"*74)
    status = c('green', f'✅  {len(jobs)} jobs') if jobs else c('yellow','⚠  0 jobs')
    print(f"  {status}  {c('dim',f'({raw} fetched → {filtered} passed filters → top {len(jobs)})')}")
    if jobs:
        srcs  = Counter(j.source for j in jobs)
        types = Counter(j.job_type for j in jobs)
        print("  Sources : "+"  ".join(f"{s}: {n}" for s,n in srcs.most_common()))
        print("  Types   : "+"  ".join(f"{t}: {n}" for t,n in types.most_common()))
    print("═"*74)


# ══════════════════════════════════════════════════════════════════════════════
# SORT
# ══════════════════════════════════════════════════════════════════════════════

def sort_jobs(jobs: list, mode: str) -> list:
    """
    recent         — newest first
    relevant       — relevance score first
    recent+relevant— weighted combo: recency * relevance (default)
    """
    def _dt(j):
        dt = j.posted_at
        return dt.replace(tzinfo=timezone.utc) if not dt.tzinfo else dt

    if mode == "recent":
        return sorted(jobs, key=_dt, reverse=True)
    elif mode == "relevant":
        return sorted(jobs, key=lambda j: j.relevance_score, reverse=True)
    else:  # recent+relevant (default)
        def combo(j):
            age_penalty = math.exp(-j.age_days() / 14)   # halves every 14 days
            return j.relevance_score * (0.4 + 0.6 * age_penalty)
        return sorted(jobs, key=combo, reverse=True)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════════════

def scrape_all(args) -> tuple:
    title: str      = args.title
    location: str   = args.location or ""
    job_type: str   = args.type or ""
    company: str    = args.company or ""
    skills: list    = args.skills or []

    loc_info = normalize_location(location)
    title_kw = [w.lower() for w in title.split() if len(w) > 2]

    all_jobs: list = []

    sources = [
        ("Greenhouse",  lambda: scrape_greenhouse(title_kw, location, loc_info, job_type, company)),
        ("Lever",       lambda: scrape_lever(title_kw, location, loc_info, job_type, company)),
        ("Ashby",       lambda: scrape_ashby(title_kw, location, loc_info, job_type, company)),
        ("LinkedIn",    lambda: scrape_linkedin(title, location, loc_info, job_type)),
        ("Google Jobs", lambda: scrape_google_careers(title_kw, location, loc_info, job_type)),
        ("Amazon",      lambda: scrape_amazon_jobs(title_kw, location, loc_info, job_type)),
        ("Microsoft",   lambda: scrape_microsoft_careers(title_kw, location, loc_info, job_type)),
        ("Meta",        lambda: scrape_meta_careers(title_kw, location, loc_info, job_type)),
        ("Google SERP", lambda: scrape_via_google(title, location, loc_info, job_type, company, skills)),
    ]

    for name, fn in sources:
        try:
            results = fn()
            all_jobs.extend(results)
        except Exception as e:
            print(f"    [error] {name}: {e}", file=sys.stderr)
        time.sleep(0.4)

    total_raw = len(all_jobs)

    # ── Compute relevance ──────────────────────────────────────────────────
    for job in all_jobs:
        job.relevance_score = compute_relevance(job, title_kw, skills)

    # ── Strict AND-gate filter ──────────────────────────────────────────────
    passed = []
    for job in all_jobs:
        ok, _ = passes_all_filters(
            job, loc_info=loc_info, job_type=job_type,
            company=company, skills=skills, title_keywords=title_kw,
        )
        if ok:
            passed.append(job)

    total_filtered = len(passed)

    # ── Deduplicate by URL ──────────────────────────────────────────────────
    seen: set = set()
    deduped = []
    for job in passed:
        key = job.url.split("?")[0].rstrip("/").lower()
        if key not in seen:
            seen.add(key)
            deduped.append(job)

    # ── Sort ────────────────────────────────────────────────────────────────
    deduped = sort_jobs(deduped, args.sort)

    return deduped, total_raw, total_filtered


def save_results(jobs: list, fmt: str, path: str) -> None:
    if fmt == "json":
        data = [{
            "title":j.title,"company":j.company,"location":j.location,
            "type":j.job_type,"posted":j.posted_at.isoformat(),
            "posted_ago":j.posted_ago,"relevance":j.relevance_score,
            "url":j.url,"source":j.source,"skills":j.skills,
            "description":j.description[:300],
        } for j in jobs]
        with open(path,"w") as f: json.dump(data, f, indent=2)
    elif fmt == "csv":
        import csv
        with open(path,"w",newline="") as f:
            w = csv.DictWriter(f, fieldnames=[
                "title","company","location","type","posted","posted_ago",
                "relevance","source","url"])
            w.writeheader()
            for j in jobs:
                w.writerow({
                    "title":j.title,"company":j.company,"location":j.location,
                    "type":j.job_type,"posted":j.posted_at.isoformat(),
                    "posted_ago":j.posted_ago,"relevance":j.relevance_score,
                    "source":j.source,"url":j.url,
                })
    print(f"\n  💾 Saved {len(jobs)} results → {path}")


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="job_scraper",
        description="Direct company career page scraper — real apply links, strict filters",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Sort options:
  recent+relevant  (default) — weighted combo: recent and relevant jobs first
  recent           — newest postings first
  relevant         — best title/skill match first

Examples:
  python job_search.py "software engineer" --location "Austin, TX"
  python job_search.py "data analyst" --location "Austin, TX" --type internship
  python job_search.py "backend engineer" --location "Austin, TX" --skills python django --sort recent
  python job_search.py "product manager" --location "Austin, TX" --company Stripe
  python job_search.py "ML engineer" --location "San Francisco, CA" --skills pytorch --save jobs.json
  python job_search.py "software engineer" --location "Austin, TX" --company Apple --sort relevant
        """)
    p.add_argument("title",           help="Job title to search (e.g. 'software engineer')")
    p.add_argument("--location","-l", default="",
                   help="City, ST — ONLY jobs from this location are shown (e.g. 'Austin, TX')")
    p.add_argument("--type","-t",
                   choices=["full-time","part-time","internship","contract","remote"],
                   help="Job type (enforced)")
    p.add_argument("--company","-c",  default="",
                   help="Filter by company name (partial match, e.g. 'Apple', 'Stripe')")
    p.add_argument("--skills","-s",   nargs="+", default=[],
                   help="Skills that MUST appear in description (e.g. --skills python react sql)")
    p.add_argument("--sort",          default="recent+relevant",
                   choices=["recent","relevant","recent+relevant"],
                   help="Sort order (default: recent+relevant)")
    p.add_argument("--limit","-n",    type=int, default=50,
                   help="Max results to display (default: 50)")
    p.add_argument("--save",          metavar="FILE",
                   help="Export to .json or .csv")
    p.add_argument("--no-color",      action="store_true", help="Plain text output")
    return p


def main():
    parser = build_parser()
    if len(sys.argv) == 1:
        parser.print_help()
        print('\n  Quick start: python job_search.py "software engineer" --location "Austin, TX"\n')
        sys.exit(0)

    args = parser.parse_args()

    if args.no_color or not sys.stdout.isatty():
        for k in COLORS: COLORS[k] = ""
        for k in SOURCE_COLORS: SOURCE_COLORS[k] = ""

    loc_info = normalize_location(args.location or "")
    print_header(args, loc_info)
    print(f"\n  Scraping 9 sources — this takes ~15–25s...\n")

    jobs, total_raw, total_filtered = scrape_all(args)
    jobs = jobs[:args.limit]
    print_summary(jobs, total_raw, total_filtered)

    if not jobs:
        print(f"\n  {c('yellow','⚠  No jobs matched all your criteria.')}")
        print(f"\n  {c('dim','Suggestions:')}")
        print(f"  {c('dim','  • Try a shorter title: \"engineer\" instead of \"senior software engineer\"')}")
        print(f"  {c('dim','  • Fewer skills (remove --skills) — all must match')}")
        print(f"  {c('dim','  • Check location: \"Austin, TX\" not \"Austin Texas\"')}")
        print(f"  {c('dim','  • Remove --company to see all companies')}")
        print()
        return

    loc_label = args.location or "all locations"
    print(f"\n  {c('bold','Results')} — {len(jobs)} jobs in {loc_label} · sorted by {args.sort}:\n")
    for i, job in enumerate(jobs, 1):
        print_job(job, i)

    if args.save:
        ext = args.save.rsplit(".",1)[-1].lower()
        save_results(jobs, fmt=ext if ext in ("json","csv") else "json", path=args.save)

    print(f"\n  {c('dim','─'*72)}")
    print(f"  {c('dim','Tip: --sort recent|relevant|recent+relevant   --save results.csv')}\n")


if __name__ == "__main__":
    main()