"""
Scraping module for populating the RAG vector store.

Supports: HTML (websites) + PDF

CLI usage:
    python -m rag.scraper --all              ← scrape all sources
    python -m rag.scraper --id wikipedia_riziculture_madagascar  ← single source
    python -m rag.scraper --test             ← scrape just 2 sources for testing

Scraped documents are saved to rag/data/documents/
before being indexed by embeddings.py
"""
import json
import logging
import time
from pathlib import Path

logger = logging.getLogger(__name__)

SOURCES_FILE = Path(__file__).parent / 'data' / 'sources.json'
DOCUMENTS_DIR = Path(__file__).parent / 'data' / 'documents'


def load_sources() -> list:
    with open(SOURCES_FILE, encoding='utf-8') as f:
        return json.load(f)


# ─── HTML Extraction ──────────────────────────────────────────────────────────

def extract_html(url: str) -> str:
    """Download a webpage and extract visible text."""
    import httpx
    from bs4 import BeautifulSoup

    headers = {
        'User-Agent': 'CropGPT-Research-Bot/1.0 (agricultural research; contact@cropgpt.mg)',
    }
    response = httpx.get(url, headers=headers, timeout=30, follow_redirects=True)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, 'html.parser')

    # Remove useless tags (menus, ads, footer...)
    for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside',
                     'form', 'button', 'iframe', 'noscript']):
        tag.decompose()

    text = soup.get_text(separator=' ', strip=True)

    # Clean up multiple spaces
    import re
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text[:50000]  # Limit: 50,000 characters per source


# ─── PDF Extraction ───────────────────────────────────────────────────────────

def extract_pdf(url: str) -> str:
    """
    Download a PDF and extract its text.
    Uses pdfplumber (more accurate than PyPDF2 for tables).

    Installation: pip install pdfplumber
    """
    try:
        import pdfplumber
        import httpx
        import io

        logger.info("Downloading PDF: %s", url)
        response = httpx.get(url, timeout=60, follow_redirects=True)
        response.raise_for_status()

        # Read the PDF from memory (without saving the file)
        pdf_bytes = io.BytesIO(response.content)

        text_pages = []
        with pdfplumber.open(pdf_bytes) as pdf:
            logger.info("PDF: %d pages detected", len(pdf.pages))
            # Limit to 30 pages to avoid running out of memory
            for i, page in enumerate(pdf.pages[:30]):
                page_text = page.extract_text()
                if page_text:
                    text_pages.append(f"[Page {i+1}]\n{page_text}")

        full_text = '\n\n'.join(text_pages)
        logger.info("PDF extracted: %d characters", len(full_text))
        return full_text[:50000]

    except ImportError:
        logger.error("pdfplumber not installed. Run: pip install pdfplumber")
        return ''
    except Exception as e:
        logger.error("PDF extraction error %s: %s", url, e)
        return ''


# ─── Main Scraper ────────────────────────────────────────────────────────────

def scrape_one(source: dict) -> dict | None:
    """
    Scrape a single source (HTML or PDF depending on its type).
    Returns the document or None on failure.
    """
    url = source['url']
    source_type = source.get('type', 'html')

    logger.info("Scraping [%s]: %s", source_type.upper(), source['title'])

    try:
        # PDF if type is 'pdf' OR if URL ends with .pdf
        if source_type == 'pdf' or url.lower().endswith('.pdf'):
            content = extract_pdf(url)
        else:
            content = extract_html(url)
    except Exception as e:
        logger.error("Error on %s: %s", url, e)
        content = ''

    if not content or len(content) < 100:
        logger.warning("Content too short or empty for: %s", source['title'])
        return None

    doc = {
        'id': source['id'],
        'title': source['title'],
        'url': url,
        'content': content,
        'topics': source['topics'],
        'language': source['language'],
        'type': source_type,
        'char_count': len(content),
    }

    # Save to rag/data/documents/
    DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
    doc_path = DOCUMENTS_DIR / f"{source['id']}.json"
    with open(doc_path, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    logger.info("Saved: %s (%d characters)", source['id'], len(content))
    return doc


def scrape_all(delay_seconds: float = 2.0) -> list:
    """Scrape all sources from the sources.json file."""
    sources = load_sources()
    documents = []

    for source in sources:
        doc = scrape_one(source)
        if doc:
            documents.append(doc)
        time.sleep(delay_seconds)  # Be polite to servers

    logger.info("Total: %d/%d sources scraped successfully", len(documents), len(sources))
    return documents


def scrape_by_id(source_id: str) -> dict | None:
    """Scrape a single source by its id."""
    sources = load_sources()
    for source in sources:
        if source['id'] == source_id:
            return scrape_one(source)
    logger.error("Source not found: %s", source_id)
    return None


def scrape_test(n: int = 2) -> list:
    """
    Scrape only the first N sources — for quick testing
    without waiting for the full scrape.
    """
    sources = load_sources()[:n]
    documents = []
    for source in sources:
        doc = scrape_one(source)
        if doc:
            documents.append(doc)
        time.sleep(1)
    return documents


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import argparse
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
    )

    parser = argparse.ArgumentParser(description='CropGPT RAG Scraper')
    parser.add_argument('--all', action='store_true', help='Scrape all sources')
    parser.add_argument('--id', type=str, help='Scrape a specific source by its id')
    parser.add_argument('--test', action='store_true', help='Scrape 2 sources for testing')
    args = parser.parse_args()

    if args.all:
        docs = scrape_all()
        print(f"\n✓ {len(docs)} documents scraped and saved to rag/data/documents/")

    elif args.id:
        doc = scrape_by_id(args.id)
        if doc:
            print(f"\n✓ Document saved: {doc['id']} ({doc['char_count']} characters)")
            print(f"  Preview: {doc['content'][:200]}...")
        else:
            print(f"\n✗ Scraping failed for: {args.id}")

    elif args.test:
        docs = scrape_test(n=2)
        print(f"\n✓ Test: {len(docs)} documents scraped")
        for doc in docs:
            print(f"  - {doc['id']}: {doc['char_count']} characters")
            print(f"    Preview: {doc['content'][:150]}...\n")

    else:
        parser.print_help()
