export type RegionDatum = {
  regionId: string;
  value: number;
  label?: string;
  meta?: Record<string, unknown>;
};

export type Threshold = {
  min: number;
  max: number;
  color: string;
  label: string;
};

export type RegionSelectorConfig = {
  selector: string;
  regionIdAttribute?: 'id' | 'data-region' | string;
};

export type NumberFormatConfig = {
  locale: string;
  maximumFractionDigits?: number;
};
