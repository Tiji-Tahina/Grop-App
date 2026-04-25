const REGIONS = [
  { id:"region-Diana",               label:"Diana",               capital:"Antsiranana",          pop:"696 K",   growth:"+3.8%", positive:true,  surface:"13 124 km²", sparkline:[38,40,42,44,43,46,48], note:"Porte d'entrée nord. Tourisme balnéaire et zone franche industrielle en développement rapide.", crops:"Cacao · Vanille · Café",         accent:"#3b82f6", biome:"tropical",   climate:"wet",      gdp:"$420M",  val:18 },
  { id:"region-Sava",                label:"Sava",                capital:"Sambava",               pop:"1.1 M",   growth:"+4.5%", positive:true,  surface:"25 518 km²", sparkline:[50,52,55,53,58,60,63], note:"Capital mondial de la vanille. Exportations en forte croissance depuis 2022.",                crops:"Vanille · Girofle · Letchi",    accent:"#8e24aa", biome:"rainforest", climate:"wet",      gdp:"$750M",  val:18 },
  { id:"region-Analanjirofo",        label:"Analanjirofo",        capital:"Fenoarivo-Atsinanana",  pop:"1.0 M",   growth:"+3.2%", positive:true,  surface:"21 930 km²", sparkline:[42,44,43,46,45,48,50], note:"Région côtière est, biodiversité exceptionnelle. Pêche artisanale en expansion.",               crops:"Girofle · Café · Letchi",       accent:"#f4511e", biome:"rainforest", climate:"wet",      gdp:"$420M",  val:18 },
  { id:"region-Sofia",               label:"Sofia",               capital:"Antsohihy",             pop:"1.3 M",   growth:"+2.9%", positive:true,  surface:"50 875 km²", sparkline:[35,36,38,37,40,39,42], note:"Seconde plus grande région. Agriculture vivrière dominante, fort potentiel rizicole.",           crops:"Riz · Coton · Maïs",            accent:"#00897b", biome:"savanna",    climate:"humid",    gdp:"$580M",  val:18 },
  { id:"region-Boeny",               label:"Boeny",               capital:"Mahajanga",             pop:"873 K",   growth:"+3.1%", positive:true,  surface:"31 046 km²", sparkline:[40,41,43,42,45,44,47], note:"Deuxième port de Madagascar. Hub commercial et touristique de la côte nord-ouest.",             crops:"Riz · Canne à sucre · Arachide",accent:"#8b5cf6", biome:"savanna",    climate:"dry",      gdp:"$550M",  val:18 },
  { id:"region-Betsiboka",           label:"Betsiboka",           capital:"Maevatanana",           pop:"364 K",   growth:"+1.8%", positive:true,  surface:"29 993 km²", sparkline:[20,21,22,21,23,22,24], note:"Région enclavée, bassin versant du fleuve Betsiboka. Projets d'irrigation en cours.",          crops:"Riz · Maïs · Manioc",           accent:"#06b6d4", biome:"savanna",    climate:"humid",    gdp:"$180M",  val:18 },
  { id:"region-Melaky",              label:"Melaky",              capital:"Maintirano",            pop:"296 K",   growth:"+1.5%", positive:true,  surface:"66 236 km²", sparkline:[18,19,19,20,20,21,22], note:"Région la plus grande, très peu dense. Réserves pétrolières explorées depuis 2010.",           crops:"Maïs · Manioc · Coton",         accent:"#84cc16", biome:"mangrove",   climate:"humid",    gdp:"$150M",  val:18 },
  { id:"region-Bongolava",           label:"Bongolava",           capital:"Tsiroanomandidy",       pop:"456 K",   growth:"+2.3%", positive:true,  surface:"16 688 km²", sparkline:[25,26,27,26,28,28,30], note:"Hauts plateaux centraux. Élevage bovin extensif et cultures de contre-saison.",               crops:"Riz · Maïs · Élevage bovin",    accent:"#a78bfa", biome:"savanna",    climate:"humid",    gdp:"$220M",  val:18 },
  { id:"region-Itasy",               label:"Itasy",               capital:"Miarinarivo",           pop:"703 K",   growth:"+2.7%", positive:true,  surface:"6 658 km²",  sparkline:[38,39,40,42,41,43,45], note:"Région la plus petite et la plus densément peuplée des hauts plateaux. Artisanat.",           crops:"Riz · Pomme de terre · Légumes",accent:"#34d399", biome:"highland",   climate:"highland", gdp:"$380M",  val:18 },
  { id:"region-Analamanga",          label:"Analamanga",          capital:"Antananarivo",          pop:"3.6 M",   growth:"+4.2%", positive:true,  surface:"16 911 km²", sparkline:[70,73,76,75,79,82,86], note:"Centre économique et politique. Hub technologique, secteur tertiaire en pleine expansion.",    crops:"Riz · Légumes · Fruits",        accent:"#10b981", biome:"highland",   climate:"highland", gdp:"$3.2B",  val:22 },
  { id:"region-Alaotra-Mangoro",     label:"Alaotra-Mangoro",     capital:"Ambatondrazaka",        pop:"1.1 M",   growth:"+3.4%", positive:true,  surface:"31 948 km²", sparkline:[48,50,52,51,54,56,58], note:"Grenier à riz de Madagascar. Lac Alaotra, plus grande zone rizicole du pays.",               crops:"Riz · Café · Élevage",          accent:"#eab308", biome:"transition", climate:"humid",    gdp:"$650M",  val:18 },
  { id:"region-Atsinanana",          label:"Atsinanana",          capital:"Toamasina",             pop:"1.3 M",   growth:"+3.6%", positive:true,  surface:"21 934 km²", sparkline:[52,54,56,55,58,60,63], note:"Premier port de Madagascar. Corridor économique vers Antananarivo, hub logistique.",          crops:"Girofle · Café · Cacao",        accent:"#6366f1", biome:"rainforest", climate:"wet",      gdp:"$1.4B",  val:20 },
  { id:"region-Vakinankaratra",      label:"Vakinankaratra",      capital:"Antsirabe",             pop:"1.8 M",   growth:"+3.0%", positive:true,  surface:"16 599 km²", sparkline:[56,58,60,59,62,64,67], note:"Deuxième ville, capitale industrielle. Brasseries, textile et tourisme thermal.",             crops:"Riz · Pomme de terre · Blé",    accent:"#14b8a6", biome:"highland",   climate:"highland", gdp:"$1.1B",  val:19 },
  { id:"region-Amoron-i-Mania",      label:"Amoron'i Mania",      capital:"Ambositra",             pop:"730 K",   growth:"+2.1%", positive:true,  surface:"16 141 km²", sparkline:[33,34,35,34,36,36,38], note:"Capitale de l'artisanat malgache, notamment la marqueterie en bois précieux.",              crops:"Riz · Maïs · Patate douce",     accent:"#f59e0b", biome:"highland",   climate:"highland", gdp:"$350M",  val:18 },
  { id:"region-Menabe",              label:"Menabe",              capital:"Morondava",             pop:"620 K",   growth:"+2.4%", positive:true,  surface:"46 121 km²", sparkline:[28,29,30,30,32,31,33], note:"Allée des baobabs, site touristique majeur. Pêche artisanale et production de sel.",          crops:"Maïs · Manioc · Coton",         accent:"#22d3ee", biome:"savanna",    climate:"dry",      gdp:"$300M",  val:18 },
  { id:"region-Haute-Matsiatra",     label:"Haute Matsiatra",     capital:"Fianarantsoa",          pop:"1.2 M",   growth:"+2.8%", positive:true,  surface:"21 080 km²", sparkline:[45,46,48,47,50,50,52], note:"Capitale culturelle du Sud. Vignobles, enseignement supérieur et patrimoine colonial.",       crops:"Riz · Maïs · Vigne",            accent:"#7c3aed", biome:"highland",   climate:"highland", gdp:"$800M",  val:18 },
  { id:"region-Vatovavy-Fitovinany", label:"Vatovavy-Fitovinany", capital:"Manakara",              pop:"1.2 M",   growth:"+1.9%", positive:true,  surface:"19 136 km²", sparkline:[38,39,40,39,41,41,43], note:"Côte est, canal des Pangalanes. Café Robusta et girofle de qualité premium.",               crops:"Café · Girofle · Riz",          accent:"#e879f9", biome:"rainforest", climate:"wet",      gdp:"$440M",  val:18 },
  { id:"region-Ihorombe",            label:"Ihorombe",            capital:"Ihosy",                 pop:"304 K",   growth:"+1.6%", positive:true,  surface:"26 391 km²", sparkline:[16,17,17,18,18,19,20], note:"Porte du sud. Élevage zébu intensif et mines de chromite prometteuses.",                    crops:"Maïs · Manioc · Élevage",       accent:"#fb7185", biome:"transition", climate:"dry",      gdp:"$140M",  val:18 },
  { id:"region-Atsimo-Atsinanana",   label:"Atsimo-Atsinanana",   capital:"Vangaindrano",          pop:"830 K",   growth:"-0.2%", positive:false, surface:"18 863 km²", sparkline:[30,29,30,28,29,28,29], note:"Côte sud-est isolée. Accès difficile, déforestation critique, aide humanitaire active.",    crops:"Riz · Manioc · Patate douce",   accent:"#fbbf24", biome:"transition", climate:"humid",    gdp:"$300M",  val:18 },
  { id:"region-Atsimo-Andrefana",    label:"Atsimo-Andrefana",    capital:"Toliara",               pop:"1.9 M",   growth:"+2.1%", positive:true,  surface:"66 236 km²", sparkline:[35,36,37,36,38,38,40], note:"Potentiel touristique (barrière de corail) et minier (ilménite, saphir) élevé.",            crops:"Maïs · Manioc · Haricot",       accent:"#65a30d", biome:"spiny",      climate:"arid",     gdp:"$550M",  val:18 },
  { id:"region-Androy",              label:"Androy",              capital:"Ambovombe",             pop:"740 K",   growth:"-0.8%", positive:false, surface:"19 317 km²", sparkline:[22,21,22,20,21,20,20], note:"Région la plus aride, régulièrement touchée par la sécheresse. Programme KERE actif.",      crops:"Manioc · Maïs · Élevage",       accent:"#f97316", biome:"spiny",      climate:"arid",     gdp:"$200M",  val:18 },
  { id:"region-Anosy",               label:"Anosy",               capital:"Tôlanaro",              pop:"604 K",   growth:"+2.6%", positive:true,  surface:"25 695 km²", sparkline:[28,29,30,30,32,33,34], note:"Fort Dauphin, port minéralier QMM. Biodiversité unique : forêts épineuses endémiques.",     crops:"Manioc · Riz · Maïs",           accent:"#2dd4bf", biome:"dry",        climate:"dry",      gdp:"$280M",  val:18 },
];

const NOTES = {
  "region-Diana":               [["[[Tourisme Balnéaire]]","tourisme"],["[[Zone Franche Nord]]","industrie"]],
  "region-Sava":                [["[[Capital Vanille]]","agriculture"],["[[Exportations Épices]]","commerce"],["[[Filière Girofle]]","agriculture"]],
  "region-Analanjirofo":        [["[[Biodiversité Côtière]]","environnement"],["[[Pêche Artisanale]]","économie"]],
  "region-Sofia":               [["[[Potentiel Rizicole]]","agriculture"],["[[Agriculture Vivrière]]","économie"]],
  "region-Boeny":               [["[[Hub Commercial]]","commerce"],["[[Port Mahajanga]]","infrastructure"]],
  "region-Betsiboka":           [["[[Irrigation Fluviale]]","agriculture"],["[[Bassin Betsiboka]]","environnement"]],
  "region-Melaky":              [["[[Réserves Pétrolières]]","énergie"],["[[Densité Rurale]]","démographie"]],
  "region-Bongolava":           [["[[Élevage Bovin]]","agriculture"],["[[Contre-Saison]]","agriculture"]],
  "region-Itasy":               [["[[Artisanat Hauts Plateaux]]","culture"],["[[Densité Urbaine]]","démographie"]],
  "region-Analamanga":          [["[[Hub Technologique]]","tech"],["[[Expansion Tertiaire]]","économie"],["[[Capitale Économique]]","politique"]],
  "region-Alaotra-Mangoro":     [["[[Grenier à Riz]]","agriculture"],["[[Lac Alaotra]]","environnement"]],
  "region-Atsinanana":          [["[[Premier Port]]","infrastructure"],["[[Corridor Économique]]","logistique"]],
  "region-Vakinankaratra":      [["[[Capitale Industrielle]]","industrie"],["[[Tourisme Thermal]]","tourisme"]],
  "region-Amoron-i-Mania":      [["[[Marqueterie Bois]]","artisanat"],["[[Artisanat Malgache]]","culture"]],
  "region-Menabe":              [["[[Allée des Baobabs]]","tourisme"],["[[Sel & Pêche]]","économie"]],
  "region-Haute-Matsiatra":     [["[[Vignobles Sud]]","agriculture"],["[[Capitale Culturelle]]","culture"]],
  "region-Vatovavy-Fitovinany": [["[[Canal Pangalanes]]","infrastructure"],["[[Café Robusta]]","agriculture"]],
  "region-Ihorombe":            [["[[Mines Chromite]]","mines"],["[[Élevage Zébu]]","agriculture"]],
  "region-Atsimo-Atsinanana":   [["[[Aide Humanitaire]]","social"],["[[Déforestation Sud]]","environnement"]],
  "region-Atsimo-Andrefana":    [["[[Barrière de Corail]]","tourisme"],["[[Mines Ilménite]]","mines"]],
  "region-Androy":              [["[[Programme KERE]]","social"],["[[Sécheresse Endémique]]","environnement"]],
  "region-Anosy":               [["[[Port QMM]]","infrastructure"],["[[Forêts Épineuses]]","environnement"]],
};

const nodes = [];
const links = [];

REGIONS.forEach(r => {
  nodes.push({ ...r });

  const statPib = { id: `stat-${r.id}-pib`, type: "stat", label: `PIB ${r.gdp}`, regionId: r.label, val: 6 };
  const statPop = { id: `stat-${r.id}-pop`, type: "stat", label: `Pop. ${r.pop} (${r.growth})`, regionId: r.label, val: 6 };
  nodes.push(statPib, statPop);
  links.push({ source: r.id, target: statPib.id }, { source: r.id, target: statPop.id });

  (NOTES[r.id] || []).forEach(([label, tag], i) => {
    const noteId = `note-${r.id}-${i}`;
    nodes.push({ id: noteId, type: "note", label, tag, regionId: r.label, val: 4 });
    links.push({ source: r.id, target: noteId });
  });
});

export const GRAPH_DATA = { nodes, links };
