import type { Threshold } from '../types';

type LegendProps = {
  thresholds: Threshold[];
  noDataColor: string;
  enabled?: boolean;
};

export const Legend = ({ thresholds, noDataColor, enabled = true }: LegendProps) => {
  if (!enabled) {
    return null;
  }

  return (
    <div aria-label="Legenda do mapa" className="legend">
      {thresholds.map((threshold) => (
        <div className="legend-row" key={`${threshold.min}-${threshold.max}`}>
          <span className="legend-color" style={{ backgroundColor: threshold.color }} />
          <span>{threshold.label}</span>
          <small>
            {threshold.min}–{threshold.max}
          </small>
        </div>
      ))}
      <div className="legend-row">
        <span className="legend-color" style={{ backgroundColor: noDataColor }} />
        <span>Sem dados</span>
      </div>
    </div>
  );
};
