import type { Threshold } from '../types';

export const getColor = (value: number | undefined, thresholds: Threshold[], noDataColor: string): string => {
  if (value === undefined || Number.isNaN(value)) {
    return noDataColor;
  }

  const found = thresholds.find((threshold) => value >= threshold.min && value <= threshold.max);
  return found?.color ?? noDataColor;
};

export const getThresholdLabel = (value: number | undefined, thresholds: Threshold[]): string => {
  if (value === undefined || Number.isNaN(value)) {
    return 'Sem dados';
  }

  const found = thresholds.find((threshold) => value >= threshold.min && value <= threshold.max);
  return found?.label ?? 'Fora da escala';
};
