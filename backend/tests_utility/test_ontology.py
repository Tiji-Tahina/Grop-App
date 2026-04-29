import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
"""
Test du chargeur d'ontologie CropGPT.
Lancer depuis backend/ :
    python test_ontology.py
"""
import sys
sys.path.insert(0, '.')

# ── Forcer UTF-8 sur Windows ───────────────────────────────────────────────────
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from rag.ontology_graph import (
    get_graph,
    get_domain_keywords,
    get_class_tag,
    get_related_concepts,
    get_pedigree,
    get_facts_block,
)

PASS = "✓"
FAIL = "✗"

def test(name, condition, detail=""):
    icon = PASS if condition else FAIL
    status = "OK" if condition else "ECHEC"
    print(f"  {icon} [{status}] {name}")
    if detail:
        print(f"         {detail}")
    return condition

results = []

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 1. CHARGEMENT DU GRAPHE ===")
g = get_graph()
r = test("Graphe chargé", g is not None)
results.append(r)
if g:
    r = test("Triplets > 1000", len(g) > 1000, f"{len(g)} triplets")
    results.append(r)

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 2. KEYWORDS DOMAINE ===")
kw = get_domain_keywords()
r = test("Keywords FR présents", len(kw.get("fr", [])) > 50,
         f"{len(kw['fr'])} labels FR")
results.append(r)
r = test("Keywords MG présents", len(kw.get("mg", [])) > 20,
         f"{len(kw['mg'])} labels MG")
results.append(r)
r = test("Keywords EN présents", len(kw.get("en", [])) > 50,
         f"{len(kw['en'])} labels EN")
results.append(r)

# Quelques mots-clés attendus
expected_fr = ["riz", "irrigation", "sol", "variété", "hybride"]
for w in expected_fr:
    found = any(w in label for label in kw["fr"])
    r = test(f"  FR contient '{w}'", found)
    results.append(r)

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 3. MAPPAGE CLASSE → TAG RAG ===")
cases = [
    ("Bemasoha Rice Hybrid",       "varieties"),
    ("Fiaramanitra Rice Hybrid",   "varieties"),
    ("Makalioka Rice Variety",     "varieties"),
]
for label, expected_tag in cases:
    tag = get_class_tag(label)
    r = test(f"'{label}' → tag={expected_tag}", tag == expected_tag,
             f"obtenu: {tag}")
    results.append(r)

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 4. PEDIGREE ===")

# Variété sans parents
p = get_pedigree("Makalioka Rice Variety")
r = test("Makalioka trouvé dans graphe", p["found"])
results.append(r)
r = test("Makalioka code pedigree présent", bool(p["pedigree_code"]),
         f"code: {p['pedigree_code']}")
results.append(r)

# Hybride F1
p = get_pedigree("Bemasoha Rice Hybrid")
r = test("Bemasoha est un hybride", p["is_hybrid"])
results.append(r)
r = test("Bemasoha a 2 parents", len(p["parents"]) == 2,
         f"parents: {p['parents']}")
results.append(r)
r = test("Bemasoha génération F1", p["generation"] == 1,
         f"génération: {p['generation']}")
results.append(r)
r = test("Bemasoha développé par FOFIFA", p["bred_by"] == "FOFIFA",
         f"bred_by: {p['bred_by']}")
results.append(r)

# Hybride F2
p = get_pedigree("Fiaramanitra Rice Hybrid")
r = test("Fiaramanitra génération F2", p["generation"] == 2,
         f"parents: {p['parents']}")
results.append(r)

# Variété inexistante
p = get_pedigree("VariétéInexistante")
r = test("Entité inconnue → found=False", not p["found"])
results.append(r)

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 5. CONCEPTS LIÉS (expansion FAISS) ===")
related = get_related_concepts("Makalioka Rice Variety")
r = test("Makalioka a des concepts liés", len(related) > 0,
         f"{len(related)} concepts: {related[:3]}")
results.append(r)

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 6. BLOC FAITS LLM ===")
facts = get_facts_block("Bemasoha Rice Hybrid")
r = test("Bloc non vide", len(facts) > 50)
results.append(r)
r = test("Bloc contient 'Parents'", "Parents" in facts)
results.append(r)
r = test("Bloc contient 'FOFIFA'", "FOFIFA" in facts)
results.append(r)
r = test("Bloc contient 'pedigree'", "pedigree" in facts.lower() or "Pedigree" in facts)
results.append(r)
print(f"\n  Aperçu du bloc :\n{'─'*50}")
for line in facts.split("\n"):
    print(f"  {line}")
print(f"{'─'*50}")

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== RÉSULTAT FINAL ===")
passed = sum(results)
total  = len(results)
print(f"  {passed}/{total} tests réussis")
if passed == total:
    print("  Ontologie opérationnelle — prête à brancher dans le pipeline RAG.")
else:
    print(f"  {total - passed} test(s) échoué(s) — voir détails ci-dessus.")
print()
