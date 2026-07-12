// GeoJSON of Madagascar's 22 regions — real WGS84 coordinates
// Negative latitudes (southern hemisphere), longitudes ~43-51°E
// Compatible with Leaflet (App.jsx) AND D3 (cartographie.jsx)

export const MADAGASCAR_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Diana", capital: "Antsiranana", area: 13124, pop: 696, biome: "tropical", climate: "wet", crops: ["🌿","☕","🌸"], elev: 450, color: "#e53935" },
      geometry: { type: "Polygon", coordinates: [[
        [49.3,-11.95],[50.0,-12.2],[50.35,-12.55],[50.25,-13.0],[50.0,-13.4],
        [49.5,-13.6],[49.0,-13.55],[48.5,-13.25],[48.2,-12.75],[48.35,-12.2],
        [48.8,-12.0],[49.3,-11.95]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Sava", capital: "Sambava", area: 25518, pop: 1100, biome: "rainforest", climate: "wet", crops: ["🌿","🌸","🍉"], elev: 320, color: "#8e24aa" },
      geometry: { type: "Polygon", coordinates: [[
        [49.0,-13.55],[49.5,-13.6],[50.0,-13.4],[50.25,-13.0],[50.4,-13.7],
        [50.5,-14.4],[50.4,-15.1],[50.2,-15.8],[49.8,-16.3],[49.3,-16.45],
        [48.9,-16.1],[48.6,-15.45],[48.5,-14.7],[48.7,-14.1],[49.0,-13.8],[49.0,-13.55]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Analanjirofo", capital: "Fenoarivo-Atsinanana", area: 21930, pop: 1000, biome: "rainforest", climate: "wet", crops: ["🌿","☕","🌸"], elev: 280, color: "#f4511e" },
      geometry: { type: "Polygon", coordinates: [[
        [48.5,-14.7],[48.6,-15.45],[48.9,-16.1],[49.3,-16.45],[49.8,-16.3],
        [50.2,-15.8],[50.3,-16.6],[50.2,-17.4],[49.9,-17.9],[49.4,-18.2],
        [48.9,-18.1],[48.5,-17.7],[48.35,-17.1],[48.45,-16.4],[48.5,-14.7]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Atsinanana", capital: "Toamasina", area: 19922, pop: 1275, biome: "rainforest", climate: "wet", crops: ["🌾","☕","🍉"], elev: 240, color: "#0b8043" },
      geometry: { type: "Polygon", coordinates: [[
        [47.8,-17.2],[48.1,-17.0],[48.35,-17.1],[48.5,-17.7],[48.9,-18.1],
        [49.4,-18.2],[49.9,-17.9],[50.1,-18.5],[50.0,-19.3],[49.7,-19.8],
        [49.2,-20.0],[48.7,-19.8],[48.3,-19.4],[48.1,-18.9],[47.9,-18.4],
        [47.8,-17.8],[47.8,-17.2]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Vatovavy-Fitovinany", capital: "Manakara", area: 19605, pop: 1310, biome: "rainforest", climate: "wet", crops: ["🌾","☕","🌱"], elev: 210, color: "#039be5" },
      geometry: { type: "Polygon", coordinates: [[
        [47.8,-19.8],[48.3,-19.4],[48.7,-19.8],[49.2,-20.0],[49.7,-19.8],
        [49.9,-20.5],[49.7,-21.2],[49.3,-21.6],[48.8,-21.75],[48.3,-21.5],
        [48.0,-21.1],[47.7,-20.6],[47.7,-20.1],[47.8,-19.8]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Atsimo-Atsinanana", capital: "Farafangana", area: 18993, pop: 998, biome: "transition", climate: "humid", crops: ["🌾","🌱","🌽"], elev: 180, color: "#e67c73" },
      geometry: { type: "Polygon", coordinates: [[
        [47.7,-20.6],[48.0,-21.1],[48.3,-21.5],[48.8,-21.75],[49.1,-22.0],
        [48.85,-22.55],[48.4,-23.05],[48.0,-23.2],[47.6,-23.0],[47.3,-22.5],
        [47.15,-22.0],[47.35,-21.5],[47.6,-21.15],[47.7,-20.6]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Anosy", capital: "Tôlanaro", area: 25731, pop: 731, biome: "dry", climate: "dry", crops: ["🌱","🌽","🍉"], elev: 620, color: "#c0392b" },
      geometry: { type: "Polygon", coordinates: [[
        [47.3,-22.5],[47.6,-23.0],[48.0,-23.2],[48.4,-23.05],[48.85,-22.55],
        [49.0,-23.1],[48.8,-23.8],[48.4,-24.5],[47.9,-25.0],[47.4,-25.3],
        [46.9,-25.1],[46.5,-24.7],[46.4,-24.1],[46.6,-23.5],[46.95,-23.0],
        [47.3,-22.5]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Androy", capital: "Ambovombe", area: 19317, pop: 743, biome: "spiny", climate: "arid", crops: ["🌱","🌽"], elev: 140, color: "#d4e157" },
      geometry: { type: "Polygon", coordinates: [[
        [46.5,-24.7],[46.9,-25.1],[47.4,-25.3],[47.9,-25.0],[48.3,-25.4],
        [47.95,-25.6],[47.4,-25.65],[46.8,-25.6],[46.2,-25.4],[45.7,-25.2],
        [45.5,-24.8],[45.7,-24.4],[46.1,-24.3],[46.5,-24.7]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Atsimo-Andrefana", capital: "Toliara", area: 66236, pop: 1034, biome: "spiny", climate: "arid", crops: ["🌱","🌽","🍉"], elev: 130, color: "#43a047" },
      geometry: { type: "Polygon", coordinates: [[
        [43.2,-22.0],[43.5,-21.5],[43.7,-21.0],[43.9,-20.5],[44.2,-20.0],
        [44.5,-19.6],[44.85,-19.4],[45.3,-19.5],[45.6,-19.9],[45.8,-20.5],
        [45.8,-21.2],[45.7,-22.0],[45.6,-22.8],[45.5,-23.5],[45.3,-24.2],
        [45.0,-24.7],[44.5,-25.1],[43.9,-25.3],[43.4,-25.0],[43.2,-24.4],
        [43.2,-22.0]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Menabe", capital: "Morondava", area: 46121, pop: 610, biome: "savanna", climate: "dry", crops: ["🌾","🌽","🌱"], elev: 160, color: "#fb8c00" },
      geometry: { type: "Polygon", coordinates: [[
        [43.5,-18.8],[43.8,-18.4],[44.1,-18.0],[44.3,-17.5],[44.6,-17.1],
        [44.9,-16.9],[45.3,-17.1],[45.6,-17.5],[45.8,-18.0],[45.8,-18.6],
        [45.6,-19.2],[45.3,-19.6],[45.0,-19.9],[44.7,-20.1],[44.3,-20.2],
        [43.9,-20.0],[43.6,-19.6],[43.5,-19.2],[43.5,-18.8]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Melaky", capital: "Maintirano", area: 38852, pop: 368, biome: "mangrove", climate: "humid", crops: ["🌾","🌽"], elev: 120, color: "#00acc1" },
      geometry: { type: "Polygon", coordinates: [[
        [43.5,-15.5],[43.7,-15.1],[44.0,-14.7],[44.3,-14.4],[44.6,-14.2],
        [44.9,-14.1],[45.2,-14.3],[45.4,-14.8],[45.5,-15.4],[45.4,-16.0],
        [45.2,-16.5],[44.9,-16.9],[44.6,-17.1],[44.3,-17.0],[44.0,-16.8],
        [43.7,-16.4],[43.5,-16.0],[43.5,-15.5]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Boeny", capital: "Mahajanga", area: 31046, pop: 756, biome: "savanna", climate: "dry", crops: ["🌾","🌱","🍉"], elev: 150, color: "#7b1fa2" },
      geometry: { type: "Polygon", coordinates: [[
        [43.6,-13.5],[43.9,-13.2],[44.3,-13.0],[44.7,-13.1],[45.0,-12.9],
        [45.4,-12.8],[45.7,-13.0],[45.9,-13.5],[45.9,-14.1],[45.7,-14.6],
        [45.4,-15.0],[45.2,-15.4],[44.9,-15.5],[44.6,-15.3],[44.3,-15.0],
        [44.0,-14.7],[43.7,-14.4],[43.5,-14.0],[43.6,-13.5]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Sofia", capital: "Antsohihy", area: 53239, pop: 1250, biome: "savanna", climate: "humid", crops: ["🌾","☕","🌱"], elev: 280, color: "#f6bf26" },
      geometry: { type: "Polygon", coordinates: [[
        [43.9,-13.2],[44.3,-13.0],[44.7,-13.1],[45.0,-12.9],[45.4,-12.8],
        [45.7,-12.5],[46.1,-12.4],[46.5,-12.3],[46.9,-12.4],[47.3,-12.6],
        [47.7,-12.9],[48.0,-13.2],[48.2,-13.7],[48.1,-14.2],[47.8,-14.5],
        [47.4,-14.7],[47.0,-14.8],[46.6,-14.7],[46.2,-14.5],[45.9,-14.2],
        [45.6,-14.1],[45.3,-14.2],[45.0,-14.4],[44.7,-14.5],[44.4,-14.4],
        [44.1,-14.2],[43.8,-13.9],[43.6,-13.5],[43.9,-13.2]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Betsiboka", capital: "Maevatanana", area: 30025, pop: 426, biome: "savanna", climate: "humid", crops: ["🌾","🌽"], elev: 200, color: "#ef6c00" },
      geometry: { type: "Polygon", coordinates: [[
        [46.2,-14.5],[46.6,-14.7],[47.0,-14.8],[47.4,-14.7],[47.8,-14.5],
        [48.1,-14.2],[48.2,-14.7],[48.1,-15.3],[47.9,-15.8],[47.6,-16.2],
        [47.2,-16.5],[46.8,-16.6],[46.4,-16.4],[46.1,-16.0],[46.0,-15.5],
        [46.1,-15.0],[46.2,-14.5]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Analamanga", capital: "Antananarivo", area: 16911, pop: 3567, biome: "highland", climate: "highland", crops: ["🌾","🌽","🌱"], elev: 1280, color: "#1e88e5", isCapital: true },
      geometry: { type: "Polygon", coordinates: [[
        [47.2,-17.5],[47.5,-17.3],[47.8,-17.2],[48.1,-17.0],[48.35,-17.1],
        [48.4,-17.6],[48.3,-18.1],[48.1,-18.5],[47.8,-18.75],[47.4,-18.85],
        [47.0,-18.65],[46.85,-18.2],[46.95,-17.8],[47.2,-17.5]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Itasy", capital: "Miarinarivo", area: 6993, pop: 750, biome: "highland", climate: "highland", crops: ["🌾","🌽"], elev: 1350, color: "#00897b" },
      geometry: { type: "Polygon", coordinates: [[
        [46.4,-18.5],[46.65,-18.3],[46.85,-18.2],[47.0,-18.65],[46.85,-19.0],
        [46.6,-19.15],[46.35,-19.0],[46.3,-18.7],[46.4,-18.5]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Bongolava", capital: "Tsiroanomandidy", area: 18599, pop: 451, biome: "savanna", climate: "humid", crops: ["🌾","🌱","🌽"], elev: 800, color: "#6d4c41" },
      geometry: { type: "Polygon", coordinates: [[
        [45.6,-17.0],[45.9,-16.8],[46.2,-16.6],[46.5,-16.5],[46.8,-16.6],
        [47.2,-16.5],[47.5,-16.6],[47.5,-17.2],[47.2,-17.5],[46.95,-17.8],
        [46.7,-17.9],[46.4,-17.8],[46.1,-17.6],[45.9,-17.3],[45.7,-17.0],[45.6,-17.0]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Vakinankaratra", capital: "Antsirabe", area: 16993, pop: 1796, biome: "highland", climate: "highland", crops: ["🌾","🌽","🌱"], elev: 1600, color: "#3949ab" },
      geometry: { type: "Polygon", coordinates: [[
        [46.85,-18.9],[47.0,-18.65],[47.4,-18.85],[47.8,-18.75],[48.1,-18.5],
        [48.15,-19.0],[48.05,-19.5],[47.8,-19.9],[47.4,-20.15],[47.0,-20.0],
        [46.75,-19.65],[46.65,-19.2],[46.85,-18.9]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Amoron'i Mania", capital: "Ambositra", area: 16141, pop: 759, biome: "highland", climate: "highland", crops: ["🌾","☕","🌱"], elev: 1200, color: "#e91e63" },
      geometry: { type: "Polygon", coordinates: [[
        [47.0,-20.0],[47.4,-20.15],[47.8,-19.9],[48.05,-19.5],[48.1,-19.9],
        [48.05,-20.5],[47.8,-20.9],[47.5,-21.1],[47.2,-21.0],[46.95,-20.7],
        [46.85,-20.3],[46.95,-20.0],[47.0,-20.0]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Haute Matsiatra", capital: "Fianarantsoa", area: 21080, pop: 1130, biome: "highland", climate: "highland", crops: ["🌾","🌱","🌽"], elev: 1050, color: "#9c27b0" },
      geometry: { type: "Polygon", coordinates: [[
        [46.95,-20.7],[47.2,-21.0],[47.5,-21.1],[47.8,-20.9],[48.05,-20.5],
        [48.1,-21.0],[47.95,-21.6],[47.65,-22.0],[47.3,-22.1],[46.95,-21.85],
        [46.8,-21.4],[46.85,-21.0],[46.95,-20.7]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Ihorombe", capital: "Ihosy", area: 26318, pop: 327, biome: "transition", climate: "dry", crops: ["🌾","🌽","🌱"], elev: 750, color: "#558b2f" },
      geometry: { type: "Polygon", coordinates: [[
        [46.1,-21.0],[46.4,-20.8],[46.7,-20.7],[46.85,-21.0],[46.8,-21.4],
        [46.95,-21.85],[47.3,-22.1],[47.15,-22.4],[46.85,-22.6],[46.5,-22.6],
        [46.1,-22.4],[45.85,-22.0],[45.9,-21.5],[46.1,-21.0]
      ]] }
    },
    {
      type: "Feature",
      properties: { name: "Alaotra-Mangoro", capital: "Ambatondrazaka", area: 31948, pop: 1100, biome: "transition", climate: "humid", crops: ["🌾","☕","🍉"], elev: 900, color: "#00838f" },
      geometry: { type: "Polygon", coordinates: [[
        [47.5,-17.3],[47.8,-17.2],[48.1,-17.0],[48.35,-17.1],[48.4,-17.6],
        [48.5,-17.7],[48.9,-18.1],[49.4,-18.2],[49.4,-18.7],[49.1,-19.1],
        [48.7,-19.4],[48.3,-19.4],[48.05,-19.5],[48.1,-18.9],[47.9,-18.4],
        [47.8,-17.8],[47.5,-17.6],[47.5,-17.3]
      ]] }
    }
  ]
};
