import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { version } = require('./package.json')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest, not generateSW: it builds OUR src/sw.js for both dev and
      // production, so there is exactly one service worker and no dev/prod divergence.
      // generateSW emitted its own dist/sw.js (silently overwriting the hand-written one,
      // which killed push in production), and its dev-mode worker is a stub that ignores
      // workbox.importScripts — so push could only ever work in one environment at a time.
      // See src/sw.js for the full history.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      // VitePWA injects the one and only registration. index.html registered '/sw.js'
      // inline, App.jsx registered it in a useEffect, and usePushNotifications registered
      // it a third time — all three are gone.
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon-16x16.png', 'favicon-32x32.png'],
      // Serve the real service worker in `vite dev` too, so push is testable without a
      // production build. `type: 'module'` is required for injectManifest in dev.
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
        suppressWarnings: true,
      },
      injectManifest: {
        // Precache was 185 entries / 4.3 MB because the glob swept in the whole
        // windows11/ + ios/ icon folders (hundreds of unused tile PNGs) and the 59 KB
        // notification sound. Only the app shell needs precaching.
        globPatterns: ['**/*.{js,css,html,woff2}'],
        globIgnores: ['**/node_modules/**', 'windows11/**', 'ios/**', 'android/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      // Single source of truth for the web app manifest. public/manifest.json is gone:
      // index.html linked it while VitePWA emitted a second `manifest.webmanifest` and
      // injected a link to that as well, so the page advertised two different manifests.
      // This PWA is meant to stand in for a native Android app, so the manifest carries
      // everything Chrome/Android needs for a real installed-app experience, not just the
      // installability minimum.
      manifest: {
        // Stable app identity. Without `id`, Chrome derives it from start_url, so any
        // later change to start_url would register as a *different* app and existing
        // installs would be orphaned.
        id: '/?source=pwa',
        name: 'Bari Porichalona - House Rent Management',
        short_name: 'Bari Porichalona',
        description: 'Manage houses, flats, renters, rent collection and expenses.',
        lang: 'en',
        dir: 'ltr',
        theme_color: '#f9873c',
        background_color: '#ffffff',
        display: 'standalone',
        // Honoured in order; falls back to standalone on browsers that ignore it.
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        // Opens the installed app on the dashboard, not the marketing landing page.
        //
        // This used to be '/', which meant tapping the home-screen icon loaded the public
        // sales page — the one screen in the app that needs the network and that a
        // signed-in user never wants. '/dashboard' renders straight from the persisted
        // cache, so the app opens to real data with no connection at all. A signed-out
        // visitor is redirected to /login by the route guard, which is the right landing
        // for them too.
        //
        // Changing this is safe only because `id` above is pinned: Chrome would otherwise
        // derive app identity from start_url and treat this as a brand-new app, orphaning
        // every existing install.
        // The query marks launches from the installed icon so analytics can separate app
        // usage from browser usage.
        start_url: '/dashboard?source=pwa',
        categories: ['business', 'productivity', 'finance'],
        // Explicitly declines "install the native app instead" — there is no native app.
        prefer_related_applications: false,
        // Long-press the installed icon to jump straight into a task, which is a large
        // part of feeling like an app rather than a bookmark.
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            url: '/dashboard?source=pwa-shortcut',
            icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Houses',
            short_name: 'Houses',
            url: '/houses?source=pwa-shortcut',
            icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Notifications',
            short_name: 'Alerts',
            url: '/notification?source=pwa-shortcut',
            icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        // Every icon below is a file that actually exists in public/. The previous list
        // pointed at icon-72x72.png … icon-512x512.png (plus masked-icon.svg), none of
        // which were ever in the repo — so all eight manifest icons 404'd and the app had
        // no installable icon at all.
        //
        // Android needs both a plain and a `maskable` icon: without a maskable one the
        // launcher letterboxes the plain icon inside a white square instead of filling the
        // adaptive-icon shape.
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // NOTE: `screenshots` is deliberately absent — it needs real captures of the app
        // (with `form_factor: 'narrow'` / `'wide'`), and inventing them is not something
        // that can be generated here. Without it Android still installs fine, but shows
        // the compact install bar rather than the richer app-style install dialog.
        // See PORT_AUDIT.md §11.
      },
      // No `workbox: {...}` block — that key only applies to the generateSW strategy.
      // Navigation fallback, cache cleanup and Google-Fonts runtime caching are all
      // expressed directly in src/sw.js now, where they are visible and debuggable.
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: 3005,
  },
  build: {
    outDir: 'dist',
    // Was `true`, which shipped ~11 MB of .map files to production (the vendor chunk alone
    // emitted an 8.4 MB map) and published readable source. 'hidden' still writes maps for
    // error reporting but drops the //# sourceMappingURL comment so browsers don't fetch them.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vite's __vitePreload helper is a virtual module, so the node_modules guard
          // below returns early on it and leaves Rollup free to park it anywhere. It chose
          // the `pdf` chunk — which made the entry statically `import { _ } from
          // "./pdf-*.js"`, forcing every visitor to download 570 kB of jsPDF + html2canvas
          // on first paint just to obtain one helper function. Pin it to a chunk that is
          // part of the initial payload regardless.
          if (id.includes('vite/preload-helper')) return 'react-core'

          if (!id.includes('node_modules')) return

          // Order matters and the test must be path-anchored. The previous first line was
          //   if (id.includes('react') || ...) return 'vendor'
          // and `includes('react')` matches *any* path containing the substring — so
          // lucide-react, react-redux, react-i18next, react-toastify and react-hook-form
          // all short-circuited into 'vendor' before their own rules could run. That is
          // why the icons/redux/i18n chunks came out near-empty and vendor was 1.9 MB.
          // Package path relative to node_modules, e.g. "lucide-react/dist/…" or
          // "@reduxjs/toolkit/dist/…" — so startsWith() anchors to the package name
          // instead of matching the substring anywhere in the path.
          const pkg = id.split('node_modules/').pop()

          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-core'
          if (pkg.startsWith('react-router')) return 'react-core'

          if (pkg.startsWith('lucide-react')) return 'icons'
          // reselect and immer are claimed here, before the charts rule, because they are
          // Redux Toolkit's own dependencies *and* recharts depends on reselect too. Left
          // unclaimed, Rollup grouped reselect into the recharts chunk, so the eager entry
          // imported all 380 kB of charts just to get one selector helper.
          if (
            pkg.startsWith('@reduxjs') ||
            pkg.startsWith('react-redux') ||
            pkg.startsWith('redux-persist') ||
            pkg.startsWith('reselect') ||
            pkg.startsWith('immer')
          ) return 'redux'
          if (pkg.startsWith('i18next') || pkg.startsWith('react-i18next')) return 'i18n'
          if (pkg.startsWith('date-fns')) return 'date-fns'
          // recharts / jsPDF / html2canvas are deliberately NOT manually chunked.
          //
          // A manual chunk is a hard grouping: Rollup must put every module it claims into
          // that one chunk, including transitive dependencies shared with eagerly-loaded
          // code. Both a `charts` and a `pdf` chunk repeatedly swallowed such a shared
          // module (reselect, then Vite's preload helper, then a shared utility), and the
          // entry then had to statically import the entire 370–570 kB chunk to reach it —
          // making a lazy-only library part of first paint.
          //
          // Rollup's automatic chunking already handles these correctly: they are reachable
          // only from lazy routes, so it emits them as separate on-demand chunks and hoists
          // anything genuinely shared into a small common chunk instead of the other way round.

          // Deliberately no `return 'vendor'` catch-all.
          //
          // Forcing every remaining package into one eager `vendor` chunk pulled jsPDF's
          // and html2canvas's transitive dependencies — pako, canvg, fflate, dompurify,
          // core-js, ~680 kB of source between them — into the initial payload, even
          // though only the lazy reports/receipt routes ever touch them. The rules above
          // match by package name and so never caught those.
          //
          // Returning undefined hands placement back to Rollup, which assigns each module
          // from the import graph: anything reachable only from a lazy route stays in that
          // route's chunk, and genuinely shared code is hoisted into a shared chunk.
          return undefined
        },
      },
    },
  },
})
