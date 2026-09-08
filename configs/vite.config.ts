import {defineConfig} from '@virmator/frontend/configs/vite.config.base.js';
import {resolve} from 'node:path';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(
    {
        /** Deploying to Netlify (design doc §10), not GitHub Pages — base path must stay "/". */
        forGitHubPages: false,
        packageDirPath: resolve(import.meta.dirname, '..'),
    },
    (baseConfig) => {
        return {
            ...baseConfig,
            plugins: [
                ...(baseConfig.plugins ?? []),
                ...VitePWA({
                    registerType: 'autoUpdate',
                    manifest: {
                        name: 'Codex Malaphorum',
                        short_name: 'Codex Malaphorum',
                        description:
                            "A personal codex of hand-crafted malaphors and the idioms they're built from.",
                        display: 'standalone',
                        theme_color: '#4A3B2A',
                        background_color: '#E3D9C2',
                        start_url: '/',
                        icons: [
                            {
                                src: 'icons/icon-192.png',
                                sizes: '192x192',
                                type: 'image/png',
                            },
                            {
                                src: 'icons/icon-512.png',
                                sizes: '512x512',
                                type: 'image/png',
                            },
                            {
                                src: 'icons/icon-512-maskable.png',
                                sizes: '512x512',
                                type: 'image/png',
                                purpose: 'maskable',
                            },
                        ],
                    },
                    workbox: {
                        /**
                         * No network content in this app — "cache everything" is the whole strategy
                         * (design doc §10 PWA).
                         */
                        globPatterns: [
                            '**/*.{js,css,html,woff2,png}',
                        ],
                    },
                }),
            ],
        };
    },
);
