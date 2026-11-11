import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'lib',
    target: 'es2022',
    cssCodeSplit: false,
    // Keep the card backgrounds and font cacheable as separate files.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        index: 'src/widgets/index.tsx',
        telegram: 'src/telegram.ts',
      },
      external: /^(react|react-dom|motion|lucide-react)(\/|$)/,
      preserveEntrySignatures: 'strict',
      output: {
        entryFileNames: '[name].js',
        assetFileNames: asset => asset.names.some(name => name.endsWith('.css'))
          ? 'style.css'
          : 'assets/[name]-[hash][extname]',
        banner: chunk => chunk.name === 'index' ? '"use client";' : '',
      },
    },
  },
});
