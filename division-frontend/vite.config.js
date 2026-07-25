import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // HTTPS only for `vite dev` — camera (getUserMedia) needs a secure context
  // to test on a phone over LAN. Not needed for `vite build`/`preview`.
  plugins: [react(), tailwindcss(), command === 'serve' && basicSsl()].filter(Boolean),
}))
