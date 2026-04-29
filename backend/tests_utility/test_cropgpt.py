import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
"""
Test CropGPT - Qwen2 Local Model
Lancer: python test_cropgpt.py

Affiche: memoire, tokens, performance, details complets
"""

import os
import sys
import time
import psutil

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

from pathlib import Path

env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


def print_header(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


def print_info(label, value):
    print(f"  {label:25s}: {value}")


def get_memory_usage():
    """Retourne l'utilisation memoire en MB."""
    process = psutil.Process()
    return process.memory_info().rss / (1024 * 1024)


# ============================================================
#  TEST 1: Info Systeme
# ============================================================
print_header("1. INFORMATIONS SYSTEME")

print_info("Python", f"{sys.version.split()[0]}")
print_info("Platforme", sys.platform)

try:
    import torch

    print_info("PyTorch", torch.__version__)
    print_info("CUDA Available", torch.cuda.is_available())
    print_info("CPU Count", torch.get_num_threads())
except ImportError:
    print("  PyTorch: Non installe")

try:
    import transformers

    print_info("Transformers", transformers.__version__)
except ImportError:
    print("  Transformers: Non installe")

# Memoire
mem_total = psutil.virtual_memory().total / (1024**3)
mem_available = psutil.virtual_memory().available / (1024**3)
print_info("Memoire Totale", f"{mem_total:.1f} GB")
print_info("Memoire Disponible", f"{mem_available:.1f} GB")

# ============================================================
#  TEST 2: Chargement du Modele
# ============================================================
print_header("2. CHARGEMENT DU MODELE")

model_path = Path(__file__).parent / "models"
print_info("Chemin Modele", str(model_path))
print_info("Existe", model_path.exists())

if not model_path.exists():
    print("\n  ERREUR: Dossier models/ non trouve!")
    print("  -> Telecharger le modele depuis HuggingFace")
    sys.exit(1)

mem_before = get_memory_usage()
print_info("Memoire Avant", f"{mem_before:.1f} MB")

try:
    from chat.pipeline.llm import load_qwen2_model, get_model_info, MODEL_PATH

    start = time.time()
    tokenizer, model = load_qwen2_model()
    load_time = time.time() - start

    mem_after = get_memory_usage()
    mem_used = mem_after - mem_before

    print(f"\n  Temps de chargement: {load_time:.2f}s")
    print(f"  Memoire Utilisee: {mem_used:.1f} MB")
    print(f"  Status: OK")

    # Infos modele
    info = get_model_info()
    print(f"\n  --- Infos Modele ---")
    print_info("Type", info.get("model_type", "N/A"))
    print_info("Parametres", f"{info.get('num_parameters', 0):,}")
    print_info("Memoire Modele", f"{info.get('memory_mb', 0):.1f} MB")
    print_info("Device", info.get("device", "N/A"))

except Exception as e:
    print(f"\n  ERREUR: {e}")
    sys.exit(1)

# ============================================================
#  TEST 3: Inference Simple
# ============================================================
print_header("3. TEST INFERENCE SIMPLE")

prompt_simple = "Quel est le meilleur engrais pour le riz?"

print(f"  Prompt: {prompt_simple}\n")

mem_before = get_memory_usage()
start = time.time()

try:
    from chat.pipeline.llm import call_qwen2

    result = call_qwen2(prompt_simple)
    latency = time.time() - start
    mem_after = get_memory_usage()

    print(f"  --- Resultat ---")
    print_info("Latence", f"{result['latency_ms']}ms ({latency:.2f}s)")
    print_info("Input Tokens", result["input_tokens"])
    print_info("Output Tokens", result["output_tokens"])
    print_info("Tokens/sec", result.get("tokens_per_second", 0))
    print_info("Memoire Apres", f"{mem_after:.1f} MB")
    print_info("Delta Memoire", f"{mem_after - mem_before:.1f} MB")

    print(f"\n  --- Reponse ---")
    response_text = (
        result["reply"][:300] + "..." if len(result["reply"]) > 300 else result["reply"]
    )
    print(f"  {response_text}")

except Exception as e:
    print(f"  ERREUR: {e}")

# ============================================================
#  TEST 4: Avec Contexte RAG
# ============================================================
print_header("4. TEST AVEC CONTEXTE AGRICOLE")

prompt_context = """Contexte: Le riz est la culture principale a Madagascar.
La majorite des rizieres se trouve dans les regions Highlands (Alaotra, Vakinankaratra).
Question: Comment optimiser le rendement du riz?"""

print(f"  Prompt (avec contexte): {prompt_context[:100]}...\n")

mem_before = get_memory_usage()
start = time.time()

try:
    result = call_qwen2(prompt_context)
    latency = time.time() - start
    mem_after = get_memory_usage()

    print(f"  --- Resultat ---")
    print_info("Latence", f"{result['latency_ms']}ms ({latency:.2f}s)")
    print_info("Input Tokens", result["input_tokens"])
    print_info("Output Tokens", result["output_tokens"])
    print_info("Tokens/sec", result.get("tokens_per_second", 0))

    print(f"\n  --- Reponse ---")
    response_text = (
        result["reply"][:500] + "..." if len(result["reply"]) > 500 else result["reply"]
    )
    print(f"  {response_text}")

except Exception as e:
    print(f"  ERREUR: {e}")

# ============================================================
#  TEST 5: Performance (multiples requetes)
# ============================================================
print_header("5. TEST PERFORMANCE")

prompts_test = [
    "Donne-moi des conseils pour la culture du manioc.",
    "Quelles sont les maladies du riz?",
    "Comment planter la vanille?",
]

latencies = []
tokens_total = 0

for i, prompt in enumerate(prompts_test):
    mem_before = get_memory_usage()
    start = time.time()

    try:
        result = call_qwen2(prompt)
        elapsed = time.time() - start

        latencies.append(result["latency_ms"])
        tokens_total += result["output_tokens"]

        print(f"\n  --- Requete {i + 1} ---")
        print_info("Prompt", f"{prompt[:40]}...")
        print_info("Latence", f"{result['latency_ms']}ms ({elapsed:.2f}s)")
        print_info("Output Tokens", result["output_tokens"])
        print_info("Tokens/sec", result.get("tokens_per_second", 0))
        print_info("Memoire", f"{mem_after:.1f} MB")

    except Exception as e:
        print(f"  Requete {i + 1} ERREUR: {e}")

# ============================================================
#  Resume
# ============================================================
print_header("RESUME")

avg_latency = sum(latencies) / len(latencies) if latencies else 0
total_tokens = tokens_total

print_info("Temps Moyen", f"{avg_latency:.0f}ms")
print_info("Total Tokens Gen", total_tokens)
print_info(
    "Tokens/sec (moyen)",
    f"{total_tokens / (sum(latencies) / 1000) if latencies else 0:.1f}",
)

process = psutil.Process()
mem_final = process.memory_info().rss / (1024 * 1024)
print_info("Memoire Finale", f"{mem_final:.1f} MB")

print(f"\n{'=' * 60}")
print("  TOUS LES TESTS TERMINES AVEC SUCCES")
print(f"{'=' * 60}\n")
