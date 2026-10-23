import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Configuração mínima do Vite com suporte à transformação de JSX pelo React.
export default defineConfig({
  plugins: [react()],
})
