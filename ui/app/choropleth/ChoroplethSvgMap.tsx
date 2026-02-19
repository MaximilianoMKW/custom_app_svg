/* eslint-disable react/no-danger -- SVG host uses sanitized markup produced by DOMPurify. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { getColor, getThresholdLabel } from "./color";
import { Legend } from "./Legend";
import { extractRegionId, getRegionElements, sanitizeSvg } from "./svg";
import type {
  RegionDatum,
  RegionSelectorConfig,
  RegionVisualStyle,
  Threshold,
} from "./types";
import "./choropleth.css";

type ChoroplethSvgMapProps = {
  svg: string;
  data: RegionDatum[];
  thresholds: Threshold[];
  regionSelector: RegionSelectorConfig;
  noDataColor?: string;
  defaultStyle?: RegionVisualStyle;
  hoverStyle?: RegionVisualStyle;
  hoverFillColor?: string;
  selectedStyle?: RegionVisualStyle;
  legend?: boolean;
  unit?: string;
  onRegionClick?: (region: RegionDatum | null) => void;
  tooltipFormatter?: (
    region: RegionDatum | null,
    thresholdLabel: string,
    regionId: string,
  ) => string;
};

type TooltipState = {
  x: number;
  y: number;
  content: string;
  regionId: string;
};

type ZoomTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 1.2;
const DRAG_CLICK_THRESHOLD = 4;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const mergeStyle = (element: Element, style: RegionVisualStyle) => {
  if (style.stroke === undefined) {
    element.removeAttribute("stroke");
  } else {
    element.setAttribute("stroke", style.stroke);
  }

  if (style.strokeWidth === undefined) {
    element.removeAttribute("stroke-width");
  } else {
    element.setAttribute("stroke-width", String(style.strokeWidth));
  }

  if (style.opacity === undefined) {
    element.removeAttribute("opacity");
  } else {
    element.setAttribute("opacity", String(style.opacity));
  }

  const svgElement = element as SVGElement;
  if (style.filter === undefined) {
    svgElement.style.removeProperty("filter");
  } else {
    svgElement.style.filter = style.filter;
  }

  if (style.transform === undefined) {
    svgElement.style.removeProperty("transform");
  } else {
    svgElement.style.transform = style.transform;
    svgElement.style.transformOrigin = "center";
  }
};

const applyRegionStyle = (
  element: Element,
  baseStyle: RegionVisualStyle,
  overrideStyle?: RegionVisualStyle,
) => {
  mergeStyle(element, baseStyle);
  if (overrideStyle) {
    mergeStyle(element, overrideStyle);
  }
};

export const ChoroplethSvgMap = ({
  svg,
  data,
  thresholds,
  regionSelector,
  noDataColor = "#e5e7eb",
  defaultStyle = { stroke: "#f8fafc", strokeWidth: 1.2, opacity: 0.97 },
  hoverStyle = {
    stroke: "#0f172a",
    strokeWidth: 2.2,
    opacity: 1,
    filter: "drop-shadow(0 6px 12px rgba(15, 23, 42, 0.28))",
  },
  hoverFillColor = "#cbd5e1",
  selectedStyle = {
    stroke: "#0f172a",
    strokeWidth: 2.8,
    opacity: 1,
    filter: "drop-shadow(0 8px 14px rgba(15, 23, 42, 0.34))",
  },
  legend = true,
  unit = "",
  onRegionClick,
  tooltipFormatter,
}: ChoroplethSvgMapProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const zoomRef = useRef<ZoomTransform>({
    scale: MIN_ZOOM,
    translateX: 0,
    translateY: 0,
  });
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const dataByRegion = useMemo(
    () => new Map(data.map((entry) => [entry.regionId, entry])),
    [data],
  );
  const sanitizedSvg = useMemo(() => sanitizeSvg(svg), [svg]);
  const getRegionId = useCallback(
    (element: Element): string | null => {
      const extractedId = extractRegionId(element, regionSelector);
      return extractedId ?? null;
    },
    [regionSelector],
  );

  const clampTransform = (transform: ZoomTransform): ZoomTransform => {
    const viewport = viewportRef.current;
    const host = hostRef.current;
    if (!viewport || !host) {
      return transform;
    }

    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const contentWidth = host.offsetWidth;
    const contentHeight = host.offsetHeight;
    const scaledWidth = contentWidth * transform.scale;
    const scaledHeight = contentHeight * transform.scale;

    let minX = Math.min(0, viewportWidth - scaledWidth);
    let maxX = 0;
    let minY = Math.min(0, viewportHeight - scaledHeight);
    let maxY = 0;

    if (scaledWidth <= viewportWidth) {
      minX = (viewportWidth - scaledWidth) / 2;
      maxX = minX;
    }

    if (scaledHeight <= viewportHeight) {
      minY = (viewportHeight - scaledHeight) / 2;
      maxY = minY;
    }

    return {
      scale: transform.scale,
      translateX: clamp(transform.translateX, minX, maxX),
      translateY: clamp(transform.translateY, minY, maxY),
    };
  };

  const scheduleTransformApply = () => {
    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const host = hostRef.current;
      const viewport = viewportRef.current;
      if (!host || !viewport) {
        return;
      }

      const { scale, translateX, translateY } = zoomRef.current;
      host.style.transformOrigin = "0 0";
      host.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
      viewport.classList.toggle("is-zoomed", scale > MIN_ZOOM + 0.001);
    });
  };

  const zoomAt = (zoomFactor: number, originX: number, originY: number) => {
    const current = zoomRef.current;
    const nextScale = clamp(current.scale * zoomFactor, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(nextScale - current.scale) < 0.0001) {
      return;
    }

    const contentX = (originX - current.translateX) / current.scale;
    const contentY = (originY - current.translateY) / current.scale;

    const nextTransform = clampTransform({
      scale: nextScale,
      translateX: originX - contentX * nextScale,
      translateY: originY - contentY * nextScale,
    });

    zoomRef.current = nextTransform;
    scheduleTransformApply();
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const elements = getRegionElements(host, regionSelector);
    const idsInSvg = new Set<string>();

    elements.forEach((element) => {
      const regionId = getRegionId(element);
      if (!regionId) {
        return;
      }
      idsInSvg.add(regionId);

      const datum = dataByRegion.get(regionId);
      const regionThresholds = datum?.thresholds ?? thresholds;
      element.setAttribute("fill", getColor(datum?.value, regionThresholds, noDataColor));
      applyRegionStyle(element, defaultStyle);

      if (selectedRegionId === regionId) {
        applyRegionStyle(element, defaultStyle, selectedStyle);
      }

      element.classList.add("choropleth-region");
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
      element.setAttribute("aria-pressed", String(selectedRegionId === regionId));
      element.setAttribute(
        "aria-label",
        `${datum?.label ?? regionId}: ${datum?.value ?? "No data"} ${unit}`.trim(),
      );
    });

    data.forEach((entry) => {
      if (!idsInSvg.has(entry.regionId)) {
        console.warn(`[ChoroplethSvgMap] regionId "${entry.regionId}" not found in SVG.`);
      }
    });
  }, [
    data,
    dataByRegion,
    defaultStyle,
    getRegionId,
    noDataColor,
    regionSelector,
    selectedRegionId,
    selectedStyle,
    thresholds,
    unit,
  ]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const host = hostRef.current;
    if (!viewport || !host) {
      return;
    }

    host.style.willChange = "transform";
    host.style.transition = "transform 80ms linear";
    zoomRef.current = clampTransform({
      scale: MIN_ZOOM,
      translateX: 0,
      translateY: 0,
    });
    scheduleTransformApply();

    const zoomAtPoint = (zoomFactor: number, originX: number, originY: number) => {
      const current = zoomRef.current;
      const nextScale = clamp(current.scale * zoomFactor, MIN_ZOOM, MAX_ZOOM);
      if (Math.abs(nextScale - current.scale) < 0.0001) {
        return;
      }

      const contentX = (originX - current.translateX) / current.scale;
      const contentY = (originY - current.translateY) / current.scale;
      zoomRef.current = clampTransform({
        scale: nextScale,
        translateX: originX - contentX * nextScale,
        translateY: originY - contentY * nextScale,
      });
      scheduleTransformApply();
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const originX = event.clientX - rect.left;
      const originY = event.clientY - rect.top;
      const wheelFactor = Math.exp(-event.deltaY * 0.0015);
      zoomAtPoint(wheelFactor, originX, originY);
    };

    let dragPointerId = -1;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartTranslateX = 0;
    let dragStartTranslateY = 0;
    let dragMoved = false;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || zoomRef.current.scale <= MIN_ZOOM + 0.001) {
        return;
      }

      dragPointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragStartTranslateX = zoomRef.current.translateX;
      dragStartTranslateY = zoomRef.current.translateY;
      dragMoved = false;
      viewport.classList.add("is-panning");
      viewport.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragPointerId) {
        return;
      }

      const deltaX = event.clientX - dragStartX;
      const deltaY = event.clientY - dragStartY;
      if (
        !dragMoved &&
        (Math.abs(deltaX) > DRAG_CLICK_THRESHOLD || Math.abs(deltaY) > DRAG_CLICK_THRESHOLD)
      ) {
        dragMoved = true;
      }

      zoomRef.current = clampTransform({
        ...zoomRef.current,
        translateX: dragStartTranslateX + deltaX,
        translateY: dragStartTranslateY + deltaY,
      });
      scheduleTransformApply();
    };

    const endPan = (event: PointerEvent) => {
      if (event.pointerId !== dragPointerId) {
        return;
      }

      if (dragMoved) {
        suppressClickRef.current = true;
      }

      dragPointerId = -1;
      dragMoved = false;
      viewport.classList.remove("is-panning");
      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", endPan);
    viewport.addEventListener("pointercancel", endPan);

    const resizeObserver = new ResizeObserver(() => {
      zoomRef.current = clampTransform(zoomRef.current);
      scheduleTransformApply();
    });
    resizeObserver.observe(viewport);
    resizeObserver.observe(host);

    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", endPan);
      viewport.removeEventListener("pointercancel", endPan);
      resizeObserver.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [sanitizedSvg]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const elements = getRegionElements(host, regionSelector);
    const restoreRegionFill = (target: Element, regionId: string | null) => {
      if (!regionId) {
        return;
      }
      const datum = dataByRegion.get(regionId);
      const regionThresholds = datum?.thresholds ?? thresholds;
      target.setAttribute("fill", getColor(datum?.value, regionThresholds, noDataColor));
    };

    const onMouseEnter = (event: Event) => {
      const target = event.currentTarget as Element;
      const regionId = getRegionId(target);
      if (!regionId) {
        return;
      }

      target.setAttribute("fill", hoverFillColor);
      applyRegionStyle(target, defaultStyle, hoverStyle);
      const datum = dataByRegion.get(regionId) ?? null;
      const regionThresholds = datum?.thresholds ?? thresholds;
      const thresholdLabel = getThresholdLabel(datum?.value, regionThresholds);
      const content = tooltipFormatter
        ? tooltipFormatter(datum, thresholdLabel, regionId)
        : `${datum?.label ?? regionId}: ${datum?.value ?? "No data"} ${unit} (${thresholdLabel})`;
      const pointerEvent = event as MouseEvent;
      const rect = (target as SVGGraphicsElement).getBoundingClientRect();
      const x = Number.isFinite(pointerEvent.clientX)
        ? pointerEvent.clientX + 12
        : rect.left + rect.width / 2;
      const y = Number.isFinite(pointerEvent.clientY)
        ? pointerEvent.clientY - 14
        : rect.top;
      setTooltip({ x, y, content, regionId });
    };

    const onMouseMove = (event: Event) => {
      const target = event.currentTarget as Element;
      const regionId = getRegionId(target);
      if (!regionId) {
        return;
      }

      const pointerEvent = event as MouseEvent;
      setTooltip((previous) => {
        if (!previous || previous.regionId !== regionId) {
          return previous;
        }
        return {
          ...previous,
          x: pointerEvent.clientX + 12,
          y: pointerEvent.clientY - 14,
        };
      });
    };

    const onMouseLeave = (event: Event) => {
      const target = event.currentTarget as Element;
      const regionId = getRegionId(target);
      restoreRegionFill(target, regionId);
      const activeStyle = regionId && regionId === selectedRegionId ? selectedStyle : undefined;
      applyRegionStyle(target, defaultStyle, activeStyle);
      setTooltip((previous) => {
        if (!previous || previous.regionId !== regionId) {
          return previous;
        }
        return null;
      });
    };

    const onFocus = (event: Event) => {
      const target = event.currentTarget as Element;
      const regionId = getRegionId(target);
      if (!regionId) {
        return;
      }

      target.setAttribute("fill", hoverFillColor);
      applyRegionStyle(target, defaultStyle, hoverStyle);
      const datum = dataByRegion.get(regionId) ?? null;
      const regionThresholds = datum?.thresholds ?? thresholds;
      const thresholdLabel = getThresholdLabel(datum?.value, regionThresholds);
      const content = tooltipFormatter
        ? tooltipFormatter(datum, thresholdLabel, regionId)
        : `${datum?.label ?? regionId}: ${datum?.value ?? "No data"} ${unit} (${thresholdLabel})`;
      const rect = (target as SVGGraphicsElement).getBoundingClientRect();
      setTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top,
        content,
        regionId,
      });
    };

    const onBlur = (event: Event) => {
      const target = event.currentTarget as Element;
      const regionId = getRegionId(target);
      restoreRegionFill(target, regionId);
      const activeStyle = regionId && regionId === selectedRegionId ? selectedStyle : undefined;
      applyRegionStyle(target, defaultStyle, activeStyle);
      setTooltip((previous) => {
        if (!previous || previous.regionId !== regionId) {
          return previous;
        }
        return null;
      });
    };

    const onSelect = (event: Event) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }

      const target = event.currentTarget as Element;
      const regionId = getRegionId(target);
      if (!regionId) {
        return;
      }

      setSelectedRegionId((current) => {
        const nextSelected = current === regionId ? null : regionId;
        onRegionClick?.(nextSelected ? (dataByRegion.get(nextSelected) ?? null) : null);
        return nextSelected;
      });
    };

    const onKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") {
        return;
      }
      keyboardEvent.preventDefault();
      onSelect(event);
    };

    elements.forEach((element) => {
      element.addEventListener("mouseenter", onMouseEnter);
      element.addEventListener("mousemove", onMouseMove);
      element.addEventListener("mouseleave", onMouseLeave);
      element.addEventListener("focus", onFocus);
      element.addEventListener("blur", onBlur);
      element.addEventListener("click", onSelect);
      element.addEventListener("keydown", onKeyDown);
    });

    const onHostClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const clickedOnRegion = elements.some(
        (element) => element === target || element.contains(target),
      );
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (clickedOnRegion) {
        return;
      }

      setSelectedRegionId(null);
      onRegionClick?.(null);
      setTooltip(null);
    };

    host.addEventListener("click", onHostClick);

    return () => {
      elements.forEach((element) => {
        element.removeEventListener("mouseenter", onMouseEnter);
        element.removeEventListener("mousemove", onMouseMove);
        element.removeEventListener("mouseleave", onMouseLeave);
        element.removeEventListener("focus", onFocus);
        element.removeEventListener("blur", onBlur);
        element.removeEventListener("click", onSelect);
        element.removeEventListener("keydown", onKeyDown);
      });
      host.removeEventListener("click", onHostClick);
    };
  }, [
    dataByRegion,
    defaultStyle,
    getRegionId,
    hoverStyle,
    onRegionClick,
    regionSelector,
    selectedRegionId,
    selectedStyle,
    thresholds,
    tooltipFormatter,
    unit,
    hoverFillColor,
    noDataColor,
  ]);

  const zoomIn = () => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    zoomAt(ZOOM_STEP, viewport.clientWidth / 2, viewport.clientHeight / 2);
  };

  const zoomOut = () => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    zoomAt(1 / ZOOM_STEP, viewport.clientWidth / 2, viewport.clientHeight / 2);
  };

  const resetZoom = () => {
    zoomRef.current = clampTransform({
      scale: MIN_ZOOM,
      translateX: 0,
      translateY: 0,
    });
    scheduleTransformApply();
  };

  return (
    <Flex
      className="choropleth-map"
      flexDirection="column"
      gap={12}
      style={{ position: "relative", width: "100%", minHeight: 420 }}
    >
      <div className="choropleth-frame">
        <div className="choropleth-zoom-controls" aria-label="Map zoom controls">
          <button type="button" className="choropleth-zoom-btn" onClick={zoomIn} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="choropleth-zoom-btn" onClick={zoomOut} aria-label="Zoom out">
            -
          </button>
          <button
            type="button"
            className="choropleth-zoom-btn is-reset"
            onClick={resetZoom}
            aria-label="Reset zoom"
          >
            reset
          </button>
        </div>
        <div ref={viewportRef} className="choropleth-viewport">
          <div
            ref={hostRef}
            className="choropleth-svg-host"
            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
          />
        </div>
      </div>
      {tooltip && (
        <div className="choropleth-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.content}
        </div>
      )}
      <Legend enabled={legend} thresholds={thresholds} noDataColor={noDataColor} />
    </Flex>
  );
};
