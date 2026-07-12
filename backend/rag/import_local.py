"""
Import a local PDF or TXT file into the RAG knowledge base.
Useful for documents manually downloaded from Google.

Usage:
    python -m rag.import_local --file "C:/Downloads/rapport_fofifa.pdf" \
                               --id "fofifa_rapport_rendement_2022" \
                               --title "FOFIFA — Rapport rendement riz 2022" \
                               --language fr \
                               --topics yield_prediction varieties

    python -m rag.import_local --file "C:/Downloads/irri_blast.pdf" \
                               --id "irri_pyriculariose_en" \
                               --title "IRRI — Rice Blast Disease Management" \
                               --language en \
                               --topics pest_disease
"""
import json
import logging
import argparse
from pathlib import Path

logger = logging.getLogger(__name__)

KNOWLEDGE_BASE_DIR = Path(__file__).parent / 'data' / 'knowledge_base'
VALID_TOPICS = [
    'yield_prediction', 'varieties', 'soil_health',
    'water_management', 'pest_disease', 'climate', 'market',
]


def extract_text_from_pdf(file_path: Path) -> str:
    """Extract text from a local PDF using pdfplumber."""
    try:
        import pdfplumber
        text_pages = []
        with pdfplumber.open(file_path) as pdf:
            print(f"  PDF detected: {len(pdf.pages)} pages")
            for i, page in enumerate(pdf.pages[:50]):  # max 50 pages
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    text_pages.append(f"[Page {i+1}]\n{page_text.strip()}")
        return '\n\n'.join(text_pages)
    except ImportError:
        print("ERROR: pdfplumber not installed. Run: pip install pdfplumber")
        return ''


def extract_text_from_txt(file_path: Path) -> str:
    """Read a plain text file."""
    return file_path.read_text(encoding='utf-8', errors='replace')


def import_file(file_path: str, doc_id: str, title: str,
                language: str, topics: list, source_url: str = '') -> bool:
    """
    Import a local file into the knowledge base.
    Returns True on success.
    """
    path = Path(file_path)

    if not path.exists():
        print(f"ERROR: file not found → {file_path}")
        return False

    # Extract text based on file type
    ext = path.suffix.lower()
    print(f"Processing: {path.name} ({ext})")

    if ext == '.pdf':
        content = extract_text_from_pdf(path)
    elif ext in ('.txt', '.md'):
        content = extract_text_from_txt(path)
    else:
        print(f"ERROR: unsupported format ({ext}). Use .pdf or .txt")
        return False

    if not content or len(content) < 50:
        print("ERROR: extracted content too short or empty")
        return False

    # Limit to 60,000 characters
    if len(content) > 60000:
        print(f"  Truncated: {len(content)} → 60,000 characters")
        content = content[:60000]

    # Create the JSON document
    doc = {
        'id': doc_id,
        'title': title,
        'url': source_url,
        'source': 'knowledge_base_local',
        'language': language,
        'topics': topics,
        'char_count': len(content),
        'content': content,
    }

    # Save to knowledge_base/
    KNOWLEDGE_BASE_DIR.mkdir(parents=True, exist_ok=True)
    output_path = KNOWLEDGE_BASE_DIR / f"{doc_id}.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Imported successfully!")
    print(f"  File     : {output_path}")
    print(f"  Content  : {len(content)} characters")
    print(f"  Preview  : {content[:200]}...")
    print(f"\nNext step: python -m rag.embeddings --build")
    return True


if __name__ == '__main__':
    logging.basicConfig(level=logging.WARNING)

    parser = argparse.ArgumentParser(
        description='CropGPT — Import a local document into RAG'
    )
    parser.add_argument('--file',     required=True,  help='Path to the PDF or TXT file')
    parser.add_argument('--id',       required=True,  help='Unique identifier (e.g. fofifa_riz_2022)')
    parser.add_argument('--title',    required=True,  help='Human-readable document title')
    parser.add_argument('--language', required=True,  choices=['fr', 'en', 'mg'])
    parser.add_argument('--topics',   required=True,  nargs='+', choices=VALID_TOPICS,
                        help=f'One or more topics from: {VALID_TOPICS}')
    parser.add_argument('--url',      default='',     help='Original source URL (optional)')

    args = parser.parse_args()
    import_file(args.file, args.id, args.title, args.language, args.topics, args.url)
