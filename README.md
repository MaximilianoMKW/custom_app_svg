# Dynatrace Custom App: SVG Choropleth

App base em **TypeScript + React (dt-app friendly)** para renderizar mapas SVG como choropleth configurável.

## Arquitetura proposta

- `src/components/ChoroplethSvgMap.tsx`: componente principal reutilizável.
- `src/components/SettingsPanel.tsx`: painel interno para configuração (SVG, thresholds, unidade, mapeamento de IDs).
- `src/hooks/useDynatraceRegionData.ts`: exemplo de datasource Dynatrace (com mock fallback).
- `src/lib/color.ts`: função determinística `getColor(value, thresholds)`.
- `src/lib/svg.ts`: sanitização de SVG + extração/mapeamento de regiões.
- `src/assets/portugal.svg`: exemplo de mapa local (opção B).

## API do componente

```tsx
<ChoroplethSvgMap
  svg={svgSource}
  data={regionData}
  thresholds={thresholds}
  regionSelector={{ selector: 'path, polygon, g', regionIdAttribute: 'id' }}
  onRegionClick={(region) => console.log(region)}
  tooltipFormatter={(region, threshold) => `${region?.label}: ${region?.value} (${threshold})`}
  legend
/>
```

## Fontes de SVG suportadas

1. **Inline string (Opção A)**: colar no settings panel.
2. **Asset local (Opção B)**: `import mapSvg from './assets/map.svg?raw'`.
3. **URL (Opção C)**: permitido apenas se política de CSP/rede da plataforma autorizar. Em ambientes restritos, use asset local ou armazenamento da plataforma.

## Segurança do SVG

- Sanitização com `DOMPurify` antes de renderizar.
- Bloqueio explícito de tags/atributos perigosos (`script`, `foreignObject`, `on*` comuns).
- Recomendação operacional: usar SVG confiável versionado no repositório.

## Como lida com IDs inconsistentes

- Mapeamento configurável por `id`, `data-region` ou atributo customizado.
- Regiões sem dado recebem `noDataColor`.
- Dados com `regionId` ausente no SVG geram `console.warn`, sem quebrar a renderização.

## Thresholds e legenda configuráveis

- Thresholds são editáveis no painel em JSON.
- Legenda pode ser ligada/desligada.
- Unidade também configurável (`%`, `ms`, `req/s`, etc.).

## Exemplo de integração Dynatrace Query API

No hook `useDynatraceRegionData`, já existe esqueleto de chamada de query (comentado) com transformação para:

```ts
type RegionDatum = { regionId: string; value: number; label?: string; meta?: Record<string, any> }
```

## Estados de UX tratados

- loading
- error
- empty

## Como adicionar um novo mapa SVG

1. Coloque arquivo em `src/assets/novo-mapa.svg`.
2. Importe com `?raw` no `App.tsx`.
3. Configure `regionIdAttribute` para corresponder ao atributo das regiões (`id`, `data-region`, etc.).
4. Ajuste `regionSelector.selector` para os elementos relevantes (`path`, `polygon`, `g`).

## Como mapear IDs

- Se o SVG usa `id="PT-11"`, use `regionIdAttribute: 'id'`.
- Se usa `data-region="PT-11"`, use `regionIdAttribute: 'data-region'`.
- Para atributo customizado, informe o nome diretamente (ex.: `regionIdAttribute: 'data-code'`).

## Rodando localmente

```bash
npm install
npm run dev
npm run test
```
