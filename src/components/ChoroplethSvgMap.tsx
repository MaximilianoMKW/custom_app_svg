import { useEffect, useMemo, useRef, useState } from 'react';
import type { RegionDatum, RegionSelectorConfig, Threshold } from '../types';
import { getColor, getThresholdLabel } from '../lib/color';
import { extractRegionId, getRegionElements, sanitizeSvg } from '../lib/svg';
import { Legend } from './Legend';

type ChoroplethSvgMapProps = {
  svg: string;
  data: RegionDatum[];
  thresholds: Threshold[];
  regionSelector: RegionSelectorConfig;
  noDataColor?: string;
  defaultStroke?: string;
  strokeWidth?: number;
  unit?: string;
  legend?: boolean;
  onRegionClick?: (region: RegionDatum | null) => void;
  tooltipFormatter?: (region: RegionDatum | null, thresholdLabel: string) => string;
};

export const ChoroplethSvgMap = ({
  svg,
  data,
  thresholds,
  regionSelector,
  noDataColor = '#e5e7eb',
  defaultStroke = '#ffffff',
  strokeWidth = 1,
  unit = '',
  legend = true,
  onRegionClick,
  tooltipFormatter
}: ChoroplethSvgMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const dataById = useMemo(() => new Map(data.map((item) => [item.regionId, item])), [data]);
  const sanitizedSvg = useMemo(() => sanitizeSvg(svg), [svg]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const elements = getRegionElements(container, regionSelector);
    const existingIds = new Set<string>();

    elements.forEach((element) => {
      const regionId = extractRegionId(element, regionSelector);
      if (!regionId) {
        return;
      }

      existingIds.add(regionId);

      const datum = dataById.get(regionId);
      const color = getColor(datum?.value, thresholds, noDataColor);

      element.setAttribute('fill', color);
      element.setAttribute('stroke', defaultStroke);
      element.setAttribute('stroke-width', String(strokeWidth));
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute(
        'aria-label',
        `${datum?.label ?? regionId}: ${datum?.value ?? 'Sem dados'} ${unit}`.trim()
      );

      if (selectedRegionId && selectedRegionId === regionId) {
        element.setAttribute('stroke-width', String(strokeWidth + 1));
      }
    });

    data.forEach((item) => {
      if (!existingIds.has(item.regionId)) {
        console.warn(`[ChoroplethSvgMap] Region ID not found in SVG: ${item.regionId}`);
      }
    });
  }, [data, dataById, defaultStroke, noDataColor, regionSelector, selectedRegionId, strokeWidth, thresholds, unit]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const elements = getRegionElements(container, regionSelector);

    const handleMouseEnter = (event: Event) => {
      const target = event.currentTarget as Element;
      const regionId = extractRegionId(target, regionSelector);
      if (!regionId) return;

      const datum = dataById.get(regionId) ?? null;
      const thresholdLabel = getThresholdLabel(datum?.value, thresholds);
      const rect = (target as SVGGraphicsElement).getBoundingClientRect();
      const content = tooltipFormatter
        ? tooltipFormatter(datum, thresholdLabel)
        : `${datum?.label ?? regionId}: ${datum?.value ?? 'Sem dados'} ${unit} (${thresholdLabel})`.trim();

      setTooltip({ x: rect.left + rect.width / 2, y: rect.top, content });
    };

    const handleMouseLeave = () => setTooltip(null);

    const handleClick = (event: Event) => {
      const target = event.currentTarget as Element;
      const regionId = extractRegionId(target, regionSelector);
      if (!regionId) return;

      setSelectedRegionId(regionId);
      onRegionClick?.(dataById.get(regionId) ?? null);
    };

    const handleKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') {
        return;
      }
      keyboardEvent.preventDefault();
      handleClick(event);
    };

    elements.forEach((element) => {
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      element.addEventListener('click', handleClick);
      element.addEventListener('keydown', handleKeyDown);
    });

    return () => {
      elements.forEach((element) => {
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
        element.removeEventListener('click', handleClick);
        element.removeEventListener('keydown', handleKeyDown);
      });
    };
  }, [dataById, onRegionClick, regionSelector, thresholds, tooltipFormatter, unit]);

  return (
    <div className="map-wrapper">
      <div className="svg-host" ref={containerRef} dangerouslySetInnerHTML={{ __html: sanitizedSvg }} />
      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.content}
        </div>
      )}
      <Legend enabled={legend} thresholds={thresholds} noDataColor={noDataColor} />
    </div>
  );
};
