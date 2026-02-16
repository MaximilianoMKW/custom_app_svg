import DOMPurify from 'dompurify';
import type { RegionSelectorConfig } from '../types';

const FORBIDDEN_TAGS = ['script', 'foreignObject'];
const FORBIDDEN_ATTR = ['onerror', 'onload', 'onclick', 'style'];

export const sanitizeSvg = (rawSvg: string): string =>
  DOMPurify.sanitize(rawSvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: FORBIDDEN_ATTR
  });

export const extractRegionId = (element: Element, regionSelector: RegionSelectorConfig): string | null => {
  const attribute = regionSelector.regionIdAttribute ?? 'id';
  if (attribute === 'id') {
    return element.id || null;
  }

  return element.getAttribute(attribute);
};

export const getRegionElements = (container: HTMLElement, regionSelector: RegionSelectorConfig): Element[] => {
  const svgElement = container.querySelector('svg');
  if (!svgElement) {
    return [];
  }

  return Array.from(svgElement.querySelectorAll(regionSelector.selector));
};
