# Graph Report - .  (2026-04-27)

## Corpus Check
- 141 files · ~232,218 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 670 nodes · 898 edges · 109 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 244 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]

## God Nodes (most connected - your core abstractions)
1. `retrieve()` - 21 edges
2. `Crop` - 18 edges
3. `Farm` - 16 edges
4. `Meta` - 12 edges
5. `UserSerializer` - 12 edges
6. `MLModelVersion` - 11 edges
7. `Prediction` - 11 edges
8. `TestOntologyGraph` - 11 edges
9. `validate_and_enrich()` - 11 edges
10. `predict()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `chat()` --calls--> `normalize()`  [INFERRED]
  backend/chat/views.py → blender_scripts/organize_madagascar_drilldown.py
- `predict()` --calls--> `predict_yield()`  [INFERRED]
  backend/predictions/views.py → backend/predictions/ml/yield_model.py
- `Meta` --uses--> `Conversation`  [INFERRED]
  backend/users/serializers.py → backend/chat/models.py
- `Meta` --uses--> `Message`  [INFERRED]
  backend/users/serializers.py → backend/chat/models.py
- `Meta` --uses--> `User`  [INFERRED]
  backend/users/serializers.py → backend/users/models.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (43): make_mat(), apply_modifiers(), duplicate_object(), find_col(), get_or_create_col(), get_or_create_material(), link_to_scene_if_needed(), main() (+35 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (25): Crop, Farm, Meta, MLModelVersion, Prediction, Données d'analyse de sol associées à une parcelle., Résultat d'une prédiction ML pour une culture donnée., Registre des versions de modèles ML déployés. (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (32): _get_ontology_facts(), _find_individual(), get_class_tag(), get_domain_keywords(), get_facts_block(), get_graph(), get_pedigree(), get_related_concepts() (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): handleSend(), BaseUserManager, sendMessage(), createCrop(), createFarm(), createSoilData(), getCrops(), getFarm() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (29): _build_result(), _distance_to_score(), _empty_result(), _expand_query(), _fallback_static(), _format_context(), _load_vector_store(), _no_data_result() (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (32): build_prompt(), _call_colab_blocking(), clear_cache(), generate(), get_model_info(), _parse_sse_line(), _post_process(), Étape 4 du pipeline : appel au LLM hébergé sur Google Colab via HTTP (FastAPI + (+24 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (4): PrivateRoute(), getAccessToken(), handleNameSubmit(), handlePwdSubmit()

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (14): AbstractBaseUser, APIView, updateCrop(), updateFarm(), User, PermissionsMixin, LoginSerializer, RegisterSerializer (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (9): _generate_recommendations(), predict(), Modèle de prédiction de rendement pour la riziculture malgache.  Features d'entr, Retourne une prédiction de rendement riz basée sur des règles expertes.     À re, TestRiceModel, TestYieldModelDispatch, predict_yield(), Interface générique pour les modèles de prédiction de rendement. Dispatch vers l (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (16): get_view(), handle_dice(), handle_reset(), handle_rollup(), handle_slice(), on_annee(), on_culture(), on_metrique() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (10): _detect_tags_from_ontology(), _get_ontology_keywords(), Étape 2 du pipeline : validation ontologique et enrichissement du contexte.  - V, Verifie que `keyword` apparait comme mot entier dans `text_lower`.     Evite les, Retourne les keywords du graphe rdflib, avec fallback sur le dict local., Détecte les context_tags en deux passes :     1. Via les classes OWL des entités, validate_and_enrich(), _word_match() (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.23
Nodes (15): build_bvh(), centroid_world(), find_col(), geo_region(), get_or_create(), identify_objects(), link_obj(), main() (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (10): bbox_overlap_area(), get_col(), get_or_create_col(), link_to(), main(), normalize(), Script Blender Python : Organisation hiérarchique Madagascar pour Drill-down ===, Calcule l'aire de chevauchement XY entre deux objets. (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.23
Nodes (11): build_index(), chunk_text(), embed_documents(), embed_query(), _get_model(), Génération des embeddings et construction du vector store FAISS.  Usage CLI :, Charge le modèle ONNX une seule fois par worker (cache process-level)., Encode une liste de textes (utilisé à l'indexation). (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (9): get_current_view(), handle_dice(), handle_drill(), handle_reset(), handle_rollup(), handle_slice(), SLICE : Isole une tranche unique sur l'axe sélectionné., DICE : Filtre strictement selon toutes les cases cochées. (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (5): AppConfig, ChatConfig, CropsConfig, PredictionsConfig, UsersConfig

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 0.32
Nodes (7): extract_text_from_pdf(), extract_text_from_txt(), import_file(), Importe un fichier PDF ou TXT local dans la knowledge base RAG. Utile pour les d, Extrait le texte d'un PDF local avec pdfplumber., Lit un fichier texte brut., Importe un fichier local dans la knowledge base.     Retourne True si succès.

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 0.32
Nodes (3): MetricTile(), SecurityTile(), useCounter()

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (2): formatPop(), TilePopulation()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (3): get_memory_usage(), Test CropGPT - Qwen2 Local Model Lancer: python test_cropgpt.py  Affiche: memoir, Retourne l'utilisation memoire en MB.

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (3): Base settings — partagées entre tous les environnements., Settings de développement — DEBUG activé, SQLite, CORS large., Settings de production — DEBUG=False, PostgreSQL, HTTPS. Toutes les valeurs sens

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 0.47
Nodes (4): create_topo_material(), hex_to_rgba(), Convertit un code hex en RGBA linéaire pour Blender.     Pour les couleurs très, setup_scene()

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (1): Migration

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (2): fmt(), RegionalNavigation()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (3): detect_language(), normalize(), Étape 1 du pipeline : nettoyage et normalisation du prompt utilisateur.  Input

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (1): Test du chargeur d'ontologie CropGPT. Lancer depuis backend/ :     python test_o

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (2): main(), Run administrative tasks.

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (2): glass(), RegionSidebar()

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (1): Script de diagnostic : liste toutes les collections et objets de la scène.

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Quick test Qwen2 - sans details memoire

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Minimal test Qwen2 -tres rapide

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): Export Qwen2 to ONNX using optimum.

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Django settings for config project.  Generated by 'django-admin startproject' us

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): WSGI config for config project.  It exposes the WSGI callable as a module-level

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): ASGI config for config project.  It exposes the ASGI callable as a module-level

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): Des mots agricoles fondamentaux doivent apparaître dans les keywords FR.

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): Les classes variétales doivent être mappées au tag 'varieties'.

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (0): 

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (0): 

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (0): 

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (0): 

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (0): 

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (0): 

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (0): 

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (0): 

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (0): 

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (0): 

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (0): 

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (0): 

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (0): 

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (0): 

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (0): 

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (0): 

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (0): 

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (1): Enrichit la requête FAISS avec les concepts liés trouvés dans l'ontologie.     E

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (1): Évalue la qualité des résultats et construit la réponse appropriée.     C'est ic

### Community 104 - "Community 104"
Cohesion: 1.0
Nodes (1): Gère le cas où le RAG ne trouve rien d'utile.     Tente le fallback sur la knowl

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (1): Formate les documents récupérés + les faits ontologiques pour le LLM.

### Community 106 - "Community 106"
Cohesion: 1.0
Nodes (1): Contexte statique de secours basé sur les tags ontologiques.     Utilisé quand F

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (1): Découpe un texte en chunks avec chevauchement.

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (1): Construit le vector store FAISS à partir des documents.      Args:         docum

## Knowledge Gaps
- **135 isolated node(s):** `Test du chargeur d'ontologie CropGPT. Lancer depuis backend/ :     python test_o`, `Run administrative tasks.`, `Test CropGPT - Qwen2 Local Model Lancer: python test_cropgpt.py  Affiche: memoir`, `Retourne l'utilisation memoire en MB.`, `Quick test Qwen2 - sans details memoire` (+130 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 46`** (2 nodes): `vite.config.js`, `manualChunks()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `quick_test.py`, `Quick test Qwen2 - sans details memoire`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `minimal_test.py`, `Minimal test Qwen2 -tres rapide`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `convert_to_onnx.py`, `Export Qwen2 to ONNX using optimum.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `settings.py`, `Django settings for config project.  Generated by 'django-admin startproject' us`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `wsgi.py`, `WSGI config for config project.  It exposes the WSGI callable as a module-level`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `urls.py`, `health()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `ASGI config for config project.  It exposes the ASGI callable as a module-level`, `asgi.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `test.jsx`, `Dashboard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `RAGConfidenceBadge()`, `RAGConfidenceBadge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (2 nodes): `useChatStream.ts`, `useChatStream()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (2 nodes): `ScrollButton()`, `scroll-button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (2 nodes): `ChainOfThoughtItem()`, `chain-of-thought.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (2 nodes): `system-message.tsx`, `SystemMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (2 nodes): `TextScramble.jsx`, `TextScramble()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (2 nodes): `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (2 nodes): `useTheme.ts`, `useTheme()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (2 nodes): `Login()`, `login.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (2 nodes): `theme-provider.tsx`, `ThemeProvider()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (2 nodes): `Register()`, `register.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (2 nodes): `getAllFiles()`, `auto-webp.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `Des mots agricoles fondamentaux doivent apparaître dans les keywords FR.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `Les classes variétales doivent être mappées au tag 'varieties'.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `tests.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `admin.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `MarkdownMessage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `UserMessage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `regionData.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `prompt-suggestion.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `collapsible.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `tooltip.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `avatar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (1 nodes): `thinking-bar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (1 nodes): `Accordion.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (1 nodes): `madagascarGraphData.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (1 nodes): `madagascarGeoJSON.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (1 nodes): `Enrichit la requête FAISS avec les concepts liés trouvés dans l'ontologie.     E`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (1 nodes): `Évalue la qualité des résultats et construit la réponse appropriée.     C'est ic`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (1 nodes): `Gère le cas où le RAG ne trouve rien d'utile.     Tente le fallback sur la knowl`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (1 nodes): `Formate les documents récupérés + les faits ontologiques pour le LLM.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (1 nodes): `Contexte statique de secours basé sur les tags ontologiques.     Utilisé quand F`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `Découpe un texte en chunks avec chevauchement.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (1 nodes): `Construit le vector store FAISS à partir des documents.      Args:         docum`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `retrieve()` connect `Community 4` to `Community 0`, `Community 13`, `Community 5`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `UserSerializer` connect `Community 7` to `Community 0`, `Community 3`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `predict()` connect `Community 1` to `Community 0`, `Community 8`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `retrieve()` (e.g. with `chat()` and `.test_returns_empty_for_invalid_domain()`) actually correct?**
  _`retrieve()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `Crop` (e.g. with `PredictionViewSet` and `POST /api/predictions/predict/     Lance une prédiction de rendement pour une cu`) actually correct?**
  _`Crop` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `Farm` (e.g. with `MLModelVersion` and `Meta`) actually correct?**
  _`Farm` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `Meta` (e.g. with `Prediction` and `MLModelVersion`) actually correct?**
  _`Meta` has 8 INFERRED edges - model-reasoned connections that need verification._