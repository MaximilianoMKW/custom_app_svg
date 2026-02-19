import type { Threshold } from "./types";

export const getColor = (
  value: number | undefined,
  thresholds: Threshold[],
  noDataColor: string,
): string => {
  if (value === undefined || Number.isNaN(value)) {
    return noDataColor;
  }

  const match = thresholds.find(
    (threshold) => value >= threshold.min && value <= threshold.max,
  );
  return match?.color ?? noDataColor;
};

export const getThresholdLabel = (
  value: number | undefined,
  thresholds: Threshold[],
): string => {
  if (value === undefined || Number.isNaN(value)) {
    return "No data";
  }

  const match = thresholds.find(
    (threshold) => value >= threshold.min && value <= threshold.max,
  );
  return match?.label ?? "Out of range";
};

