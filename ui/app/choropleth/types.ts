export type RegionDatum = {
  regionId: string;
  value: number;
  label?: string;
  thresholds?: Threshold[];
};

export type Threshold = {
  min: number;
  max: number;
  color: string;
  label: string;
};

export type RegionSelectorConfig = {
  selector: string;
  regionIdAttribute?: string;
};

export type RegionVisualStyle = {
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  filter?: string;
  transform?: string;
};
