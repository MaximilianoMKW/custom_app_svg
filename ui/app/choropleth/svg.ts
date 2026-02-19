import DOMPurify from "dompurify";
import type { RegionSelectorConfig } from "./types";

const FORBIDDEN_TAGS = ["script", "foreignObject"];
const FORBIDDEN_ATTR = [
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onfocus",
];

export const sanitizeSvg = (rawSvg: string): string =>
  DOMPurify.sanitize(rawSvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: FORBIDDEN_ATTR,
  });

export const extractRegionId = (
  element: Element,
  regionSelector: RegionSelectorConfig,
): string | null => {
  const attr = regionSelector.regionIdAttribute ?? "id";
  if (attr === "id") {
    return element.id || null;
  }
  return element.getAttribute(attr);
};

export const getRegionElements = (
  container: HTMLElement,
  regionSelector: RegionSelectorConfig,
): Element[] => {
  const svgEl = container.querySelector("svg");
  if (!svgEl) {
    return [];
  }
  return Array.from(svgEl.querySelectorAll(regionSelector.selector));
};

