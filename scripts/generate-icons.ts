import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const publicDir = path.resolve('public');
const svgPath = path.join(publicDir, 'icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

function renderSvg(svgStr: string, width: number, height: number): Buffer {
  const resvg = new Resvg(svgStr, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

console.log('Rendering 512x512...');
const png512 = renderSvg(svgContent, 512, 512);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

console.log('Rendering 192x192...');
const png192 = renderSvg(svgContent, 192, 192);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

console.log('Rendering apple-touch-icon.png (180x180)...');
const appleIcon = renderSvg(svgContent, 180, 180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

console.log('Rendering favicon.png (64x64)...');
const faviconPng = renderSvg(svgContent, 64, 64);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), faviconPng);

// For favicon.ico, a 32x32 PNG is universally supported by modern browsers
console.log('Rendering favicon.ico (32x32)...');
const faviconIco = renderSvg(svgContent, 32, 32);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconIco);

// For maskable icon: Ensure 80% safe zone (Android mask)
// In our SVG, all Motoniveladora elements are between coordinates X: 60-450, Y: 140-440,
// which is within the 80% safe circle of 512 (radius 205).
// We also generate an optimized maskable version with a background extension:
console.log('Rendering pwa-maskable-512x512.png...');
const maskableSvg = svgContent.replace('rx="108"', 'rx="0"');
const maskablePng = renderSvg(maskableSvg, 512, 512);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), maskablePng);

console.log('All icons generated successfully!');
