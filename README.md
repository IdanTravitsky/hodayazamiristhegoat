# Hodaya is the GOAT.

A small pixel-art tribute, made by Idan for Hodaya.

This is a standalone React and Vite site served by GitHub Pages. It needs no application server, OpenAI service, API key, or database. The optional soundtrack uses the official YouTube player; fonts and photographs are hosted with the site. Discoveries are stored only in the visitor's browser.

## Local preview

Use Node.js 22, then run `npm ci` and `npm run dev`.

`npm run build` checks TypeScript and produces a static `dist` folder. `npm run preview` serves that production build locally.

## Publishing

Pushing to `main` runs the GitHub Pages workflow. Set the repository's Pages publishing source to **GitHub Actions** and its custom domain to **www.hodayazamiristhegoat.com**. DNS for the apex and www hostnames should follow GitHub Pages' documentation. Enable HTTPS when the certificate is ready.

## Artwork and content

Pixel sprites are drawn on a fixed-resolution canvas using deliberate integer coordinates and nearest-neighbor scaling. The daylight, moonlight, and Blood Moon wardrobes contain separate costume art. Font licenses are included with the fonts. Personal photographs are supplied for this tribute; their presence in this repository does not grant permission to reuse them.
