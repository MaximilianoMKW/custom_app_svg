import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@dynatrace/strato-components/buttons";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Strong } from "@dynatrace/strato-components/typography";
import {
  RunQueryButton,
  type QueryStateType,
} from "@dynatrace/strato-components-preview/buttons";
import { DQLEditor } from "@dynatrace/strato-components-preview/editors";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { CriticalIcon } from "@dynatrace/strato-icons";
import { ChoroplethSvgMap } from "../choropleth/ChoroplethSvgMap";
import { getColor, getThresholdLabel } from "../choropleth/color";
import { DEFAULT_DQL_QUERY, useCityScoreQuery, type QueryRecord } from "../hooks/useCityScoreQuery";
import type { RegionDatum, Threshold } from "../choropleth/types";
import "./Home.css";

const MAP_THRESHOLDS: Threshold[] = [
  { min: 0, max: 50, color: "#9e0000", label: "Muito baixo" },
  { min: 50, max: 80, color: "#e9c10e", label: "Medio" },
  { min: 80, max: 100, color: "#019119", label: "Muito alto" },
];

const T1_T4_FALLBACK_COLORS = ["#12344f", "#1d5f89", "#0ea5e9", "#22d3ee", "#67e8f9"];
const T1_T4_FALLBACK_LABELS = ["Muito baixo", "Baixo", "Medio", "Alto", "Muito alto"];

const getT1T4ThresholdStyle = (index: number): Pick<Threshold, "color" | "label"> => ({
  color: MAP_THRESHOLDS[index]?.color ?? T1_T4_FALLBACK_COLORS[index],
  label: MAP_THRESHOLDS[index]?.label ?? T1_T4_FALLBACK_LABELS[index],
});

const MAP_SVG_URL = "./assets/concelhos_portugal_com_nomes.svg";

const CITY_KEYS = ["city", "name", "label", "concelho", "municipality", "region"];
const REGION_CODE_KEYS = ["regionId", "z", "data-z", "ine", "data-ine"];
const VALUE_KEYS = ["score_value", "value", "count", "count()", "events", "metric"];
const LABEL_KEYS = ["label", "city", "name", "concelho", "municipality"];
const THRESHOLD_ARRAY_KEYS = [
  "thresholds",
  "concelhoThresholds",
  "cityThresholds",
  "thresholdsJson",
  "thresholds_json",
];
const THRESHOLD_T1_KEYS = ["t1", "threshold1", "threshold_1", "lowMax", "low_max"];
const THRESHOLD_T2_KEYS = ["t2", "threshold2", "threshold_2", "mediumMax", "medium_max"];
const THRESHOLD_T3_KEYS = ["t3", "threshold3", "threshold_3", "highMax", "high_max"];
const THRESHOLD_T4_KEYS = ["t4", "threshold4", "threshold_4", "veryHighMax", "very_high_max"];
const EXCLUDED_REGION_LABELS = new Set(["server room", "datacenter", "data center"]);

const normalizeCityId = (value: string): string =>
  value
    .replace(/^D\d{1,2}-/, "")
    .replace(/_/g, " ")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeLabel = (value: string): string =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

const isExcludedRegionLabel = (value: string | null): boolean =>
  value !== null && EXCLUDED_REGION_LABELS.has(normalizeLabel(value));

const readString = (record: QueryRecord, keys: string[]): string | null => {
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return String(raw);
    }
  }
  return null;
};

const readNumber = (record: QueryRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const isThresholdRecord = (value: unknown): value is Threshold =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Threshold).min === "number" &&
  typeof (value as Threshold).max === "number" &&
  typeof (value as Threshold).color === "string" &&
  typeof (value as Threshold).label === "string";

const parseThresholdList = (value: unknown): Threshold[] | null => {
  if (typeof value === "string") {
    try {
      return parseThresholdList(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const parsed = value.filter(isThresholdRecord).map((threshold) => ({
    min: threshold.min,
    max: threshold.max,
    color: threshold.color,
    label: threshold.label,
  }));

  if (parsed.length === 0 || parsed.length !== value.length) {
    return null;
  }

  return parsed.sort((left, right) => left.min - right.min);
};

const buildConcelhoThresholds = (record: QueryRecord): Threshold[] | undefined => {
  for (const key of THRESHOLD_ARRAY_KEYS) {
    const parsed = parseThresholdList(record[key]);
    if (parsed) {
      return parsed;
    }
  }

  const t1 = readNumber(record, THRESHOLD_T1_KEYS);
  const t2 = readNumber(record, THRESHOLD_T2_KEYS);
  const t3 = readNumber(record, THRESHOLD_T3_KEYS);
  const t4 = readNumber(record, THRESHOLD_T4_KEYS);
  if (
    t1 === null ||
    t2 === null ||
    t3 === null ||
    t4 === null ||
    !(t1 <= t2 && t2 <= t3 && t3 <= t4)
  ) {
    return undefined;
  }

  return [
    { min: Number.NEGATIVE_INFINITY, max: t1, ...getT1T4ThresholdStyle(0) },
    { min: t1, max: t2, ...getT1T4ThresholdStyle(1) },
    { min: t2, max: t3, ...getT1T4ThresholdStyle(2) },
    { min: t3, max: t4, ...getT1T4ThresholdStyle(3) },
    { min: t4, max: Number.POSITIVE_INFINITY, ...getT1T4ThresholdStyle(4) },
  ];
};

type SvgConcelhoMetadata = {
  regionIds: Set<string>;
  nameToRegionCode: Map<string, string>;
  regionCodeToName: Map<string, string>;
};

const extractSvgConcelhoMetadata = (svg: string): SvgConcelhoMetadata => {
  const regionIds = new Set<string>();
  const nameToRegionCode = new Map<string, string>();
  const regionCodeToName = new Map<string, string>();

  const pathTags = svg.match(/<path\b[^>]*>/g) ?? [];
  pathTags.forEach((tag) => {
    const nameMatch = tag.match(/data-concelho-nome="([^"]+)"/);
    const regionCodeMatch = tag.match(/data-z="([^"]+)"/);
    const name = nameMatch?.[1]?.trim();
    const regionCode = regionCodeMatch?.[1]?.trim();
    if (!name || !regionCode) {
      return;
    }

    regionIds.add(regionCode);
    nameToRegionCode.set(normalizeCityId(name), regionCode);
    regionCodeToName.set(regionCode, name);
  });

  return { regionIds, nameToRegionCode, regionCodeToName };
};

const getRegionThresholds = (region: RegionDatum | null | undefined): Threshold[] =>
  region?.thresholds ?? MAP_THRESHOLDS;

const parseRegionData = (
  records: QueryRecord[],
  nameToRegionCode: Map<string, string>,
  regionCodeToName: Map<string, string>,
): RegionDatum[] => {
  const byRegionId = new Map<string, RegionDatum>();
  records.forEach((record) => {
    const regionCode = readString(record, REGION_CODE_KEYS);
    const city = readString(record, CITY_KEYS);
    const label = readString(record, LABEL_KEYS);
    const value = readNumber(record, VALUE_KEYS);
    if (isExcludedRegionLabel(city) || isExcludedRegionLabel(label)) {
      return;
    }
    const regionId = regionCode ?? (city ? nameToRegionCode.get(normalizeCityId(city)) : undefined);
    if (!regionId || value === null) {
      return;
    }

    byRegionId.set(regionId, {
      regionId,
      value,
      label: label ?? city ?? regionCodeToName.get(regionId) ?? `ID ${regionId}`,
      thresholds: buildConcelhoThresholds(record),
    });
  });
  return Array.from(byRegionId.values());
};

export const Home = () => {
  const [selectedRegion, setSelectedRegion] = useState<RegionDatum | null>(null);
  const [unit, setUnit] = useState("%");
  const [showLegend, setShowLegend] = useState(true);
  const [editorQuery, setEditorQuery] = useState(DEFAULT_DQL_QUERY);
  const [query, setQuery] = useState(DEFAULT_DQL_QUERY);
  const [svg, setSvg] = useState("");
  const [svgLoadError, setSvgLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadSvg = async () => {
      try {
        const response = await fetch(MAP_SVG_URL);
        if (!response.ok) {
          throw new Error(`Falha ao carregar SVG (${response.status})`);
        }
        const svgText = await response.text();
        if (!active) {
          return;
        }
        setSvg(svgText);
        setSvgLoadError(null);
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Falha ao carregar o ficheiro SVG do mapa.";
        setSvgLoadError(message);
      }
    };

    void loadSvg();
    return () => {
      active = false;
    };
  }, []);

  const { data: queryResult, error, isLoading, refetch, cancel, records: queryRecords, isMockMode } =
    useCityScoreQuery(query);

  const svgConcelhoMetadata = useMemo(() => extractSvgConcelhoMetadata(svg), [svg]);
  const regionData = useMemo(
    () =>
      parseRegionData(
        queryRecords,
        svgConcelhoMetadata.nameToRegionCode,
        svgConcelhoMetadata.regionCodeToName,
      ),
    [
      queryRecords,
      svgConcelhoMetadata.nameToRegionCode,
      svgConcelhoMetadata.regionCodeToName,
    ],
  );
  const svgRegionIds = svgConcelhoMetadata.regionIds;
  const regionsMappedInSvg = useMemo(
    () => regionData.filter((entry) => svgRegionIds.has(entry.regionId)).length,
    [regionData, svgRegionIds],
  );
  const averageValue = useMemo(() => {
    if (regionData.length === 0) {
      return 0;
    }
    const sum = regionData.reduce((accumulator, region) => accumulator + region.value, 0);
    return Number((sum / regionData.length).toFixed(1));
  }, [regionData]);
  const thresholdCoverage = useMemo(() => {
    if (regionData.length === 0) {
      return 0;
    }
    const covered = regionData.filter((region) =>
      getRegionThresholds(region).some(
        (threshold) => region.value >= threshold.min && region.value <= threshold.max,
      ),
    );
    return Math.round((covered.length / regionData.length) * 100);
  }, [regionData]);
  const sortedRegions = useMemo(
    () => [...regionData].sort((a, b) => b.value - a.value).slice(0, 10),
    [regionData],
  );
  const maxTopValue = sortedRegions[0]?.value ?? 1;

  const onRunQuery = () => {
    if (isMockMode) {
      setQuery(editorQuery);
      return;
    }

    if (isLoading) {
      void cancel();
      return;
    }

    if (query !== editorQuery) {
      setQuery(editorQuery);
      return;
    }

    void refetch();
  };

  const resetDefaults = () => {
    setSelectedRegion(null);
    setUnit("%");
    setShowLegend(true);
    setEditorQuery(DEFAULT_DQL_QUERY);
    setQuery(DEFAULT_DQL_QUERY);
  };

  let queryState: QueryStateType;
  if (isMockMode) {
    queryState = "success";
  } else if (error) {
    queryState = "error";
  } else if (isLoading) {
    queryState = "loading";
  } else if (queryResult) {
    queryState = "success";
  } else {
    queryState = "idle";
  }

  return (
    <div className="choro-page">
      <Surface className="choro-hero" elevation="raised">
        <Flex className="choro-chip-row" gap={0} flexFlow="wrap">
          <span className="choro-chip">{regionData.length} concelhos com dados</span>
          <span className="choro-chip">{regionsMappedInSvg} concelhos mapeados</span>
          <span className="choro-chip">{thresholdCoverage}% dentro dos thresholds</span>
        </Flex>
      </Surface>
      <div className="choro-stats-grid">
        <Surface className="choro-stat-card" elevation="flat">
          <Paragraph className="choro-stat-label">Media</Paragraph>
          <Heading className="choro-stat-value" level={3}>
            {averageValue}
            {unit}
          </Heading>
        </Surface>
        <Surface className="choro-stat-card" elevation="flat">
          <Paragraph className="choro-stat-label">Selecionado</Paragraph>
          <Heading className="choro-stat-value" level={3}>
            {selectedRegion ? (selectedRegion.label ?? selectedRegion.regionId) : "Nenhum"}
          </Heading>
        </Surface>
        <Surface className="choro-stat-card" elevation="flat">
          <Paragraph className="choro-stat-label">Faixa selecionada</Paragraph>
          <Heading className="choro-stat-value" level={3}>
            {selectedRegion
              ? getThresholdLabel(selectedRegion.value, getRegionThresholds(selectedRegion))
              : "N/A"}
          </Heading>
        </Surface>
      </div>

      <div className="choro-layout">
        <div className="choro-main-column">
          <Surface className="choro-panel choro-map-panel" elevation="raised">
            {svgLoadError ? (
              <Paragraph className="choro-error">{svgLoadError}</Paragraph>
            ) : (
              <ChoroplethSvgMap
                svg={svg}
                data={regionData}
                thresholds={MAP_THRESHOLDS}
                unit={unit}
                legend={showLegend}
                regionSelector={{ selector: "path[data-z]", regionIdAttribute: "data-z" }}
                onRegionClick={setSelectedRegion}
                tooltipFormatter={(region, thresholdLabel, regionId) =>
                  `${region?.label ?? `ID ${regionId}`}: ${region?.value ?? "Sem dados"} ${unit} (${thresholdLabel})`
                }
              />
            )}
          </Surface>
        </div>

        <Surface className="choro-panel choro-controls-panel" elevation="raised">
          <Flex flexDirection="column" gap={12}>
            <Heading level={4}>Query DQL</Heading>
            <Paragraph className="choro-help-copy">
              Campos esperados no resultado: <Strong>city</Strong> ou <Strong>regionId/z</Strong>, e{" "}
              <Strong>value/score_value</Strong>. Opcional: thresholds por concelho em{" "}
              <Strong>t1..t4</Strong> ou <Strong>thresholds</Strong>.
            </Paragraph>
            {isMockMode && (
              <Paragraph className="choro-help-copy">
                Mock ativo via <Strong>VITE_DQL_MOCK_MODE=true</Strong>. Para PRD, defina{" "}
                <Strong>VITE_DQL_MOCK_MODE=false</Strong> para executar a query no Grail com{" "}
                <Strong>useDql</Strong>.
              </Paragraph>
            )}

            <DQLEditor value={editorQuery} onChange={setEditorQuery} />

            {error && (
              <Flex alignItems="center" gap={6} style={{ color: Colors.Text.Critical.Default }}>
                <CriticalIcon />
                <Paragraph>{error.message}</Paragraph>
              </Flex>
            )}

            <label className="choro-field" htmlFor="choro-unit">
              <span className="choro-field-label">Unidade</span>
              <input
                id="choro-unit"
                className="choro-input"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="eventos"
              />
            </label>

            <label className="choro-toggle" htmlFor="choro-show-legend">
              <input
                id="choro-show-legend"
                type="checkbox"
                checked={showLegend}
                onChange={(event) => setShowLegend(event.target.checked)}
              />
              <span>Mostrar legenda</span>
            </label>

            <Flex className="choro-actions" gap={8}>
              <RunQueryButton onClick={onRunQuery} queryState={queryState} />
              <Button variant="default" color="neutral" onClick={resetDefaults}>
                Reset
              </Button>
            </Flex>
          </Flex>
        </Surface>
      </div>

      <Surface className="choro-panel choro-ranking-panel" elevation="flat">
        <Heading level={4}>Top Concelhos</Heading>
        <div className="choro-top-list">
          {sortedRegions.map((region) => (
            <div className="choro-top-row" key={region.regionId}>
              <Flex justifyContent="space-between" alignItems="baseline">
                <Strong>{region.label ?? region.regionId}</Strong>
                <Paragraph className="choro-top-value">
                  {region.value}
                  {unit}
                </Paragraph>
              </Flex>
              <div className="choro-top-track">
                <span
                  className="choro-top-fill"
                  style={{
                    width: `${Math.round((region.value / maxTopValue) * 100)}%`,
                    backgroundColor: getColor(
                      region.value,
                      getRegionThresholds(region),
                      "#d1d5db",
                    ),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
};
