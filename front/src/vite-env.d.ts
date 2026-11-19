/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base de l'API. Par défaut /api, relayé par le proxy Vite en dev. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
