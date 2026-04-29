import os
import json
import logging
from pathlib import Path

# Configuration des logs
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Chemins absolus
OBSIDIAN_VAULT = "/home/zafinii/Documents/raginy/Gropidian"
PROJECT_KB = Path(__file__).parent / "data" / "knowledge_base"

def clean_text(text):
    """Nettoyage basique du texte Markdown pour le RAG."""
    # On peut ajouter ici des filtres pour enlever les tags Obsidian spécifiques si besoin
    return text.strip()

def sync():
    """
    Parcourt le vault Obsidian et convertit les fichiers .md en .json 
    dans le dossier de connaissances du projet.
    """
    logger.info(f"🚀 Début de la synchronisation depuis : {OBSIDIAN_VAULT}")
    
    if not os.path.exists(OBSIDIAN_VAULT):
        logger.error(f"Le dossier Obsidian est introuvable : {OBSIDIAN_VAULT}")
        return

    # S'assurer que le dossier de destination existe
    PROJECT_KB.mkdir(parents=True, exist_ok=True)

    count = 0
    for root, dirs, files in os.walk(OBSIDIAN_VAULT):
        # Ignorer les dossiers cachés d'Obsidian et les templates
        if any(part.startswith('.') for part in Path(root).parts) or "Template" in root:
            continue
            
        for file in files:
            if file.endswith(".md"):
                file_path = Path(root) / file
                
                # Création d'un identifiant unique (chemin relatif sans extension)
                rel_path = file_path.relative_to(OBSIDIAN_VAULT)
                doc_id = f"obsidian_{str(rel_path.with_suffix('')).lower().replace(' ', '_').replace('/', '_')}"
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if len(content.strip()) < 10:
                        continue

                    # Mapping des dossiers vers des topics CropGPT
                    folder_name = file_path.parent.name.lower()
                    topics = []
                    if "varieties" in folder_name: topics.append("varieties")
                    if "crops" in folder_name: topics.append("varieties")
                    if "health" in folder_name or "disease" in folder_name: topics.append("pest_disease")
                    if "practices" in folder_name: topics.append("soil_health")
                    if "environment" in folder_name: topics.append("climate")
                    if "statistics" in folder_name: topics.append("yield_prediction")

                    # Structure du document JSON pour CropGPT
                    data = {
                        "id": doc_id,
                        "title": file_path.stem,
                        "source": "obsidian_gropidian",
                        "folder": file_path.parent.name,
                        "language": "fr",
                        "topics": topics if topics else ["general"],
                        "content": clean_text(content)
                    }
                    
                    # Sauvegarde dans le projet
                    output_path = PROJECT_KB / f"{doc_id}.json"
                    with open(output_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    
                    count += 1
                    logger.debug(f"Synchronisé : {file_path.name}")
                
                except Exception as e:
                    logger.error(f"Erreur lors du traitement de {file}: {e}")

    logger.info(f"✅ Terminé ! {count} notes Obsidian ont été synchronisées.")
    logger.info(f"👉 Prochaine étape : python3 -m rag.embeddings --build")

if __name__ == "__main__":
    sync()
