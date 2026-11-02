import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.AGE_SERVER_URL?.trim() || 'https://127.0.0.1:443'
  const insecure = env.AGE_SERVER_TLS_INSECURE?.trim().toLowerCase() === 'true'
  const caFile = env.AGE_SERVER_CA_FILE?.trim()
  const ca = caFile ? readFileSync(resolve(process.cwd(), caFile), 'utf8') : undefined

  try {
    const url = new URL(target)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('URL must use http:// or https://')
    }
  } catch (error) {
    throw new Error(`Invalid AGE_SERVER_URL "${target}": ${error instanceof Error ? error.message : String(error)}`)
  }

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      proxy: {
        '/community': {
          target,
          changeOrigin: true,
          secure: !insecure,
          ...(ca ? { ca } : {}),
          configure(proxy) {
            proxy.on('error', (error) => {
              console.error(`Community API proxy error (${target}): ${error.message}`)
            })
          },
        },
      },
    },
    preview: {
      host: '127.0.0.1',
      proxy: {
        '/community': {
          target,
          changeOrigin: true,
          secure: !insecure,
          ...(ca ? { ca } : {}),
        },
      },
    },
  }
})
