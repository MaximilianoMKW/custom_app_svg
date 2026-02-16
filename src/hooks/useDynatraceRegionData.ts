import { useEffect, useState } from 'react';
import type { RegionDatum } from '../types';

type QueryState = {
  data: RegionDatum[];
  loading: boolean;
  error: string | null;
};

const mockRegionData: RegionDatum[] = [
  { regionId: 'PT-11', label: 'Lisboa', value: 78 },
  { regionId: 'PT-13', label: 'Porto', value: 55 },
  { regionId: 'PT-30', label: 'Madeira', value: 20 }
];

export const useDynatraceRegionData = (enabled: boolean): QueryState => {
  const [state, setState] = useState<QueryState>({ data: [], loading: false, error: null });

  useEffect(() => {
    if (!enabled) {
      setState({ data: mockRegionData, loading: false, error: null });
      return;
    }

    const run = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Exemplo para Dynatrace Query API dentro do runtime de app:
        // const response = await fetch('/platform/storage/query/v1/query:execute', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ query: 'fetch logs | summarize count(), by:{dt.entity.geolocation.region}' })
        // });
        // const payload = await response.json();
        // const transformed = payload.records.map((record: any) => ({
        //   regionId: record['dt.entity.geolocation.region'],
        //   value: record['count'],
        //   label: record['dt.entity.geolocation.region']
        // }));

        const transformed = mockRegionData;
        setState({ data: transformed, loading: false, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        setState({ data: [], loading: false, error: message });
      }
    };

    void run();
  }, [enabled]);

  return state;
};
