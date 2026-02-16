import { useState } from 'react';
import type { Threshold } from '../types';

type SettingsPanelProps = {
  svgInput: string;
  setSvgInput: (value: string) => void;
  thresholdInput: Threshold[];
  setThresholdInput: (value: Threshold[]) => void;
  unit: string;
  setUnit: (value: string) => void;
  showLegend: boolean;
  setShowLegend: (value: boolean) => void;
  regionIdAttribute: string;
  setRegionIdAttribute: (value: string) => void;
};

export const SettingsPanel = ({
  svgInput,
  setSvgInput,
  thresholdInput,
  setThresholdInput,
  unit,
  setUnit,
  showLegend,
  setShowLegend,
  regionIdAttribute,
  setRegionIdAttribute
}: SettingsPanelProps) => {
  const [rawThresholds, setRawThresholds] = useState(JSON.stringify(thresholdInput, null, 2));

  const applyThresholds = () => {
    try {
      const parsed = JSON.parse(rawThresholds) as Threshold[];
      setThresholdInput(parsed);
    } catch (error) {
      console.error('Threshold JSON inválido', error);
    }
  };

  return (
    <aside className="settings">
      <h3>Configurações</h3>
      <label>
        Unidade
        <input value={unit} onChange={(event) => setUnit(event.target.value)} />
      </label>
      <label>
        Atributo do regionId
        <input value={regionIdAttribute} onChange={(event) => setRegionIdAttribute(event.target.value)} />
      </label>
      <label>
        Mostrar legenda
        <input
          type="checkbox"
          checked={showLegend}
          onChange={(event) => setShowLegend(event.target.checked)}
        />
      </label>
      <label>
        SVG inline
        <textarea rows={10} value={svgInput} onChange={(event) => setSvgInput(event.target.value)} />
      </label>
      <label>
        Thresholds (JSON)
        <textarea rows={10} value={rawThresholds} onChange={(event) => setRawThresholds(event.target.value)} />
      </label>
      <button onClick={applyThresholds}>Aplicar thresholds</button>
    </aside>
  );
};
