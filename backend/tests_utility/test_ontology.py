import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
"""
Test the CropGPT ontology loader.
Run from backend/:
    python test_ontology.py
"""
import sys
sys.path.insert(0, '.')

# ── Force UTF-8 on Windows ──────────────────────────────────────────────────
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
    status = "OK" if condition else "FAILED"
    print(f"  {icon} [{status}] {name}")
    if detail:
        print(f"         {detail}")
    return condition

results = []

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 1. GRAPH LOADING ===")
g = get_graph()
r = test("Graph loaded", g is not None)
results.append(r)
if g:
    r = test("Triples > 1000", len(g) > 1000, f"{len(g)} triples")
    results.append(r)

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 2. DOMAIN KEYWORDS ===")
kw = get_domain_keywords()
r = test("FR keywords present", len(kw.get("fr", [])) > 50,
         f"{len(kw['fr'])} FR labels")
results.append(r)
r = test("MG keywords present", len(kw.get("mg", [])) > 20,
         f"{len(kw['mg'])} MG labels")
results.append(r)
r = test("EN keywords present", len(kw.get("en", [])) > 50,
         f"{len(kw['en'])} EN labels")
results.append(r)

# Some expected keywords
expected_fr = ["riz", "irrigation", "sol", "variété", "hybride"]
for w in expected_fr:
    found = any(w in label for label in kw["fr"])
    r = test(f"  FR contains '{w}'", found)
    results.append(r)

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 3. CLASS → RAG TAG MAPPING ===")
cases = [
    ("Bemasoha Rice Hybrid",       "varieties"),
    ("Fiaramanitra Rice Hybrid",   "varieties"),
    ("Makalioka Rice Variety",     "varieties"),
]
for label, expected_tag in cases:
    tag = get_class_tag(label)
    r = test(f"'{label}' → tag={expected_tag}", tag == expected_tag,
             f"got: {tag}")
    results.append(r)

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 4. PEDIGREE ===")

# Variety without parents
p = get_pedigree("Makalioka Rice Variety")
r = test("Makalioka found in graph", p["found"])
results.append(r)
r = test("Makalioka pedigree code present", bool(p["pedigree_code"]),
         f"code: {p['pedigree_code']}")
results.append(r)

# F1 hybrid
p = get_pedigree("Bemasoha Rice Hybrid")
r = test("Bemasoha is a hybrid", p["is_hybrid"])
results.append(r)
r = test("Bemasoha has 2 parents", len(p["parents"]) == 2,
         f"parents: {p['parents']}")
results.append(r)
r = test("Bemasoha generation F1", p["generation"] == 1,
         f"generation: {p['generation']}")
results.append(r)
r = test("Bemasoha bred by FOFIFA", p["bred_by"] == "FOFIFA",
         f"bred_by: {p['bred_by']}")
results.append(r)

# F2 hybrid
p = get_pedigree("Fiaramanitra Rice Hybrid")
r = test("Fiaramanitra generation F2", p["generation"] == 2,
         f"parents: {p['parents']}")
results.append(r)

# Non-existent variety
p = get_pedigree("VariétéInexistante")
r = test("Unknown entity → found=False", not p["found"])
results.append(r)

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 5. RELATED CONCEPTS (FAISS expansion) ===")
related = get_related_concepts("Makalioka Rice Variety")
r = test("Makalioka has related concepts", len(related) > 0,
         f"{len(related)} concepts: {related[:3]}")
results.append(r)

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== 6. LLM FACTS BLOCK ===")
facts = get_facts_block("Bemasoha Rice Hybrid")
r = test("Block not empty", len(facts) > 50)
results.append(r)
r = test("Block contains 'Parents'", "Parents" in facts)
results.append(r)
r = test("Block contains 'FOFIFA'", "FOFIFA" in facts)
results.append(r)
r = test("Block contains 'pedigree'", "pedigree" in facts.lower() or "Pedigree" in facts)
results.append(r)
print(f"\n  Block preview:\n{'─'*50}")
for line in facts.split("\n"):
    print(f"  {line}")
print(f"{'─'*50}")

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== FINAL RESULT ===")
passed = sum(results)
total  = len(results)
print(f"  {passed}/{total} tests passed")
if passed == total:
    print("  Ontology operational — ready to plug into the RAG pipeline.")
else:
    print(f"  {total - passed} test(s) failed — see details above.")
print()
