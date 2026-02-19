/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DQL_MOCK_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
