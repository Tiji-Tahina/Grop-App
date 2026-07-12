import os
import json
import logging
from pathlib import Path

# Log configuration
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Absolute paths
OBSIDIAN_VAULT = "/home/zafinii/Documents/raginy/Gropidian"
PROJECT_KB = Path(__file__).parent / "data" / "knowledge_base"

def clean_text(text):
    """Basic Markdown text cleanup for RAG."""
    # Filters for removing specific Obsidian tags can be added here if needed
    return text.strip()

def sync():
    """
    Traverse the Obsidian vault and convert .md files to .json
    in the project's knowledge directory.
    """
    logger.info(f"🚀 Starting synchronization from: {OBSIDIAN_VAULT}")

    if not os.path.exists(OBSIDIAN_VAULT):
        logger.error(f"Obsidian folder not found: {OBSIDIAN_VAULT}")
        return

    # Ensure the destination folder exists
    PROJECT_KB.mkdir(parents=True, exist_ok=True)

    count = 0
    for root, dirs, files in os.walk(OBSIDIAN_VAULT):
        # Skip hidden Obsidian folders and templates
        if any(part.startswith('.') for part in Path(root).parts) or "Template" in root:
            continue

        for file in files:
            if file.endswith(".md"):
                file_path = Path(root) / file

                # Create a unique identifier (relative path without extension)
                rel_path = file_path.relative_to(OBSIDIAN_VAULT)
                doc_id = f"obsidian_{str(rel_path.with_suffix('')).lower().replace(' ', '_').replace('/', '_')}"

                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    if len(content.strip()) < 10:
                        continue

                    # Map folders to CropGPT topics
                    folder_name = file_path.parent.name.lower()
                    topics = []
                    if "varieties" in folder_name: topics.append("varieties")
                    if "crops" in folder_name: topics.append("varieties")
                    if "health" in folder_name or "disease" in folder_name: topics.append("pest_disease")
                    if "practices" in folder_name: topics.append("soil_health")
                    if "environment" in folder_name: topics.append("climate")
                    if "statistics" in folder_name: topics.append("yield_prediction")

                    # JSON document structure for CropGPT
                    data = {
                        "id": doc_id,
                        "title": file_path.stem,
                        "source": "obsidian_gropidian",
                        "folder": file_path.parent.name,
                        "language": "fr",
                        "topics": topics if topics else ["general"],
                        "content": clean_text(content)
                    }

                    # Save to the project
                    output_path = PROJECT_KB / f"{doc_id}.json"
                    with open(output_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)

                    count += 1
                    logger.debug(f"Synced: {file_path.name}")

                except Exception as e:
                    logger.error(f"Error processing {file}: {e}")

    logger.info(f"✅ Done! {count} Obsidian notes have been synchronized.")
    logger.info(f"👉 Next step: python3 -m rag.embeddings --build")

if __name__ == "__main__":
    sync()
