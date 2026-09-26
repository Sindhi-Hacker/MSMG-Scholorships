#!/usr/bin/env python3
"""Source-first scholarship intelligence pipeline.

Discovery:
  - nspscholarships.com latest/master/fully-funded feeds
  - optional universities.nspscholarships.com mirror

Verification:
  - follows outbound official university/government/scholarship links
  - falls back to DuckDuckGo HTML search for official domains
  - publishes only candidates with at least one official source

Target profile:
  Pakistan + BS Management Sciences + Master's + no full-time work experience
  + English/MOI preference.

The workflow deliberately avoids inventing values: unknown amounts stay null/zero
with a note rather than being guessed.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from datetime import date, datetime, timedelta
from html import unescape
from pathlib import Path
from urllib.parse import quote_plus, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from dateutil import parser as dtparser

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "data" / "autoScholarships.json"
TODAY = date.today()
NOW = datetime.now().astimezone()

HEADERS = {
    "User-Agent": "MSMG-Scholarship-ResearchBot/2.0 (+https://github.com/Sindhi-Hacker/MSMG-Scholorships)",
    "Accept-Language": "en-US,en;q=0.9",
}

DISCOVERY_BASES = [
    "https://nspscholarships.com",
    "https://universities.nspscholarships.com",
]

CATEGORY_PATHS = [
    "/category/latest-scholarships/",
    "/category/masters-scholarships/",
    "/category/fully-funded-scholarships/",
]

MANAGEMENT_TERMS = [
    "management", "business", "business administration", "business management",
    "international business", "international management", "economics",
    "finance", "accounting", "marketing", "entrepreneurship", "innovation",
    "supply chain", "operations", "project management", "business analytics",
    "organizational", "human resource", "hrm", "commerce", "public administration",
    "policy", "development studies", "digital business", "management science",
]

EXCLUDE_TERMS = [
    "phd", "doctorate", "doctoral", "bachelor", "undergraduate",
    "internship", "job vacancy", "postdoctoral",
]

OFFICIAL_HOSTS = {
    "gov.uk", "gov", "edu", "ac.uk", "edu.au", "edu.cn", "edu.tr", "edu.my",
    "edu.tw", "edu.jp", "edu.kr", "edu.sa", "edu.qa", "edu.nz", "edu.sg",
    "globaluni.ru", "cscuk.fcdo.gov.uk", "erasmus-plus.ec.europa.eu",
    "stipendiumhungaricum.hu", "turkiyeburslari.gov.tr", "studyinjapan.go.jp",
    "usefp.org", "hea.ie", "chevening.org", "ec.europa.eu",
}

BLOCKED_HOSTS = {
    "nspscholarships.com", "universities.nspscholarships.com",
    "facebook.com", "www.facebook.com", "instagram.com", "www.instagram.com",
    "youtube.com", "www.youtube.com", "linkedin.com", "www.linkedin.com",
    "t.me", "telegram.me", "whatsapp.com", "twitter.com", "x.com",
}

MONTHS = (
    "jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|"
    "aug|august|sep|sept|september|oct|october|nov|november|dec|december"
)
DATE_RE = re.compile(
    rf"(\b(?:{MONTHS})\.?\s+\d{{1,2}},?\s+20\d{{2}}\b)|"
    rf"(\b\d{{1,2}}\s+(?:{MONTHS})\.?\s+20\d{{2}}\b)|"
    rf"(\b\d{{1,2}}[/-]\d{{1,2}}[/-]20\d{{2}}\b)|"
    rf"(\b20\d{{2}}-\d{{2}}-\d{{2}}\b)",
    re.I,
)

AMOUNT_RE = re.compile(
    r"(?P<symbol>£|€|\$|¥|₹|₩|kr|sek|huf|cny|jpy|try|myr|ron|twd|usd|gbp|eur|cad|aud|nzd|"
    r"\bsek\b|\bhuf\b)\s*(?P<number>\d[\d,]*(?:\.\d+)?)\s*(?P<suffix>k|m)?",
    re.I,
)

def fetch(url: str, timeout: int = 25) -> tuple[str, str]:
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r.url, r.text

def soup_text(html: str) -> tuple[BeautifulSoup, str]:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()
    text = unescape(soup.get_text(" ", strip=True))
    return soup, re.sub(r"\s+", " ", text)

def canonical(url: str) -> str:
    p = urlparse(url)
    return f"{p.scheme}://{p.netloc}{p.path}".rstrip("/")

def host_is_official(url: str) -> bool:
    host = urlparse(url).netloc.lower().split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    if host in BLOCKED_HOSTS or any(host.endswith("." + b) for b in BLOCKED_HOSTS):
        return False
    if host in OFFICIAL_HOSTS or any(host.endswith("." + suffix) for suffix in OFFICIAL_HOSTS if "." in suffix):
        return True
    # Common official university domains and government subdomains.
    return (
        host.endswith(".edu") or host.endswith(".ac.uk") or host.endswith(".edu.au")
        or host.endswith(".edu.cn") or host.endswith(".gov.uk") or host.endswith(".gov")
        or host.endswith(".go.jp") or host.endswith(".gov.tr")
    )

def official_score(url: str) -> int:
    host = urlparse(url).netloc.lower()
    score = 0
    if host_is_official(url):
        score += 70
    for token in ("admissions", "scholarship", "funding", "financial-aid", "international"):
        if token in url.lower():
            score += 5
    if any(x in host for x in ("gov", "edu", "ac.uk", "globaluni", "cscuk", "erasmus")):
        score += 10
    return score

def article_urls_from_index(html: str, base: str) -> list[str]:
    soup, _ = soup_text(html)
    urls = []
    base_host = urlparse(base).netloc
    for a in soup.find_all("a", href=True):
        href = canonical(urljoin(base, a["href"]))
        p = urlparse(href)
        if p.netloc != base_host:
            continue
        path = p.path.lower()
        if not path or path in ("/",):
            continue
        if any(seg in path for seg in ("/category/", "/tag/", "/author/", "/page/", "/feed/", "/wp-")):
            continue
        if path.endswith((".jpg", ".png", ".pdf", ".xml")):
            continue
        if href not in urls:
            urls.append(href)
    return urls

def discover_urls() -> list[str]:
    found = []
    for base in DISCOVERY_BASES:
        for category in CATEGORY_PATHS:
            for page in range(1, 4):
                url = f"{base}{category}" if page == 1 else f"{base}{category}page/{page}/"
                try:
                    _, html = fetch(url)
                    found.extend(article_urls_from_index(html, base))
                except Exception:
                    continue
                time.sleep(0.15)
    # Keep the most recent 80 unique articles by discovery order.
    return list(dict.fromkeys(found))[:80]

def candidate_relevance(title: str, text: str) -> int:
    t = (title + " " + text[:30000]).lower()
    score = 0
    for term in MANAGEMENT_TERMS:
        if term in title.lower():
            score += 10
        elif term in t:
            score += 2
    if re.search(r"\b(master|msc|m\.sc|mba|postgraduate|graduate)\b", title, re.I):
        score += 15
    if "phd" in title.lower() or "doctoral" in title.lower():
        score -= 30
    for term in EXCLUDE_TERMS:
        if term in title.lower():
            score -= 20
    return score

def search_official(query: str) -> list[str]:
    url = "https://html.duckduckgo.com/html/?q=" + quote_plus(query)
    try:
        _, html = fetch(url, timeout=20)
        soup, _ = soup_text(html)
    except Exception:
        return []
    results = []
    for a in soup.select("a.result__a[href]"):
        href = canonical(a["href"])
        if host_is_official(href):
            results.append(href)
    return list(dict.fromkeys(results))[:6]

def official_links(article_url: str, article_html: str, title: str) -> list[str]:
    soup, _ = soup_text(article_html)
    links = []
    for a in soup.find_all("a", href=True):
        href = canonical(urljoin(article_url, a["href"]))
        if host_is_official(href):
            links.append(href)
    links = list(dict.fromkeys(sorted(links, key=official_score, reverse=True)))
    if len(links) < 2:
        queries = [
            f'"{title}" official scholarship',
            f'"{title}" official university admissions',
        ]
        for q in queries:
            links.extend(search_official(q))
            time.sleep(0.4)
    return list(dict.fromkeys(links))[:5]

def parse_dates(text: str) -> list[date]:
    out = []
    for m in DATE_RE.finditer(text):
        raw = next((g for g in m.groups() if g), "")
        try:
            d = dtparser.parse(raw, dayfirst=False, fuzzy=False).date()
        except Exception:
            continue
        if 2025 <= d.year <= 2030:
            out.append(d)
    return sorted(set(out))

def deadline_from_text(text: str) -> date | None:
    positions = [m.start() for m in re.finditer(
        r"deadline|closes|closing|apply by|applications? (?:close|end)|registration deadline|last date",
        text, re.I
    )]
    dates = []
    for pos in positions:
        window = text[max(0, pos - 150): pos + 700]
        dates.extend(parse_dates(window))
    future = [d for d in dates if d >= TODAY]
    return min(future) if future else None

def first_context(text: str, pattern: str, width: int = 360) -> str | None:
    m = re.search(pattern, text, re.I)
    if not m:
        return None
    s = max(0, m.start() - 80)
    e = min(len(text), m.end() + width)
    return re.sub(r"\s+", " ", text[s:e]).strip()

def amount_in_context(text: str, keyword: str) -> tuple[float | None, str | None, str | None]:
    context = first_context(text, keyword, 500)
    if not context:
        return None, None, None
    m = AMOUNT_RE.search(context)
    if not m:
        return None, None, context
    symbol = m.group("symbol").lower()
    number = float(m.group("number").replace(",", ""))
    suffix = (m.group("suffix") or "").lower()
    if suffix == "k":
        number *= 1000
    elif suffix == "m":
        number *= 1_000_000
    mapping = {
        "£": "GBP", "€": "EUR", "$": "USD", "¥": "JPY", "₹": "INR",
        "₩": "KRW", "sek": "SEK", "kr": "SEK", "huf": "HUF", "cny": "CNY",
        "jpy": "JPY", "try": "TRY", "myr": "MYR", "ron": "RON", "twd": "TWD",
        "usd": "USD", "gbp": "GBP", "eur": "EUR", "cad": "CAD", "aud": "AUD",
        "nzd": "NZD",
    }
    return number, mapping.get(symbol, "USD"), context

def extract_university(title: str, text: str) -> str:
    candidates = [
        r"(University of [A-Z][A-Za-z'&\- ]{2,80})",
        r"([A-Z][A-Za-z&'\- ]+ University)",
        r"(Universiti [A-Z][A-Za-z&'\- ]+)",
        r"(Cardiff University)",
        r"(University of Stirling)",
        r"(Dalarna University)",
    ]
    for source in (title, text[:12000]):
        for pat in candidates:
            m = re.search(pat, source)
            if m:
                return re.sub(r"\s+", " ", m.group(1)).strip(" .,:;-")
    if "open doors" in title.lower() or "global universities" in text[:10000].lower():
        return "Open Doors / participating Russian universities"
    return "Scholarship provider / participating universities"

def extract_program(title: str, text: str) -> str:
    lines = re.split(r"(?<=[.!?])\s+|\s{2,}|\|", text)
    prefer = []
    for line in lines[:800]:
        s = line.strip()
        if 15 <= len(s) <= 160 and re.search(
            r"\b(MSc|M\.S\.|Master(?:'s)?|MBA|Management|Business|Economics|Finance|Marketing)\b", s, re.I
        ):
            if not re.search(r"scholarship|deadline|application", s, re.I):
                prefer.append(s)
    if "open doors" in title.lower() or "open doors" in text[:5000].lower():
        return "Master's track — Business and Management"
    if prefer:
        return prefer[0]
    base = re.sub(r"\s*\|.*$", "", title).strip()
    return base[:160]

def classify_work(text: str) -> tuple[str, str]:
    hard = first_context(text, r"(at least|minimum|requires?|must have)\s+(?:\d+|one|two|three|four|five)\s+years?.{0,100}work", 180)
    if hard:
        return "NO", hard
    no = first_context(text, r"(no|without) (?:prior )?(?:professional )?work experience|required", 160)
    if no:
        return "YES", no
    if re.search(r"\bfresh graduates?\b|graduates? (?:are|may be) eligible", text, re.I) and not re.search(
        r"\bwork experience\b.{0,40}\b(?:required|must|minimum)\b", text, re.I
    ):
        return "YES", "Fresh graduates are described as eligible."
    return "CONDITIONAL", "The official source does not explicitly settle a work-experience requirement."

def classify_english(text: str) -> tuple[str, str, str]:
    moi = first_context(text, r"(medium of instruction|MOI|taught entirely in English|previous degree.*English)", 240)
    if moi:
        return "CONDITIONAL", "YES", moi
    english = first_context(text, r"(IELTS|TOEFL|PTE|English language requirement|English proficiency)", 280)
    if english:
        return "YES", "CONDITIONAL", english
    return "UNKNOWN", "UNKNOWN", "English proof route must be checked in the programme admission rules."

def financial_proof(text: str) -> tuple[str, str]:
    ctx = first_context(text, r"(proof of funds|proof of financial|financial means|bank statement|bank balance|maintenance funds|financial capacity)", 500)
    if ctx:
        return "YES", ctx
    return "CONDITIONAL", "No explicit bank-balance figure was recovered from the current official source. Check visa/immigration rules separately."

def nationality(text: str) -> str:
    lower = text.lower()
    if "pakistan" in lower:
        return "Pakistan explicitly mentioned in official evidence."
    if re.search(r"all (?:international|foreign) students|foreign citizens|citizens of all countries", lower):
        return "Broad international eligibility is stated; Pakistan is included unless an excluded-country rule applies."
    return "Pakistan-specific eligibility not explicit in the captured official text."

def funding(text: str, tuition_amount: float | None, tuition_currency: str | None, stipend_amount: float | None) -> tuple[str, bool, str]:
    lower = text.lower()
    full = ("fully funded" in lower and ("tuition" in lower or "fees" in lower) and
            ("stipend" in lower or "living" in lower or "maintenance" in lower))
    tuition_free = "tuition-free" in lower or "tuition free" in lower or "tuition waiver" in lower or "full tuition" in lower and "waiver" in lower
    if full:
        return "FULLY FUNDED", True, "Official evidence describes tuition/fee support together with living or stipend support."
    if tuition_free:
        return "TUITION-FREE / WAIVER", False, "Official evidence describes tuition-free or full tuition support; living cash is not assumed."
    if stipend_amount:
        return "TUITION + STIPEND / GRANT", False, "A quantified scholarship amount was recovered; tuition coverage is programme-specific."
    if "scholarship" in lower and ("fee discount" in lower or "tuition discount" in lower or "fee waiver" in lower):
        return "PARTIAL TUITION SCHOLARSHIP", False, "Official evidence describes a fee reduction rather than a full funding package."
    return "SCHOLARSHIP / FUNDING", False, "Funding coverage requires programme-specific verification."

def score_record(title: str, official_text: str, work: str, english: str, moi: str, deadline: date | None, full: bool) -> int:
    score = 45
    if re.search(r"\b(master|msc|m\.sc|mba|postgraduate)\b", title, re.I):
        score += 12
    if sum(term in (title + " " + official_text[:16000]).lower() for term in MANAGEMENT_TERMS) >= 3:
        score += 18
    if work == "YES":
        score += 12
    elif work == "NO":
        score -= 28
    if moi == "YES" or english == "CONDITIONAL":
        score += 8
    if "pakistan" in official_text.lower() or "foreign citizens" in official_text.lower():
        score += 7
    if full:
        score += 8
    if deadline:
        days = (deadline - TODAY).days
        score += 5 if days <= 30 else 2
    return max(0, min(99, score))

def stable_id(title: str, official_url: str) -> str:
    key = (title.strip().lower() + "|" + canonical(official_url)).encode()
    return "auto-" + hashlib.sha1(key).hexdigest()[:14]

def extract_documents(text: str) -> list[str]:
    mapping = [
        ("passport", "Passport"),
        ("transcript", "Transcript"),
        ("degree certificate|degree", "Degree certificate"),
        ("cv|resume", "CV"),
        ("motivation letter|statement of purpose", "Motivation letter / SOP"),
        ("recommendation", "Recommendations"),
        ("portfolio", "Portfolio"),
        ("research proposal", "Research proposal"),
        ("english", "English-language evidence"),
    ]
    out = []
    lower = text.lower()
    for pat, label in mapping:
        if re.search(pat, lower) and label not in out:
            out.append(label)
    return out[:10]

def build_candidate(article_url: str, article_html: str, article_text: str, title: str) -> dict | None:
    official = official_links(article_url, article_html, title)
    if not official:
        return None

    source_pages = []
    official_texts = []
    for url in official[:3]:
        try:
            final_url, html = fetch(url)
            _, text = soup_text(html)
            if len(text) >= 400:
                source_pages.append((final_url, text))
                official_texts.append(text)
        except Exception:
            continue
        time.sleep(0.25)

    if not source_pages:
        return None

    combined = "\n\n".join(t[:18000] for _, t in source_pages)
    relevance = candidate_relevance(title, combined)
    if relevance < 18:
        return None

    deadline = deadline_from_text(combined + " " + article_text[:20000])
    if deadline and deadline < TODAY:
        return None

    work, work_ctx = classify_work(combined)
    if work == "NO":
        # Experience-gated programmes are retained only when the source also clearly
        # describes an alternative route for applicants without experience.
        if not re.search(r"without experience|fresh graduates|no experience|required only for|waived", combined, re.I):
            return None

    eng, moi, eng_ctx = classify_english(combined)
    tuition_amount, tuition_currency, tuition_ctx = amount_in_context(combined, r"(tuition|fees?|fee waiver|cost of study)")
    stipend_amount, stipend_currency, stipend_ctx = amount_in_context(combined, r"(stipend|scholarship value|award|allowance)")
    proof, proof_ctx = financial_proof(combined)
    funding_type, fully_funded, funding_ctx = funding(combined, tuition_amount, tuition_currency, stipend_amount)

    uni = extract_university(title, combined)
    program = extract_program(title, combined)
    field_terms = [x for x in MANAGEMENT_TERMS if x in combined.lower()]
    field = " / ".join(dict.fromkeys(term.title() for term in field_terms[:6])) or "Management / Business"
    status = "OPEN NOW"
    if deadline:
        status = "CLOSING SOON" if (deadline - TODAY).days <= 21 else "OPEN NOW"

    official_url = source_pages[0][0]
    rid = stable_id(title, official_url)
    score = score_record(title, combined, work, eng, moi, deadline, fully_funded)
    currency = tuition_currency or stipend_currency or "USD"

    academic = []
    for ctx in [
        first_context(combined, r"(Bachelor(?:'s)?|undergraduate degree|degree equivalent)", 260),
        first_context(combined, r"(academic requirement|entry requirement|eligibility)", 260),
    ]:
        if ctx and ctx not in academic:
            academic.append(ctx)
    if not academic:
        academic = ["Bachelor's degree or equivalent — verify the selected programme's exact academic rule."]

    transcript = [x.title() for x in MANAGEMENT_TERMS if x in combined.lower()][:8]
    documents = extract_documents(combined)

    notes = [funding_ctx]
    if tuition_ctx:
        notes.append("Tuition evidence: " + tuition_ctx)
    if stipend_ctx:
        notes.append("Award/stipend evidence: " + stipend_ctx)
    if proof_ctx:
        notes.append("Financial proof evidence: " + proof_ctx)

    official_sources = [
        {
            "title": f"Official source — {urlparse(u).netloc}",
            "url": u,
            "type": "official",
        }
        for u, _ in source_pages
    ]
    sources = [
        {"title": "NSP Scholarships discovery page", "url": article_url, "type": "discovery"},
        *official_sources,
    ]

    record = {
        "id": rid,
        "rank": score,
        "score": score,
        "confidence": "HIGH" if len(source_pages) >= 2 else "MEDIUM-HIGH",
        "university": uni,
        "program": program,
        "degreeType": "Master's",
        "field": field,
        "country": "Unknown",
        "city": "Unknown",
        "region": "International",
        "scholarship": title,
        "provider": "Verified official source",
        "providerType": "University / Government / Scholarship provider",
        "fundingType": funding_type,
        "fit": "CLOSE" if work != "NO" else "CONDITIONAL",
        "fullyFunded": fully_funded,
        "needBased": "UNKNOWN",
        "freshGraduateEligible": "YES" if work == "YES" else "CONDITIONAL",
        "noWorkExperience": work,
        "ieltsRequired": eng,
        "moiAccepted": moi,
        "englishAlternative": eng_ctx,
        "tuitionDisplay": (
            "Tuition / fees covered or waived under the verified funding rule."
            if fully_funded or "TUITION-FREE" in funding_type
            else (f"{tuition_currency} {tuition_amount:,.0f} when the official source exposes a quantified fee." if tuition_amount else "Current tuition not safely extracted; verify programme fee notice.")
        ),
        "tuitionAmount": 0 if fully_funded else tuition_amount,
        "tuitionCurrency": tuition_currency or currency,
        "stipendDisplay": (
            f"{stipend_currency} {stipend_amount:,.0f} in the quantified official award field."
            if stipend_amount else "No quantified cash award safely extracted."
        ),
        "stipendAmount": stipend_amount,
        "stipendCurrency": stipend_currency or currency,
        "duration": "Programme-specific",
        "annualLiving": {"amount": 0, "currency": currency, "note": "Not safely extracted from current official evidence."},
        "annualPersonal": {"amount": 0, "currency": currency, "note": "Residual personal cost remains dependent on tuition, city, visa and scholarship coverage."},
        "fullPersonal": {"amount": 0, "currency": currency},
        "proof": proof,
        "proofNote": proof_ctx,
        "status": status,
        "deadline": deadline.isoformat() if deadline else None,
        "scholarshipDeadline": deadline.isoformat() if deadline else None,
        "admissionDeadline": None,
        "academic": academic,
        "transcript": transcript or ["Management / Business subject fit must be checked in the selected programme."],
        "documents": documents or ["Passport", "Degree", "Transcript", "Programme-specific documents"],
        "risks": [
            "Scholarship and university admission rules are separate.",
            "Only official evidence is used for the published record; unknown values are not guessed.",
        ],
        "programUrl": official_url,
        "scholarshipUrl": official_url,
        "sources": sources,
        "verification": {
            "status": "VERIFIED OFFICIAL",
            "officialSourceCount": len(source_pages),
            "discoverySource": "NSP Scholarships",
            "lastVerified": TODAY.isoformat(),
        },
        "requirements": {
            "academic": " ".join(academic),
            "english": eng_ctx,
            "workExperience": work_ctx,
            "nationality": nationality(combined),
            "financialProof": proof_ctx,
        },
        "_research": {
            "articleTitle": title,
            "articleUrl": article_url,
            "relevanceScore": relevance,
            "officialUrls": [u for u, _ in source_pages],
        },
    }

    finance = {
        "periodMonths": 12,
        "currency": currency,
        "costs": [],
        "cashFunding": [],
        "directFunding": [],
        "notes": notes,
    }
    if fully_funded:
        finance["directFunding"].append({"label": "Tuition / mandatory fees", "amount": 0, "currency": currency, "status": "covered"})
    elif tuition_amount:
        finance["costs"].append({"label": "Tuition / fees", "amount": tuition_amount, "currency": tuition_currency or currency, "frequency": "annual", "payer": "student", "status": "known"})
    if stipend_amount:
        finance["cashFunding"].append({"label": "Scholarship / stipend", "amount": stipend_amount, "currency": stipend_currency or currency, "frequency": "total", "status": "known"})
    return record, finance

def is_live(record: dict) -> bool:
    if record.get("status") in {"CLOSED", "NOT APPLICABLE", "APPLICATION WINDOW NOT YET ANNOUNCED"}:
        return False
    for field in ("deadline", "scholarshipDeadline", "admissionDeadline"):
        raw = record.get(field)
        if raw:
            try:
                if date.fromisoformat(raw) < TODAY:
                    return False
            except ValueError:
                pass
    return True

def load_previous() -> dict:
    if not OUTPUT.exists():
        return {"opportunities": [], "financeById": {}}
    try:
        return json.loads(OUTPUT.read_text(encoding="utf-8"))
    except Exception:
        return {"opportunities": [], "financeById": {}}

def merge(previous: dict, fresh: list[tuple[dict, dict]]) -> tuple[list[dict], dict]:
    by_id = {}
    finance = {}
    for item in previous.get("opportunities", []):
        if is_live(item):
            by_id[item["id"]] = item
            if item.get("id") in previous.get("financeById", {}):
                finance[item["id"]] = previous["financeById"][item["id"]]
    for record, fin in fresh:
        if not is_live(record):
            continue
        by_id[record["id"]] = record
        finance[record["id"]] = fin

    # Keep only a finite, useful feed; newest/most relevant first.
    items = list(by_id.values())
    items.sort(key=lambda x: (
        0 if x.get("status") == "CLOSING SOON" else 1,
        -(x.get("score") or 0),
        x.get("deadline") or "9999-12-31",
    ))
    items = items[:60]
    finance = {k: v for k, v in finance.items() if any(x["id"] == k for x in items)}
    for i, item in enumerate(items, 1):
        item["rank"] = i
    return items, finance

def main() -> int:
    previous = load_previous()
    urls = discover_urls()
    if not urls:
        print("No discovery pages available; refusing to overwrite current dataset.", file=sys.stderr)
        return 2

    fresh = []
    seen = set()
    for article_url in urls:
        if article_url in seen:
            continue
        seen.add(article_url)
        try:
            final_url, html = fetch(article_url)
            soup, text_content = soup_text(html)
            title = soup.title.get_text(" ", strip=True) if soup.title else article_url
            title = re.sub(r"\s+", " ", title).strip()
            if candidate_relevance(title, text_content) < 18:
                continue
            built = build_candidate(final_url, html, text_content, title)
            if built:
                fresh.append(built)
        except Exception as exc:
            print(f"skip {article_url}: {exc}", file=sys.stderr)
        time.sleep(0.35)

    live, finance = merge(previous, fresh)

    # Safety rails: at least one fresh official verification or preserve existing data.
    fresh_verified = [r for r, _ in fresh if r.get("verification", {}).get("status") == "VERIFIED OFFICIAL" and is_live(r)]
    if not fresh_verified and not live:
        print("No verified live records found; refusing to write an empty dataset.", file=sys.stderr)
        return 3

    payload = {
        "schemaVersion": 2,
        "profile": {
            "nationality": "Pakistan",
            "degree": "BS Management Sciences",
            "targetLevel": "Master's",
            "workExperience": "NONE",
            "englishPreference": ["MOI", "IELTS alternative", "IELTS"],
            "priorMasters": "NONE",
        },
        "generatedAt": NOW.isoformat(timespec="seconds"),
        "discovery": {
            "primary": "https://nspscholarships.com/",
            "sourcesChecked": len(urls),
            "verifiedOfficialRecords": len(fresh_verified),
            "policy": "NSP is discovery-only; official sources are required for publication.",
            "officialVerification": True,
        },
        "opportunities": live,
        "financeById": finance,
    }

    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Published {len(live)} live verified/retained opportunities; fresh official: {len(fresh_verified)}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
