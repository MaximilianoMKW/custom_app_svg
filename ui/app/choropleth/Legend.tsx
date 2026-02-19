import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Paragraph, Strong } from "@dynatrace/strato-components/typography";
import type { Threshold } from "./types";

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
    <Flex className="choropleth-legend" flexDirection="column" gap={8} aria-label="Choropleth legend">
      <Strong className="choropleth-legend-title">Legend</Strong>
      {thresholds.map((threshold) => (
        <Flex className="choropleth-legend-row" key={`${threshold.min}-${threshold.max}`} gap={8} alignItems="center">
          <span
            className="choropleth-legend-swatch"
            style={{
              background: threshold.color,
            }}
          />
          <Paragraph className="choropleth-legend-label">
            {threshold.label}
            <span className="choropleth-legend-range">
              {threshold.min}-{threshold.max}
            </span>
          </Paragraph>
        </Flex>
      ))}
      <Flex className="choropleth-legend-row" gap={8} alignItems="center">
        <span
          className="choropleth-legend-swatch"
          style={{
            background: noDataColor,
          }}
        />
        <Paragraph className="choropleth-legend-label">No data</Paragraph>
      </Flex>
    </Flex>
  );
};
