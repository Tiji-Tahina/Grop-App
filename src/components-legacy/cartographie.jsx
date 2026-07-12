/* eslint-disable react-hooks/refs */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { MADAGASCAR_GEOJSON } from "../data/madagascarGeoJSON";

// ─── REGION DATA ─────────────────────────────────────────────
const REGION_DATA = {
  "Diana":            { biomeLabel:"Tropical Forest", climateLabel:"Humid Tropical 🌧", funFact:"Northern gateway, access to the Mozambique Channel" },
  "Sava":             { biomeLabel:"Rainforest", climateLabel:"Humid Tropical 🌧", funFact:"World capital of vanilla — 80% of global production" },
  "Analanjirofo":     { biomeLabel:"Rainforest", climateLabel:"Humid Tropical 🌧", funFact:"Lychee and clove trees abundant on the east coast" },
  "Atsinanana":       { biomeLabel:"Rainforest", climateLabel:"Humid Tropical 🌧", funFact:"Toamasina is Madagascar's largest port" },
  "Vatovavy-Fitovinany": { biomeLabel:"Rainforest", climateLabel:"Humid Tropical 🌧", funFact:"High rainfall zone, over 2000mm/year" },
  "Atsimo-Atsinanana":{ biomeLabel:"Mixed Zone", climateLabel:"Humid Misty 🌫", funFact:"Transition between eastern forest and highlands" },
  "Anosy":            { biomeLabel:"Dry Zone", climateLabel:"Dry & Hot ☀️", funFact:"Fort-Dauphin is a major mining center (ilmenite)" },
  "Androy":           { biomeLabel:"Spiny Forest", climateLabel:"Arid & Hot ☀️", funFact:"Most arid region, the Antandroy are nomadic herders" },
  "Atsimo-Andrefana": { biomeLabel:"Spiny Forest", climateLabel:"Arid & Hot ☀️", funFact:"Largest region (66,236 km²) — giant baobabs in Morondava" },
  "Menabe":           { biomeLabel:"Savanna", climateLabel:"Dry & Hot ☀️", funFact:"Avenue of the Baobabs, the most photographed natural site in the country" },
  "Melaky":           { biomeLabel:"Mangroves", climateLabel:"Humid 🌫", funFact:"Coast with dense mangroves, traditional fishing zone" },
  "Boeny":            { biomeLabel:"Savanna", climateLabel:"Dry & Hot ☀️", funFact:"Mahajanga: 2nd city, historic medieval Arab port" },
  "Sofia":            { biomeLabel:"Savanna", climateLabel:"Humid 🌫", funFact:"Large rice-growing plains, northern rice granary" },
  "Betsiboka":        { biomeLabel:"Savanna", climateLabel:"Humid 🌫", funFact:"Intense deforestation visible from space (red water)" },
  "Analamanga":       { biomeLabel:"Highlands", climateLabel:"Highland Temperate 🌤", funFact:"Capital Antananarivo (Tana) at 1280m — 3.6 million inhabitants" },
  "Itasy":            { biomeLabel:"Highlands", climateLabel:"Highland Temperate 🌤", funFact:"Smallest region — Lake Itasy, volcanic craters" },
  "Bongolava":        { biomeLabel:"Savanna", climateLabel:"Humid 🌫", funFact:"Transition between highlands and western plains" },
  "Vakinankaratra":   { biomeLabel:"Highlands", climateLabel:"Highland Temperate 🌤", funFact:"Antsirabe at 1500m — spa city and rickshaw" },
  "Amoron'i Mania":   { biomeLabel:"Highlands", climateLabel:"Highland Temperate 🌤", funFact:"Ambositra, capital of Malagasy craftsmanship (marquetry)" },
  "Haute Matsiatra":  { biomeLabel:"Highlands", climateLabel:"Highland Temperate 🌤", funFact:"Fianarantsoa, 2nd university city, Malagasy wine" },
  "Ihorombe":         { biomeLabel:"Mixed Zone", climateLabel:"Dry & Hot ☀️", funFact:"Semi-arid plain, traditional zebu farming" },
  "Alaotra-Mangoro":  { biomeLabel:"Mixed Zone", climateLabel:"Humid 🌫", funFact:"Lake Alaotra — Madagascar's largest lake, intensive rice farming" },
};

const cropLabels = { "🌾":"Riz","🌿":"Vanille","☕":"Café","🌱":"Manioc","🌽":"Maïs","🌸":"Girofliers","🍉":"Fruits trop." };
const weatherEmoji = { wet:"🌧", humid:"🌫", highland:"🌤", dry:"☀️", arid:"☀️" };
const biomeColor = { tropical:"#3da832", rainforest:"#2ea820", highland:"#786050", spiny:"#b87030", savanna:"#907840", mangrove:"#509870", transition:"#708050", dry:"#a08040" };

// ─── DATA WAREHOUSE ──────────────────────────────────────────
const DW_CULTURES = ["Riz","Manioc","Maïs","Vanille","Girofle","Café","Haricot","Patate douce","Arachide"];
const DW_ANNEES   = [2020, 2021, 2022, 2023, 2024];

const _BASE_REND = { "Riz":2500,"Manioc":7000,"Maïs":1800,"Vanille":150,"Girofle":400,"Café":500,"Haricot":900,"Patate douce":6000,"Arachide":1200 };
const _BASE_PRIX = { "Riz":2400,"Manioc":750,"Maïs":1500,"Vanille":140000,"Girofle":90000,"Café":9000,"Haricot":3500,"Patate douce":900,"Arachide":4500 };
const _REG_AREA  = { "Diana":18,"Sava":22,"Analanjirofo":15,"Atsinanana":20,"Vatovavy-Fitovinany":18,"Atsimo-Atsinanana":12,"Anosy":8,"Androy":5,"Atsimo-Andrefana":6,"Menabe":14,"Melaky":10,"Boeny":20,"Sofia":35,"Betsiboka":12,"Analamanga":25,"Itasy":18,"Bongolava":14,"Vakinankaratra":30,"Amoron'i Mania":16,"Haute Matsiatra":20,"Ihorombe":8,"Alaotra-Mangoro":45 };
const _FACTORS = {
  "Riz":          { "Alaotra-Mangoro":1.25,"Sofia":1.10,"Vakinankaratra":0.90,"Itasy":0.95,"Betsiboka":0.85,"Boeny":0.80,"Analamanga":0.75,"Haute Matsiatra":0.70,"Amoron'i Mania":0.70,"Bongolava":0.65,"Diana":0.60,"Analanjirofo":0.55,"Menabe":0.50,"Atsinanana":0.65,"Vatovavy-Fitovinany":0.60 },
  "Manioc":       { "Sofia":1.15,"Boeny":1.00,"Menabe":0.90,"Melaky":0.85,"Atsimo-Andrefana":0.80,"Betsiboka":0.80,"Diana":0.75,"Anosy":0.70,"Androy":0.65,"Bongolava":0.70,"Atsinanana":0.65,"Vatovavy-Fitovinany":0.70 },
  "Maïs":         { "Vakinankaratra":1.10,"Haute Matsiatra":1.00,"Bongolava":0.90,"Analamanga":0.85,"Ihorombe":0.80,"Amoron'i Mania":0.80,"Itasy":0.75,"Menabe":0.70 },
  "Vanille":      { "Sava":1.50,"Analanjirofo":1.00,"Diana":0.70 },
  "Girofle":      { "Analanjirofo":1.30,"Diana":1.10,"Atsinanana":1.00 },
  "Café":         { "Vatovavy-Fitovinany":1.20,"Atsimo-Atsinanana":1.00,"Analanjirofo":0.90 },
  "Haricot":      { "Vakinankaratra":1.10,"Analamanga":1.00,"Itasy":0.95,"Amoron'i Mania":0.90,"Haute Matsiatra":0.85 },
  "Patate douce": { "Vakinankaratra":1.20,"Analamanga":1.00,"Amoron'i Mania":1.00,"Itasy":0.95,"Haute Matsiatra":0.90 },
  "Arachide":     { "Ihorombe":1.20,"Menabe":1.10,"Atsimo-Andrefana":1.00,"Anosy":0.90,"Androy":0.80 },
};
const _REAL = [
  ["Alaotra-Mangoro","Riz",2020,2800,38000,2500],["Alaotra-Mangoro","Riz",2021,3000,42500,2600],
  ["Alaotra-Mangoro","Riz",2022,3100,44000,2700],["Alaotra-Mangoro","Riz",2023,3150,45200,2800],
  ["Alaotra-Mangoro","Riz",2024,3200,45000,2900],["Sofia","Manioc",2020,7800,55000,800],
  ["Sofia","Manioc",2021,8000,58000,850],["Sofia","Manioc",2024,8500,62000,900],
  ["Sava","Vanille",2020,180,320,150000],["Sava","Vanille",2024,220,450,180000],
  ["Diana","Girofle",2024,450,1200,95000],
];

function _buildDWData() {
  const data = {};
  const allRegions = Object.keys(_REG_AREA);
  for (const region of allRegions) {
    data[region] = {};
    for (const culture of DW_CULTURES) {
      const factor = (_FACTORS[culture] || {})[region] || 0;
      if (factor === 0) continue;
      data[region][culture] = {};
      const baseRend = _BASE_REND[culture] * factor;
      const basePrix = _BASE_PRIX[culture];
      const areaKha  = _REG_AREA[region];
      for (let ai = 0; ai < DW_ANNEES.length; ai++) {
        const rendement  = Math.round(baseRend * Math.pow(1.02, ai));
        const prix       = Math.round(basePrix * Math.pow(1.03, ai));
        const production = Math.round(rendement * (areaKha * factor * 0.25));
        data[region][culture][DW_ANNEES[ai]] = { rendement, production, prix };
      }
    }
  }
  // Real data (override)
  for (const [region, culture, annee, rendement, production, prix] of _REAL) {
    if (!data[region]) data[region] = {};
    if (!data[region][culture]) data[region][culture] = {};
    data[region][culture][annee] = { rendement, production, prix };
  }
  return data;
}

const DW_DATA = _buildDWData();

// ─── TOP POPULATION DATA ─────────────────────────────────────
const topPop = [
  { name:"Analamanga", pop:3567 },{ name:"Vakinankaratra", pop:1796 },
  { name:"Vatovavy", pop:1310 },{ name:"Atsinanana", pop:1275 },
  { name:"Sofia", pop:1250 },{ name:"Sava", pop:1100 },
];

// ─── FACTS ───────────────────────────────────────────────────
const funFacts = [
  "🦎 90% of the world's chameleon species live in Madagascar",
  "🌿 The SAVA region produces 80% of the world's vanilla",
  "🌴 Island separated from Africa for 88 million years",
  "🐸 Over 300 species of endemic frogs",
  "⛰️ Maromokotro peaks at 2,876 m elevation",
  "🐋 Humpback whales in Malagasy waters from June to September",
  "🌺 12,000 plant species, 80% endemic",
  "🦁 5 lemur families — 100+ unique species",
];

// ─── STYLES ──────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=Playfair+Display:wght@700;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body, html { height: 100%; }

  .mada-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #0f1923;
    color: #e8e0d0;
    font-family: 'Sora', sans-serif;
    overflow: hidden;
  }

  /* ── HEADER ── */
  .mada-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 28px;
    height: 62px;
    background: #0a1018;
    border-bottom: 1px solid rgba(200,160,60,0.15);
    flex-shrink: 0;
    gap: 16px;
  }
  .header-brand { display:flex; align-items:center; gap:12px; }
  .header-flag {
    width: 32px; height: 22px; border-radius: 3px; overflow:hidden;
    display:flex; flex-shrink:0;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .flag-white { flex:1; background:#fff; }
  .flag-red { flex:1; background:#FC3D32; }
  .flag-green { flex:1; background:#007E3A; }

  .header-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 900;
    color: #f0e6cc;
    letter-spacing: -0.3px;
    line-height: 1;
  }
  .header-subtitle {
    font-size: 10px;
    color: rgba(200,170,80,0.7);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-top: 2px;
    font-weight: 300;
  }

  .header-stats {
    display: flex;
    gap: 24px;
    align-items: center;
  }
  .h-stat { text-align:center; }
  .h-stat-val {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 700;
    color: #c9a84c;
    line-height: 1;
  }
  .h-stat-lbl {
    font-size: 9px;
    color: rgba(180,160,120,0.55);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 2px;
    font-weight: 300;
  }
  .h-divider {
    width: 1px; height: 28px;
    background: rgba(200,160,60,0.15);
  }
  .header-badge {
    padding: 5px 14px;
    border: 1px solid rgba(200,160,60,0.25);
    border-radius: 20px;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(200,170,80,0.8);
    background: rgba(200,160,60,0.06);
    font-weight: 400;
    white-space: nowrap;
  }

  /* ── BODY ── */
  .mada-body {
    display: grid;
    grid-template-columns: 240px 1fr 260px;
    flex: 1;
    overflow: hidden;
  }

  /* ── PANELS ── */
  .panel {
    background: #0a1018;
    padding: 20px 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    scrollbar-width: thin;
    scrollbar-color: rgba(200,160,60,0.2) transparent;
  }
  .panel.right {
    border-left: 1px solid rgba(200,160,60,0.12);
  }
  .panel.left {
    border-right: 1px solid rgba(200,160,60,0.12);
  }

  .panel-block {}
  .panel-block h4 {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(200,160,60,0.7);
    margin-bottom: 12px;
    padding-bottom: 7px;
    border-bottom: 1px solid rgba(200,160,60,0.1);
    font-weight: 600;
  }

  /* Legend */
  .leg-row {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 7px;
    font-size: 11px;
    color: rgba(220,210,185,0.8);
    font-weight: 300;
    cursor: pointer;
    padding: 3px 5px;
    border-radius: 5px;
    transition: background 0.15s;
  }
  .leg-row:hover { background: rgba(255,255,255,0.04); }
  .leg-dot {
    width: 10px; height: 10px; border-radius: 3px; flex-shrink:0;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .leg-emoji { font-size: 14px; width: 20px; text-align:center; }

  /* Pop bars */
  .pop-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .pop-name {
    font-size: 10px;
    width: 80px;
    color: rgba(220,210,185,0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 300;
  }
  .pop-track {
    flex: 1; height: 5px;
    background: rgba(255,255,255,0.06);
    border-radius: 3px;
    overflow: hidden;
  }
  .pop-fill {
    height: 100%; border-radius: 3px;
    background: linear-gradient(90deg, #c9a84c, #e8c860);
    transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
  }
  .pop-val {
    font-size: 9px;
    color: rgba(200,170,80,0.6);
    width: 32px;
    text-align: right;
    font-weight: 400;
  }

  /* Climate grid */
  .climate-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .climate-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(200,160,60,0.1);
    border-radius: 8px;
    padding: 8px 4px;
    font-size: 9.5px;
    color: rgba(200,190,165,0.75);
    text-align: center;
    font-weight: 300;
  }
  .climate-chip .ci { font-size: 18px; }

  /* ── MAP ── */
  .map-container {
    position: relative;
    overflow: hidden;
    background: #0d1f35;
  }
  .map-container::before {
    content: '';
    position: absolute; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 80% 60% at 30% 50%, rgba(20,50,90,0.4) 0%, transparent 70%),
      radial-gradient(ellipse 60% 80% at 70% 30%, rgba(10,30,60,0.3) 0%, transparent 60%);
  }

  .map-svg-wrap {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
  }

  /* Region paths */
  .region-path {
    cursor: pointer;
    transition: opacity 0.2s, filter 0.2s;
  }
  .region-path:hover {
    filter: brightness(1.25) saturate(1.3);
  }
  .region-path.active {
    filter: brightness(1.3) saturate(1.4);
  }
  .region-path.dimmed {
    opacity: 0.3;
  }

  /* Tooltip */
  .map-tooltip {
    position: absolute;
    pointer-events: none;
    background: rgba(8,16,30,0.95);
    border: 1px solid rgba(200,160,60,0.35);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 12px;
    white-space: nowrap;
    transform: translate(-50%, -110%);
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    z-index: 50;
  }
  .tt-name {
    font-family: 'Playfair Display', serif;
    font-size: 14px;
    color: #c9a84c;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .tt-sub { color: rgba(200,190,165,0.65); font-size: 10px; font-weight: 300; }

  /* Map scale */
  .map-scale {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    pointer-events: none;
    z-index: 10;
  }
  .scale-bar-track {
    display: flex;
    height: 5px;
    border-radius: 2px;
    overflow: hidden;
    width: 100px;
    border: 1px solid rgba(100,150,200,0.3);
  }
  .scale-seg { flex: 1; }
  .scale-seg:nth-child(odd) { background: rgba(120,170,220,0.6); }
  .scale-seg:nth-child(even) { background: rgba(255,255,255,0.5); }
  .scale-lbl {
    font-size: 8px;
    color: rgba(120,160,200,0.6);
    letter-spacing: 1px;
  }

  /* Compass */
  .compass {
    position: absolute;
    bottom: 16px;
    right: 16px;
    pointer-events: none;
    z-index: 10;
  }

  /* ── RIGHT PANEL — REGION CARD ── */
  .region-placeholder {
    text-align: center;
    padding: 24px 8px;
    color: rgba(150,140,120,0.5);
    font-size: 11px;
    font-weight: 300;
    line-height: 2;
    border: 1px dashed rgba(200,160,60,0.12);
    border-radius: 10px;
  }
  .region-placeholder .ph-icon { font-size: 28px; margin-bottom: 8px; opacity: 0.5; }

  .region-card { display: flex; flex-direction: column; gap: 0; }
  .rc-header {
    background: linear-gradient(135deg, rgba(200,160,60,0.15), rgba(200,160,60,0.05));
    border: 1px solid rgba(200,160,60,0.2);
    border-radius: 10px 10px 0 0;
    padding: 14px 16px 12px;
    margin: -20px -16px 0;
  }
  .rc-name {
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    font-weight: 700;
    color: #f0e0b0;
    line-height: 1.1;
  }
  .rc-capital {
    font-size: 10px;
    color: rgba(200,160,60,0.6);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 4px;
    font-weight: 300;
  }
  .rc-body { padding: 12px 0 0; }
  .rc-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 7px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 11px;
  }
  .rc-key { color: rgba(160,150,130,0.7); font-weight: 300; }
  .rc-val { color: #e0d8c0; font-weight: 500; font-size: 11.5px; }

  .rc-crops {
    display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px;
  }
  .crop-chip {
    display: flex; align-items: center; gap: 5px;
    background: rgba(200,160,60,0.08);
    border: 1px solid rgba(200,160,60,0.18);
    border-radius: 20px;
    padding: 3px 9px;
    font-size: 10px;
    color: rgba(220,200,155,0.85);
    font-weight: 300;
  }

  .rc-fact {
    margin-top: 12px;
    background: rgba(255,255,255,0.03);
    border-left: 2px solid rgba(200,160,60,0.4);
    border-radius: 0 6px 6px 0;
    padding: 10px 12px;
    font-size: 11px;
    color: rgba(200,190,165,0.75);
    line-height: 1.6;
    font-weight: 300;
    font-style: italic;
  }

  /* Area ring chart */
  .area-visual {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
  }
  .area-label { font-size: 10px; color: rgba(180,165,130,0.7); font-weight: 300; line-height: 1.5; }

  /* Facts */
  .fact-card {
    background: rgba(200,160,60,0.05);
    border: 1px solid rgba(200,160,60,0.1);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 11px;
    color: rgba(210,200,175,0.8);
    line-height: 1.7;
    font-weight: 300;
  }
  .fact-btn {
    margin-top: 8px;
    width: 100%;
    padding: 7px;
    background: transparent;
    border: 1px solid rgba(200,160,60,0.2);
    border-radius: 7px;
    color: rgba(200,170,80,0.8);
    font-family: 'Sora', sans-serif;
    font-size: 10px;
    letter-spacing: 1px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
    font-weight: 400;
  }
  .fact-btn:hover { background: rgba(200,160,60,0.08); border-color: rgba(200,160,60,0.35); }

  /* Agri table */
  .agri-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 10.5px;
    font-weight: 300;
  }
  .agri-left { display:flex; align-items:center; gap:7px; color:rgba(200,190,165,0.75); }
  .agri-right { color: rgba(200,170,80,0.7); font-size: 10px; }

  /* Mode selector */
  .mode-btns {
    display:flex; gap:5px; margin-bottom:4px;
  }
  .mode-btn {
    flex:1; padding:6px 4px;
    background:transparent;
    border:1px solid rgba(200,160,60,0.15);
    border-radius:6px;
    color:rgba(180,165,130,0.6);
    font-family:'Sora',sans-serif;
    font-size:9px;
    letter-spacing:1px;
    cursor:pointer;
    text-transform:uppercase;
    transition:all 0.15s;
    font-weight:400;
  }
  .mode-btn.active {
    background:rgba(200,160,60,0.12);
    border-color:rgba(200,160,60,0.35);
    color:rgba(200,170,80,0.9);
  }

  @keyframes fadeIn {
    from { opacity:0; transform:translateY(6px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .fade-in { animation: fadeIn 0.35s ease; }

  @keyframes pulse-ring {
    0%   { r: 4; opacity:0.9; }
    100% { r: 12; opacity:0; }
  }
  .pulse-ring { animation: pulse-ring 2.2s ease-out infinite; }
`;

// ─── COMPONENT ───────────────────────────────────────────────
export default function MadagascarMap() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [factIdx, setFactIdx] = useState(0);
  const [colorMode, setColorMode] = useState("biome"); // biome | pop | elev | data
  const [dwCulture,  setDwCulture]  = useState("Riz");
  const [dwAnnee,    setDwAnnee]    = useState(2024);
  const [dwMetrique, setDwMetrique] = useState("rendement"); // rendement | production | prix
  const [dwOlap,     setDwOlap]     = useState("slice");     // slice | dice
  const [dwDice,     setDwDice]     = useState(["Riz"]);     // selected crops for DICE
  const [dims, setDims] = useState({ w: 600, h: 700 });
  const [paths, setPaths] = useState([]);
  const [centroids, setCentroids] = useState([]);
  const projectionRef = useRef(null);

  // Build D3 projection & paths
  useEffect(() => {
    const compute = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = rect.width || 600;
      const h = rect.height || 700;
      setDims({ w, h });

      const projection = d3.geoMercator()
        .center([46.8, -19.5])
        .scale(Math.min(w, h) * 2.1)
        .translate([w / 2, h / 2]);

      projectionRef.current = projection;
      const pathGen = d3.geoPath().projection(projection);

      const built = MADAGASCAR_GEOJSON.features.map(f => ({
        d: pathGen(f),
        centroid: pathGen.centroid(f),
        props: f.properties,
      }));
      setPaths(built);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Helper: DW value for a region ────────────────────────
  const getDwValue = useCallback((regionName) => {
    const rd = DW_DATA[regionName];
    if (!rd) return 0;
    const cultures = dwOlap === "dice" ? dwDice : [dwCulture];
    let total = 0, count = 0;
    for (const c of cultures) {
      const v = rd[c]?.[dwAnnee]?.[dwMetrique];
      if (v) { total += v; count++; }
    }
    return count > 0 ? total / count : 0;
  }, [dwCulture, dwAnnee, dwMetrique, dwOlap, dwDice]);

  // Calculate min/max across all regions for normalization
  const [dwMin, dwMax] = useMemo(() => {
    if (colorMode !== "data") return [0, 1];
    const vals = Object.keys(DW_DATA).map(r => getDwValue(r)).filter(v => v > 0);
    return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 1];
  }, [colorMode, getDwValue]);

  // Color per mode
  const getColor = useCallback((props) => {
    if (colorMode === "biome") return props.color || "#607050";
    if (colorMode === "pop") {
      const p = props.pop || 0;
      if (p > 2000) return "#e05030";
      if (p > 1200) return "#e07830";
      if (p > 800) return "#c8a040";
      if (p > 400) return "#88a040";
      return "#4a8050";
    }
    if (colorMode === "elev") {
      const e = props.elev || 0;
      if (e > 1200) return "#a09070";
      if (e > 800) return "#7a8060";
      if (e > 400) return "#607848";
      if (e > 150) return "#508038";
      return "#389050";
    }
    if (colorMode === "data") {
      const val = getDwValue(props.name);
      if (val <= 0) return "#1a2030"; // crop absent
      const t = dwMax > dwMin ? (val - dwMin) / (dwMax - dwMin) : 0;
      // Gradient: pale yellow (#ffffb2) → dark green (#006837)
      const r = Math.round(255 - t * 255);
      const g = Math.round(255 - t * (255 - 104));
      const b = Math.round(178 - t * 178);
      return `rgb(${r},${g},${b})`;
    }
    return props.color;
  }, [colorMode, getDwValue, dwMin, dwMax]);

  const handleRegionClick = (props) => {
    setSelected(prev => prev?.name === props.name ? null : props);
  };

  const ext = REGION_DATA[selected?.name] || {};

  return (
    <>
      <style>{styles}</style>
      <div className="mada-app">

        {/* ── HEADER ── */}
        <header className="mada-header">
          <div className="header-brand">
            <div className="header-flag">
              <div className="flag-white"/>
              <div style={{display:'flex',flexDirection:'column',flex:1}}>
                <div className="flag-red" style={{flex:1}}/>
                <div className="flag-green" style={{flex:1}}/>
              </div>
            </div>
            <div>
              <div className="header-title">Madagascar</div>
              <div className="header-subtitle">Interactive Educational Atlas · 22 Regions</div>
            </div>
          </div>
          <div className="header-stats">
            <div className="h-stat"><div className="h-stat-val">587k</div><div className="h-stat-lbl">km²</div></div>
            <div className="h-divider"/>
            <div className="h-stat"><div className="h-stat-val">22</div><div className="h-stat-lbl">Regions</div></div>
            <div className="h-divider"/>
            <div className="h-stat"><div className="h-stat-val">27.7M</div><div className="h-stat-lbl">Pop.</div></div>
            <div className="h-divider"/>
            <div className="h-stat"><div className="h-stat-val">4e</div><div className="h-stat-lbl">Largest Island</div></div>
          </div>
          <div className="header-badge">Real Map · GeoJSON</div>
        </header>

        {/* ── BODY ── */}
        <div className="mada-body">

          {/* ── LEFT PANEL ── */}
          <aside className="panel left">

            <div className="panel-block">
              <h4>Color Mode</h4>
              <div className="mode-btns">
                {[["biome","Biome"],["pop","Population"],["elev","Altitude"],["data","Agric. Data"]].map(([k,l]) => (
                  <button key={k} className={`mode-btn ${colorMode===k?"active":""}`} onClick={() => setColorMode(k)}>{l}</button>
                ))}
              </div>
            </div>

            {colorMode === "data" && (
              <div className="panel-block" style={{display:'flex',flexDirection:'column',gap:8}}>
                <h4>OLAP Filters</h4>

                {/* Crop selection */}
                <div>
                  <div style={{fontSize:9,color:'rgba(200,180,100,0.7)',marginBottom:3}}>Crop</div>
                  <select
                    value={dwCulture}
                    onChange={e => { setDwCulture(e.target.value); setDwOlap("slice"); }}
                    style={{width:'100%',background:'#1a2535',color:'#cccccc',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,padding:'3px 5px',fontSize:10}}
                  >
                    {DW_CULTURES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Year selection */}
                <div>
                  <div style={{fontSize:9,color:'rgba(200,180,100,0.7)',marginBottom:3}}>Year : <strong style={{color:'#e8c860'}}>{dwAnnee}</strong></div>
                  <input type="range" min={2020} max={2024} value={dwAnnee}
                    onChange={e => setDwAnnee(+e.target.value)}
                    style={{width:'100%',accentColor:'#e8c860'}}
                  />
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:8,color:'rgba(200,190,165,0.5)'}}>
                    <span>2020</span><span>2022</span><span>2024</span>
                  </div>
                </div>

                {/* Metric */}
                <div>
                  <div style={{fontSize:9,color:'rgba(200,180,100,0.7)',marginBottom:3}}>Metric</div>
                  <div style={{display:'flex',flexDirection:'column',gap:2}}>
                    {[["rendement","Yield (kg/ha)"],["production","Production (t)"],["prix","Price (Ar/kg)"]].map(([k,l]) => (
                      <button key={k} onClick={() => setDwMetrique(k)}
                        style={{background: dwMetrique===k ? '#1e4a30' : '#1a2535', color: dwMetrique===k ? '#4CAF50' : '#aaaaaa',
                          border:`1px solid ${dwMetrique===k ? '#4CAF50' : 'rgba(255,255,255,0.1)'}`, borderRadius:3, padding:'3px 6px', fontSize:9, cursor:'pointer', textAlign:'left'}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* OLAP Operations */}
                <div>
                  <div style={{fontSize:9,color:'rgba(200,180,100,0.7)',marginBottom:3}}>OLAP Operation</div>
                  <div style={{display:'flex',gap:3}}>
                    <button onClick={() => setDwOlap("slice")}
                      style={{flex:1,background: dwOlap==="slice" ? '#004466' : '#1a2535', color:'#cccccc',
                        border:'1px solid rgba(255,255,255,0.1)', borderRadius:3, padding:'3px 4px', fontSize:8, cursor:'pointer'}}>
                      SLICE
                    </button>
                    <button onClick={() => setDwOlap("dice")}
                      style={{flex:1,background: dwOlap==="dice" ? '#004422' : '#1a2535', color:'#cccccc',
                        border:'1px solid rgba(255,255,255,0.1)', borderRadius:3, padding:'3px 4px', fontSize:8, cursor:'pointer'}}>
                      DICE
                    </button>
                    <button onClick={() => { setDwOlap("slice"); setDwCulture("Riz"); setDwAnnee(2024); setDwMetrique("rendement"); setDwDice(["Riz"]); }}
                      style={{flex:1,background:'#222222', color:'#cccccc',
                        border:'1px solid rgba(255,255,255,0.1)', borderRadius:3, padding:'3px 4px', fontSize:8, cursor:'pointer'}}>
                      RESET
                    </button>
                  </div>
                </div>

                {/* Multi-crop for DICE */}
                {dwOlap === "dice" && (
                  <div>
                    <div style={{fontSize:9,color:'rgba(200,180,100,0.7)',marginBottom:3}}>DICE Crops</div>
                    <div style={{display:'flex',flexDirection:'column',gap:2}}>
                      {DW_CULTURES.map(c => (
                        <label key={c} style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                          <input type="checkbox" checked={dwDice.includes(c)}
                            onChange={e => setDwDice(prev => e.target.checked ? [...prev,c] : prev.filter(x=>x!==c))}
                            style={{accentColor:'#4CAF50'}}
                          />
                          <span style={{fontSize:9,color:'#cccccc'}}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Choropleth legend */}
                <div>
                  <div style={{fontSize:9,color:'rgba(200,180,100,0.7)',marginBottom:3}}>Legend</div>
                  <div style={{height:8,borderRadius:3,background:'linear-gradient(to right, #ffffb2, #006837)',marginBottom:3}}/>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:8,color:'rgba(200,190,165,0.6)'}}>
                    <span>{dwMin.toLocaleString('en')}</span>
                    <span>{Math.round((dwMin+dwMax)/2).toLocaleString('en')}</span>
                    <span>{dwMax.toLocaleString('en')}</span>
                  </div>
                  <div style={{textAlign:'center',fontSize:7,color:'rgba(150,150,150,0.5)',marginTop:2}}>Grey areas = crop absent</div>
                </div>
              </div>
            )}

            <div className="panel-block" style={{display: colorMode==='data' ? 'none' : undefined}}>
              <h4>Biomes</h4>
              {[
                ["#3da832","Humid Tropical Forest"],
                ["#786050","Highlands (C)"],
                ["#b87030","Spiny Forest (S)"],
                ["#509870","Coastal Mangroves (W)"],
                ["#907840","Western Savanna"],
                ["#708050","Transition Zone"],
              ].map(([c,l]) => (
                <div className="leg-row" key={l}>
                  <div className="leg-dot" style={{background:c}}/>
                  <span>{l}</span>
                </div>
              ))}
            </div>

            {colorMode !== "data" && (
            <div className="panel-block">
              <h4>Agriculture</h4>
              {[["🌾","Rice Paddies"],["🌿","Vanille (SAVA)"],["☕","Coffee Plants"],["🌱","Cassava"],["🌽","Corn"],["🌸","Clove Trees"],["🍉","Tropical Fruits"]].map(([e,l]) => (
                <div className="leg-row" key={l}>
                  <span className="leg-emoji">{e}</span>
                  <span>{l}</span>
                </div>
              ))}
            </div>
            )}

            {colorMode !== "data" && (
            <div className="panel-block">
              <h4>Climate</h4>
              <div className="climate-grid">
                {[["🌧","Humid Tropical (East)"],["☀️","Arid & Dry (South)"],["🌤","Temperate (Highlands)"],["🌫","Humid (West)"]].map(([e,l]) => (
                  <div className="climate-chip" key={l}>
                    <span className="ci">{e}</span>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            )}

            {colorMode !== "data" && (
            <div className="panel-block">
              <h4>Top Population</h4>
              {topPop.map(r => (
                <div className="pop-row" key={r.name}>
                  <span className="pop-name">{r.name}</span>
                  <div className="pop-track">
                    <div className="pop-fill" style={{width:`${(r.pop/3567)*100}%`}}/>
                  </div>
                  <span className="pop-val">{r.pop>999?`${(r.pop/1000).toFixed(1)}M`:`${r.pop}k`}</span>
                </div>
              ))}
            </div>
            )}

          </aside>

          {/* ── MAP ── */}
          <main className="map-container" ref={containerRef}>
            <div className="map-svg-wrap">
              <svg
                ref={svgRef}
                width={dims.w}
                height={dims.h}
                style={{display:"block"}}
              >
                {/* Ocean gradient */}
                <defs>
                  <radialGradient id="oceanGrad" cx="40%" cy="45%" r="65%">
                    <stop offset="0%" stopColor="#1e3d62"/>
                    <stop offset="50%" stopColor="#14304f"/>
                    <stop offset="100%" stopColor="#0a1f38"/>
                  </radialGradient>
                  <radialGradient id="shallowGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#2a5080" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="transparent"/>
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <filter id="shadow">
                    <feDropShadow dx="1" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)"/>
                  </filter>
                </defs>

                {/* Ocean */}
                <rect width={dims.w} height={dims.h} fill="url(#oceanGrad)"/>

                {/* Ocean grid */}
                {[0.2,0.4,0.6,0.8].map(t => (
                  <line key={`h${t}`} x1={0} y1={dims.h*t} x2={dims.w} y2={dims.h*t}
                    stroke="rgba(100,160,220,0.06)" strokeWidth={1}/>
                ))}
                {[0.25,0.5,0.75].map(t => (
                  <line key={`v${t}`} x1={dims.w*t} y1={0} x2={dims.w*t} y2={dims.h}
                    stroke="rgba(100,160,220,0.06)" strokeWidth={1}/>
                ))}

                {/* Ocean labels */}
                <text x={dims.w*0.12} y={dims.h*0.45}
                  fontFamily="Georgia, serif" fontSize={13} fontStyle="italic"
                  fill="rgba(100,160,210,0.28)" textAnchor="middle" letterSpacing={3}>
                  Indian Ocean
                </text>
                <text x={dims.w*0.88} y={dims.h*0.35}
                  fontFamily="Georgia, serif" fontSize={11} fontStyle="italic"
                  fill="rgba(100,160,210,0.22)" textAnchor="middle" letterSpacing={2}>
                  Mozambique
                </text>
                <text x={dims.w*0.88} y={dims.h*0.35+16}
                  fontFamily="Georgia, serif" fontSize={11} fontStyle="italic"
                  fill="rgba(100,160,210,0.22)" textAnchor="middle" letterSpacing={2}>
                  Channel
                </text>

                {/* ── REGION PATHS ── */}
                {paths.map((p, i) => {
                  if (!p.d) return null;
                  const props = p.props;
                  const isActive = selected?.name === props.name;
                  const isDimmed = selected && !isActive;
                  const color = getColor(props);
                  return (
                    <g key={props.name}>
                      {/* Shadow */}
                      <path d={p.d} fill="rgba(0,0,0,0.25)" transform="translate(2,3)" style={{pointerEvents:"none"}}/>
                      {/* Main fill */}
                      <path
                        d={p.d}
                        fill={color}
                        stroke={isActive ? "rgba(255,220,100,0.9)" : "rgba(255,255,255,0.18)"}
                        strokeWidth={isActive ? 2 : 0.8}
                        className={`region-path ${isActive?"active":""} ${isDimmed?"dimmed":""}`}
                        style={{
                          transition:"opacity 0.2s, filter 0.2s",
                          filter: isActive ? "brightness(1.3) saturate(1.4)" : hovered===props.name ? "brightness(1.2) saturate(1.25)" : "none",
                          opacity: isDimmed ? 0.3 : 1,
                          animationDelay:`${i*0.03}s`
                        }}
                        onClick={() => handleRegionClick(props)}
                        onMouseEnter={(e) => {
                          setHovered(props.name);
                          const rect = containerRef.current.getBoundingClientRect();
                          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        }}
                        onMouseMove={(e) => {
                          const rect = containerRef.current.getBoundingClientRect();
                          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        }}
                        onMouseLeave={() => setHovered(null)}
                      />
                      {/* Region label */}
                      {p.centroid && (
                        <text
                          x={p.centroid[0]}
                          y={p.centroid[1]}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={props.area > 40000 ? 9 : props.area > 20000 ? 8 : 7}
                          fontFamily="Sora, sans-serif"
                          fontWeight="600"
                          fill="rgba(255,255,255,0.9)"
                          letterSpacing="0.3px"
                          style={{pointerEvents:"none", paintOrder:"stroke", stroke:"rgba(0,0,0,0.5)", strokeWidth:"3px", textTransform:"uppercase"}}
                        >
                          {props.area < 8000 ? props.name.split(" ")[0] : props.name}
                        </text>
                      )}
                      {/* Weather icon */}
                      {p.centroid && props.area > 15000 && (
                        <text
                          x={p.centroid[0] + (props.area > 30000 ? 12 : 9)}
                          y={p.centroid[1] - 12}
                          fontSize={props.area > 40000 ? 13 : 11}
                          textAnchor="middle"
                          style={{pointerEvents:"none"}}
                        >
                          {weatherEmoji[props.climate]}
                        </text>
                      )}
                      {/* Crop icon */}
                      {p.centroid && props.area > 18000 && props.crops?.[0] && (
                        <text
                          x={p.centroid[0]}
                          y={p.centroid[1] + 13}
                          fontSize={10}
                          textAnchor="middle"
                          style={{pointerEvents:"none", opacity:0.85}}
                        >
                          {props.crops.slice(0,2).join(" ")}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* ── CAPITAL MARKER ── */}
                {projectionRef.current && (() => {
                  const pt = projectionRef.current([47.52, 18.91]);
                  if (!pt) return null;
                  return (
                    <g key="capital">
                      <circle cx={pt[0]} cy={pt[1]} r={8} fill="none" stroke="rgba(255,210,80,0.5)" strokeWidth={1} className="pulse-ring"/>
                      <circle cx={pt[0]} cy={pt[1]} r={5} fill="rgba(8,16,30,0.9)" stroke="#c9a84c" strokeWidth={2}/>
                      <circle cx={pt[0]} cy={pt[1]} r={2.5} fill="#e8c860"/>
                      <text x={pt[0]+10} y={pt[1]-7}
                        fontFamily="Sora, sans-serif" fontSize={9} fontWeight="600"
                        fill="rgba(230,200,120,0.9)"
                        style={{paintOrder:"stroke", stroke:"rgba(0,0,0,0.8)", strokeWidth:"3px"}}>
                        Antananarivo ★
                      </text>
                    </g>
                  );
                })()}

                {/* ── CITY DOTS ── */}
                {projectionRef.current && [
                  [49.35, 18.15, "Toamasina"],
                  [46.32, 23.35, "Toliara"],
                  [46.02, 14.52, "Mahajanga"],
                  [47.0, 21.45, "Tôlanaro"],
                ].map(([lng, lat, name]) => {
                  const pt = projectionRef.current([lng, lat]);
                  if (!pt) return null;
                  return (
                    <g key={name}>
                      <circle cx={pt[0]} cy={pt[1]} r={3} fill="rgba(220,200,160,0.7)" stroke="rgba(0,0,0,0.4)" strokeWidth={1}/>
                      <text x={pt[0]+6} y={pt[1]+3} fontFamily="Sora, sans-serif" fontSize={8}
                        fill="rgba(200,190,165,0.7)"
                        style={{paintOrder:"stroke", stroke:"rgba(0,0,0,0.6)", strokeWidth:"2.5px", pointerEvents:"none"}}>
                        {name}
                      </text>
                    </g>
                  );
                })}

                {/* ── NOSY BE ISLAND ── */}
                {projectionRef.current && (() => {
                  const pt = projectionRef.current([48.32, 13.33]);
                  return pt ? (
                    <g>
                      <ellipse cx={pt[0]} cy={pt[1]} rx={10} ry={7} fill="#3da832" stroke="rgba(255,255,255,0.2)" strokeWidth={0.8}/>
                      <text x={pt[0]} y={pt[1]+1} textAnchor="middle" dominantBaseline="middle"
                        fontSize={6} fontFamily="Sora, sans-serif" fontWeight="600"
                        fill="rgba(255,255,255,0.85)" style={{pointerEvents:"none", paintOrder:"stroke", stroke:"rgba(0,0,0,0.5)", strokeWidth:"2px", textTransform:"uppercase", letterSpacing:"0.3px"}}>
                        NOSY BE
                      </text>
                    </g>
                  ) : null;
                })()}

              </svg>
            </div>

            {/* Tooltip */}
            {hovered && (
              <div className="map-tooltip" style={{left:tooltipPos.x, top:tooltipPos.y}}>
                <div className="tt-name">{hovered}</div>
                <div className="tt-sub">Click for details</div>
              </div>
            )}

            {/* Scale */}
            <div className="map-scale">
              <div className="scale-bar-track">
                <div className="scale-seg"/><div className="scale-seg"/>
                <div className="scale-seg"/><div className="scale-seg"/>
              </div>
              <div className="scale-lbl">0 · · · 300 km</div>
            </div>

            {/* Compass */}
            <div className="compass">
              <svg width={48} height={48} viewBox="0 0 48 48">
                <circle cx={24} cy={24} r={22} fill="rgba(8,16,30,0.85)" stroke="rgba(200,160,60,0.25)" strokeWidth={1}/>
                <polygon points="24,6 21,22 24,19 27,22" fill="#c9a84c"/>
                <polygon points="24,42 21,26 24,29 27,26" fill="rgba(180,170,150,0.5)"/>
                <line x1={6} y1={24} x2={42} y2={24} stroke="rgba(200,160,60,0.15)" strokeWidth={1}/>
                <text x={24} y={5} textAnchor="middle" fontSize={9} fontWeight="700" fill="#c9a84c" fontFamily="Sora,sans-serif">N</text>
                <text x={24} y={46} textAnchor="middle" fontSize={8} fill="rgba(160,150,130,0.6)" fontFamily="Sora,sans-serif">S</text>
                <text x={3} y={27} textAnchor="middle" fontSize={8} fill="rgba(160,150,130,0.6)" fontFamily="Sora,sans-serif">W</text>
                <text x={45} y={27} textAnchor="middle" fontSize={8} fill="rgba(160,150,130,0.6)" fontFamily="Sora,sans-serif">E</text>
              </svg>
            </div>
          </main>

          {/* ── RIGHT PANEL ── */}
          <aside className="panel right">

            <div className="panel-block">
              <h4>Selected Region</h4>
              {!selected ? (
                <div className="region-placeholder">
                  <div className="ph-icon">🗺️</div>
                  Click on a region<br/>to display its data
                </div>
              ) : colorMode === "data" ? (
                <div className="region-card fade-in" key={selected.name + dwAnnee}>
                  <div className="rc-header">
                    <div className="rc-name">{selected.name}</div>
                    <div className="rc-capital">{dwAnnee} · {dwMetrique === "rendement" ? "kg/ha" : dwMetrique === "production" ? "tonnes" : "Ar/kg"}</div>
                  </div>
                  <div style={{overflowX:'auto',marginTop:6}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}>
                      <thead>
                        <tr>
                          {["Crop","Yield","Prod.","Price"].map(h => (
                            <th key={h} style={{padding:'3px 4px',color:'rgba(200,180,100,0.8)',textAlign:'right',borderBottom:'1px solid rgba(255,255,255,0.1)',whiteSpace:'nowrap'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DW_CULTURES.map(culture => {
                          const d = DW_DATA[selected.name]?.[culture]?.[dwAnnee];
                          if (!d) return null;
                          return (
                            <tr key={culture} style={{background: culture===dwCulture ? 'rgba(76,175,80,0.1)' : 'transparent'}}>
                              <td style={{padding:'3px 4px',color: culture===dwCulture ? '#4CAF50' : '#cccccc',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>{culture}</td>
                              <td style={{padding:'3px 4px',color:'#aaaaaa',textAlign:'right',borderBottom:'1px solid rgba(255,255,255,0.05)',whiteSpace:'nowrap'}}>{d.rendement.toLocaleString('en')}</td>
                              <td style={{padding:'3px 4px',color:'#aaaaaa',textAlign:'right',borderBottom:'1px solid rgba(255,255,255,0.05)',whiteSpace:'nowrap'}}>{d.production.toLocaleString('en')}</td>
                              <td style={{padding:'3px 4px',color:'#aaaaaa',textAlign:'right',borderBottom:'1px solid rgba(255,255,255,0.05)',whiteSpace:'nowrap'}}>{d.prix.toLocaleString('en')}</td>
                            </tr>
                          );
                        })}
                        {!DW_DATA[selected.name] && (
                          <tr><td colSpan={4} style={{color:'rgba(200,100,100,0.7)',padding:'6px',textAlign:'center',fontSize:9}}>No data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {ext.funFact && <div className="rc-fact" style={{marginTop:6}}>💡 {ext.funFact}</div>}
                </div>
              ) : (
                <div className="region-card fade-in" key={selected.name}>
                  <div className="rc-header">
                    <div className="rc-name">{selected.name}</div>
                    <div className="rc-capital">Capital : {selected.capital}</div>
                  </div>
                  <div className="rc-body">
                    <div className="rc-row"><span className="rc-key">Area</span><span className="rc-val">{selected.area?.toLocaleString('en')} km²</span></div>
                    <div className="rc-row"><span className="rc-key">Population</span><span className="rc-val">~{selected.pop?.toLocaleString('en')}k inhab.</span></div>
                    <div className="rc-row"><span className="rc-key">Biome</span><span className="rc-val">{ext.biomeLabel || selected.biome}</span></div>
                    <div className="rc-row"><span className="rc-key">Climate</span><span className="rc-val">{ext.climateLabel || selected.climate}</span></div>
                    <div className="rc-row"><span className="rc-key">Avg. Elevation</span><span className="rc-val">{selected.elev} m</span></div>
                    <div className="rc-row"><span className="rc-key">Crops</span><span className="rc-val">{selected.crops?.length} types</span></div>
                  </div>
                  <div className="rc-crops">
                    {selected.crops?.map(c => (
                      <div className="crop-chip" key={c}>
                        <span>{c}</span><span>{cropLabels[c]}</span>
                      </div>
                    ))}
                  </div>
                  {ext.funFact && <div className="rc-fact">💡 {ext.funFact}</div>}
                </div>
              )}
            </div>

            <div className="panel-block">
              <h4>Agriculture & Exports</h4>
              {[
                ["🌾","Rice (rice cultivation)","16/22 regions"],
                ["🌿","Vanille (SAVA)","80% global"],
                ["☕","Arabica Coffee","6 regions"],
                ["🌱","Cassava","12 regions"],
                ["🌸","Clove Trees","NE Zone"],
                ["🍉","Tropical Fruits","East Coast"],
              ].map(([e,l,r]) => (
                <div className="agri-row" key={l}>
                  <div className="agri-left"><span>{e}</span><span>{l}</span></div>
                  <span className="agri-right">{r}</span>
                </div>
              ))}
            </div>

            <div className="panel-block">
              <h4>Did You Know?</h4>
              <div className="fact-card fade-in" key={factIdx}>
                {funFacts[factIdx]}
              </div>
              <button className="fact-btn" onClick={() => setFactIdx(i => (i+1)%funFacts.length)}>
                Next fact →
              </button>
            </div>

            <div className="panel-block">
              <h4>Climate Zones</h4>
              {[
                ["#e8c860","55%","Arid & Dry (S & W)"],
                ["#3da832","25%","Humid Tropical (E)"],
                ["#786050","12%","Temperate (Highlands)"],
                ["#509870","8%","Humid (W Mangroves)"],
              ].map(([c,p,l]) => (
                <div key={l} style={{marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3,color:"rgba(200,190,165,0.7)",fontWeight:300}}>
                    <span>{l}</span><span style={{color:"rgba(200,170,80,0.7)"}}>{p}</span>
                  </div>
                  <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:p,background:c,borderRadius:2,opacity:0.8}}/>
                  </div>
                </div>
              ))}
            </div>

          </aside>
        </div>
      </div>
    </>
  );
}