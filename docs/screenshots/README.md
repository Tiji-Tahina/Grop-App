# Captures pour le README

Dépose ici les captures référencées par le README à la racine. Les chemins attendus sont :

| Fichier | Page à capturer |
|---|---|
| `chat.png` | Page de chat principale avec une conversation ouverte (idéalement avec une réponse streamée et ses sources visibles) |
| `map3d.png` | Carte 3D Three.js des 22 régions de Madagascar |
| `dashboard.png` | Dashboard force-graph thématique |
| `streaming.png` | Vue d'une réponse en cours de streaming, avec les étapes "thinking" et le score RAG |

## Conseils de capture

- Format **PNG** (pas JPEG : les UI à fort contraste compressent mal)
- Résolution **viewport 1440×900** ou plus, dpr 2 si possible
- Largeur affichée : ~800-1200 px sur GitHub
- Privilégier des **données réelles** (pas de Lorem Ipsum) — donne confiance au lecteur
- Ne pas capturer de **données utilisateur sensibles** (logs JWT, mots de passe, emails persos)

## Outils suggérés

- macOS : Cmd+Shift+4 (zone) ou Cmd+Shift+5 (vidéo)
- Linux : `flameshot` ou `gnome-screenshot`
- Browser DevTools : Lighthouse → "Capture screenshot" pour des résolutions exactes
- GIF animés (pour les démos de chat streaming) : [LICEcap](https://www.cockos.com/licecap/) ou [Peek](https://github.com/phw/peek)
