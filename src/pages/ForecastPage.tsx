import React, { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/Accordion';
import { Sparkles, ArrowUpRight } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Primitives — flat statskog/nature style
   ───────────────────────────────────────────────────────────── */
function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      className="flex items-center gap-3 cursor-pointer py-1.5 group"
      onClick={onChange}
    >
      <span
        style={{
          width: 14, height: 14,
          flexShrink: 0,
          borderRadius: '50%',
          background: checked ? '#4DFF91' : 'transparent',
          border: checked ? '1px solid #4DFF91' : '1px solid rgba(255,255,255,0.20)',
          boxShadow: checked ? '0 0 10px rgba(77,255,145,0.45)' : 'none',
          animation: checked ? 'biolum 2.4s ease-in-out infinite' : 'none',
          transition: 'all 0.18s ease',
        }}
      />
      <span
        className="select-none text-[14px]"
        style={{
          color: checked ? '#FFFFFF' : 'rgba(255,255,255,0.62)',
          fontWeight: checked ? 500 : 400,
          letterSpacing: '-0.005em',
          transition: 'color 0.18s ease',
        }}
      >
        {label}
      </span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <p
        className="mb-3"
        style={{
          fontSize: 10, fontWeight: 600,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.42)',
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

const flatInput: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid var(--border-subtle)',
  borderRadius: 0,
  color: '#FFFFFF',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

/* ─────────────────────────────────────────────────────────────
   Data
   ───────────────────────────────────────────────────────────── */
const REGIONS = [
  'Analamanga','Alaotra-Mangoro','Menabe','Atsimo-Andrefana','Sava','Diana',
  'Boeny','Vakinankaratra',"Amoron'i Mania",'Haute Matsiatra','Ihorombe',
  'Atsimo-Atsinanana','Atsinanana','Analanjirofo','Sofia','Betsiboka',
  'Melaky','Vatovavy','Fitovinany','Androy',
];

/* ─────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────── */
export function ForecastPage() {
  const [region, setRegion]           = useState('');
  const [altitude, setAltitude]       = useState('');
  const [soilType, setSoilType]       = useState<string[]>([]);
  const [cultureMode, setCultureMode] = useState<string[]>([]);
  const [superficie, setSuperficie]   = useState('');
  const [culture, setCulture]         = useState<string[]>([]);
  const [variete, setVariete]         = useState('');
  const [agePlants, setAgePlants]     = useState('');
  const [saison, setSaison]           = useState<string[]>([]);
  const [meteo, setMeteo]             = useState<string[]>([]);
  const [problemes, setProblemes]     = useState<string[]>([]);
  const [objectifs, setObjectifs]     = useState<string[]>([]);
  const [loading, setLoading]         = useState(false);

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  // Count filled fields for the data-coverage indicator
  const totalFields = 12;
  const filled = [
    region, altitude, soilType.length > 0 ? '1' : '', cultureMode.length > 0 ? '1' : '',
    superficie, culture.length > 0 ? '1' : '', variete, agePlants,
    saison.length > 0 ? '1' : '', meteo.length > 0 ? '1' : '',
    problemes.length > 0 ? '1' : '', objectifs.length > 0 ? '1' : '',
  ].filter(Boolean).length;

  const handleGenerate = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg-deep)' }}
    >
      <div
        className="relative flex flex-col h-full overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
      >
        {/* ── Hero header — statskog style ── */}
        <div
          style={{
            padding: '40px 56px 28px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <p
            style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
              margin: 0, marginBottom: 10,
            }}
          >
            Prévisions · Madagascar
          </p>
          <h1
            style={{
              fontSize: 'clamp(40px, 5vw, 64px)',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.045em',
              lineHeight: 0.95,
              color: '#FFFFFF',
              margin: 0,
              marginBottom: 14,
            }}
          >
            Prévision <span style={{ color: 'rgba(255,255,255,0.30)', fontWeight: 400 }}>agricole</span>
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 15,
              lineHeight: 1.5,
              maxWidth: 540,
              margin: 0,
              marginBottom: 16,
              fontFamily: 'var(--font-body)',
            }}
          >
            Détaillez votre parcelle et votre culture — l'IA génère une prévision adaptée à Madagascar.
          </p>

          {/* Coverage indicator — biolum dot + count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 5, height: 5, borderRadius: '50%',
                background: filled === totalFields ? '#4DFF91' : 'rgba(255,255,255,0.45)',
                animation: 'biolum 2.4s ease-in-out infinite',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.50)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {filled} / {totalFields} sections renseignées
            </span>
          </div>
        </div>

        {/* ── Form — accordion ── */}
        <div className="flex flex-col w-full" style={{ padding: '32px 56px 48px' }}>
          <div className="w-full" style={{ maxWidth: 720, margin: '0 auto' }}>

            <Accordion type="multiple" className="w-full mb-8">

              <AccordionItem value="parcelle" className="py-2">
                <AccordionTrigger>Ma parcelle / Ma zone</AccordionTrigger>
                <AccordionContent>
                  <div>
                    <Section title="Région">
                      <select
                        value={region}
                        onChange={e => setRegion(e.target.value)}
                        style={flatInput}
                      >
                        <option value="">Sélectionner une région…</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Section>

                    <Section title="Altitude">
                      {['Basse altitude (< 400m)','Moyenne altitude (400–800m)','Haute altitude (> 800m)'].map(v => (
                        <Checkbox key={v} label={v} checked={altitude === v} onChange={() => setAltitude(altitude === v ? '' : v)} />
                      ))}
                    </Section>

                    <Section title="Type de sol">
                      {['Sol alluvial','Sol argileux','Sol rouge des hautes terres','Sol volcanique','Sol sableux','Autre'].map(v => (
                        <Checkbox key={v} label={v} checked={soilType.includes(v)} onChange={() => toggle(soilType, v, setSoilType)} />
                      ))}
                    </Section>

                    <Section title="Mode de culture">
                      {['Irrigué','Pluvial (pluie seulement)','Bas-fond'].map(v => (
                        <Checkbox key={v} label={v} checked={cultureMode.includes(v)} onChange={() => toggle(cultureMode, v, setCultureMode)} />
                      ))}
                    </Section>

                    <Section title="Superficie (ha)">
                      <input
                        type="number"
                        value={superficie}
                        onChange={e => setSuperficie(e.target.value)}
                        placeholder="2.5"
                        style={flatInput}
                      />
                    </Section>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="culture" className="py-2">
                <AccordionTrigger>Culture et variété</AccordionTrigger>
                <AccordionContent>
                  <div>
                    <Section title="Culture concernée">
                      {['Riz','Café (Arabica / Robusta)','Vanille','Manioc','Maïs','Girofle','Litchi'].map(v => (
                        <Checkbox key={v} label={v} checked={culture.includes(v)} onChange={() => toggle(culture, v, setCulture)} />
                      ))}
                    </Section>

                    <Section title="Variété">
                      <input
                        type="text"
                        value={variete}
                        onChange={e => setVariete(e.target.value)}
                        placeholder="FOFIFA 154, Bourbon…"
                        style={flatInput}
                      />
                    </Section>

                    <Section title="Âge des plants (café / vanille)">
                      {['Jeunes (< 3 ans)','Adultes (3–15 ans)','Vieux (> 15 ans)'].map(v => (
                        <Checkbox key={v} label={v} checked={agePlants === v} onChange={() => setAgePlants(agePlants === v ? '' : v)} />
                      ))}
                    </Section>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="meteo" className="py-2">
                <AccordionTrigger>Conditions et météo</AccordionTrigger>
                <AccordionContent>
                  <div>
                    <Section title="Saison actuelle">
                      {['Saison des pluies','Saison sèche','Période de semis','Période de récolte'].map(v => (
                        <Checkbox key={v} label={v} checked={saison.includes(v)} onChange={() => toggle(saison, v, setSaison)} />
                      ))}
                    </Section>

                    <Section title="Prévisions météo (4–8 semaines)">
                      {['Pluie abondante attendue','Pluie normale','Pluie faible / Sécheresse','Risque de cyclone / fortes pluies'].map(v => (
                        <Checkbox key={v} label={v} checked={meteo.includes(v)} onChange={() => toggle(meteo, v, setMeteo)} />
                      ))}
                    </Section>

                    <Section title="Problèmes observés">
                      {["Attaques de maladies (pyriculariose, RYMV, rouille…)","Attaques d'insectes","Manque d'eau","Excès d'eau / inondation","Carence en nutriments"].map(v => (
                        <Checkbox key={v} label={v} checked={problemes.includes(v)} onChange={() => toggle(problemes, v, setProblemes)} />
                      ))}
                    </Section>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="objectifs" className="py-2">
                <AccordionTrigger>Objectifs (optionnel)</AccordionTrigger>
                <AccordionContent>
                  <div>
                    {["Maximiser le rendement","Réduire le risque de maladie","Adapter au changement climatique","Améliorer la qualité pour l'export","Minimiser les coûts (intrants)"].map(v => (
                      <Checkbox key={v} label={v} checked={objectifs.includes(v)} onChange={() => toggle(objectifs, v, setObjectifs)} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            {/* Generate CTA — solid primary, no glow */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '16px 22px',
                background: loading ? 'rgba(77,255,145,0.30)' : '#4DFF91',
                color: '#001A10',
                border: 'none',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'opacity 0.18s ease, transform 0.18s ease',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                {loading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'rotate-ring 0.8s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50 100" strokeLinecap="round" />
                    </svg>
                    Génération en cours
                  </>
                ) : (
                  <>
                    <Sparkles size={14} strokeWidth={2.5} />
                    Générer la prévision
                  </>
                )}
              </span>
              {!loading && <ArrowUpRight size={15} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
