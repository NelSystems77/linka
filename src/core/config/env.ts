/** Type-safe access to all VITE_ environment variables */
export const env = {
  firebase: {
    apiKey:            import.meta.env.VITE_FB_API_KEY            as string,
    authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN        as string,
    projectId:         import.meta.env.VITE_FB_PROJECT_ID         as string,
    storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET     as string,
    messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID as string,
    appId:             import.meta.env.VITE_FB_APP_ID             as string,
  },
  backend: {
    wsUrl: import.meta.env.VITE_WS_URL as string,
    apiUrl: import.meta.env.VITE_API_URL as string,
  },
} as const
