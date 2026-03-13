import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const patternConfigPath = path.resolve(__dirname, 'src/config/patternPresets.json')

const patternConfigPlugin = () => ({
  name: 'pattern-config-dev-plugin',
  configureServer(server) {
    server.middlewares.use('/__dev/pattern-config', async (req, res) => {
      if (req.method === 'GET') {
        const fileContents = await fs.readFile(patternConfigPath, 'utf8')
        res.setHeader('Content-Type', 'application/json')
        res.end(fileContents)
        return
      }

      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', async () => {
          try {
            const parsedBody = JSON.parse(body || '{}')
            const formattedBody = `${JSON.stringify(parsedBody, null, 2)}\n`
            await fs.writeFile(patternConfigPath, formattedBody, 'utf8')
            res.setHeader('Content-Type', 'application/json')
            res.end(formattedBody)
          } catch (error) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error.message }))
          }
        })
        return
      }

      res.statusCode = 405
      res.end()
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), patternConfigPlugin()],
  base: '/',
})
