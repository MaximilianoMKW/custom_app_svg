import { useMemo, useState } from 'react';
import mapSvgAsset from './assets/portugal.svg?raw';
import { ChoroplethSvgMap } from './components/ChoroplethSvgMap';
import { SettingsPanel } from './components/SettingsPanel';
import { useDynatraceRegionData } from './hooks/useDynatraceRegionData';
import type { RegionDatum, Threshold } from './types';
import './styles.css';

const defaultThresholds: Threshold[] = [
  { min: 0, max: 49, color: '#dbeafe', label: 'Baixo' },
  { min: 50, max: 79, color: '#60a5fa', label: 'Médio' },
  { min: 80, max: 100, color: '#1d4ed8', label: 'Alto' }
];

const numberFormatter = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 });

function App() {
  const [svgInput, setSvgInput] = useState(mapSvgAsset);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [unit, setUnit] = useState('%');
  const [showLegend, setShowLegend] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<RegionDatum | null>(null);
  const [regionIdAttribute, setRegionIdAttribute] = useState('id');

  const { data, loading, error } = useDynatraceRegionData(false);

  const topRegions = useMemo(
    () => [...data].sort((a, b) => b.value - a.value).slice(0, 5),
    [data]
  );

  return (
    <main className="layout">
      <section>
        <h1>Dynatrace SVG Choropleth App</h1>
        {loading && <p>A carregar dados...</p>}
        {error && <p>Erro ao carregar dados: {error}</p>}
        {!loading && !error && data.length === 0 && <p>Sem dados para exibir.</p>}

        <ChoroplethSvgMap
          svg={svgInput}
          data={data}
          thresholds={thresholds}
          regionSelector={{ selector: 'path, polygon, g', regionIdAttribute }}
          unit={unit}
          legend={showLegend}
          onRegionClick={setSelectedRegion}
          tooltipFormatter={(region, thresholdLabel) =>
            `${region?.label ?? region?.regionId ?? 'Região'} | ${
              region ? numberFormatter.format(region.value) : 'Sem dados'
            } ${unit} | ${thresholdLabel}`
          }
        />
      </section>

      <section className="side-panel">
        <SettingsPanel
          svgInput={svgInput}
          setSvgInput={setSvgInput}
          thresholdInput={thresholds}
          setThresholdInput={setThresholds}
          unit={unit}
          setUnit={setUnit}
          showLegend={showLegend}
          setShowLegend={setShowLegend}
          regionIdAttribute={regionIdAttribute}
          setRegionIdAttribute={setRegionIdAttribute}
        />

        <div className="summary">
          <h3>Top regiões</h3>
          <table>
            <thead>
              <tr>
                <th>Região</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {topRegions.map((item) => (
                <tr key={item.regionId}>
                  <td>{item.label ?? item.regionId}</td>
                  <td>
                    {numberFormatter.format(item.value)} {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Selecionada: {selectedRegion?.label ?? selectedRegion?.regionId ?? 'Nenhuma'}
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;
