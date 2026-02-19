import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";

export type QueryRecord = Record<string, unknown>;

export const DEFAULT_DQL_QUERY = `timeseries by:{city}, score = avg(testes.electric.score)
| fieldsAdd score_value = arrayAvg(score) * 100
| fields city, score_value
| sort score_value desc`;

const MOCK_DQL_CITY_SCORE_RECORDS: QueryRecord[] = [
  { city: "Amadora", score_value: 72.46 },
  { city: "Lisboa", score_value: 66.97 },
  { city: "Oeiras", score_value: 66.55 },
  { city: "Sintra", score_value: 62.22 },
  { city: "Cascais", score_value: 59.63 },
  { city: "Almada", score_value: 53.08 },
];

type MockEnv = {
  VITE_DQL_MOCK_MODE?: string;
  DQL_MOCK_MODE?: string;
};

const readMockModeEnv = (): string | undefined => {
  const importMeta = import.meta as ImportMeta & { env?: MockEnv };
  const processEnv = typeof process !== "undefined" ? (process.env as MockEnv) : undefined;

  return (
    importMeta.env?.VITE_DQL_MOCK_MODE ??
    processEnv?.VITE_DQL_MOCK_MODE ??
    processEnv?.DQL_MOCK_MODE
  );
};

const isMockModeEnabled = (): boolean =>
  String(readMockModeEnv() ?? "true").toLowerCase() !== "false";

export const useCityScoreQuery = (query: string) => {
  const isMockMode = isMockModeEnabled();
  const dqlResult = useDql<QueryRecord>(query, { enabled: !isMockMode });
  const records = useMemo(
    () => (isMockMode ? MOCK_DQL_CITY_SCORE_RECORDS : dqlResult.data?.records ?? []),
    [dqlResult.data?.records, isMockMode],
  );

  return { ...dqlResult, records, isMockMode };
};
