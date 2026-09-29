const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPngBuffer(width, height, drawFn) {
  const rowLength = width * 4 + 1;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x / width, y / height, x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', idatData);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Icon rendering: Control de Maquinaria
function drawAppIcon(nx, ny, x, y, w, h, isMaskable = false) {
  // Center is (0.5, 0.5)
  const dx = nx - 0.5;
  const dy = ny - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background navy blue: #0a2342
  let r = 10, g = 35, b = 66, a = 255;

  // Gradient highlight on top
  if (ny < 0.5) {
    const factor = (0.5 - ny) * 0.4;
    r = Math.min(255, Math.round(r + 20 * factor));
    g = Math.min(255, Math.round(g + 50 * factor));
    b = Math.min(255, Math.round(b + 90 * factor));
  }

  // Industrial Gear ring in background (radius 0.38 to 0.43)
  if (dist >= 0.38 && dist <= 0.43) {
    const angle = Math.atan2(dy, dx);
    const teeth = Math.sin(angle * 12);
    if (teeth > 0) {
      r = 30; g = 60; b = 100;
    }
  }

  // --- Bulldozer Machinery in center ---
  // Tracks (caterpillar): ny from 0.56 to 0.72, nx from 0.20 to 0.74
  const inTrackX = nx >= 0.22 && nx <= 0.72;
  const inTrackY = ny >= 0.56 && ny <= 0.70;
  const trackCorner = (nx < 0.28 || nx > 0.66);

  if (inTrackX && inTrackY) {
    // Dark track body: #1e293b
    r = 30; g = 41; b = 59;

    // Track border
    if (ny < 0.58 || ny > 0.68 || nx < 0.24 || nx > 0.70) {
      r = 15; g = 23; b = 42; // Very dark border
    } else {
      // Inner wheel circles: 4 wheels at nx = 0.30, 0.42, 0.54, 0.64
      const wheelCenters = [0.31, 0.43, 0.53, 0.63];
      for (const wc of wheelCenters) {
        const wdx = (nx - wc) * w;
        const wdy = (ny - 0.63) * h;
        const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
        const wheelR = w * 0.038;
        if (wdist <= wheelR) {
          if (wdist <= wheelR * 0.45) {
            r = 15; g = 23; b = 42; // Dark inner hub
          } else {
            r = 203; g = 213; b = 225; // Silver rim
          }
        }
      }
    }
  }

  // Machine Engine Hood & Chassis (ny from 0.46 to 0.56, nx from 0.26 to 0.66)
  if (nx >= 0.26 && nx <= 0.66 && ny >= 0.48 && ny <= 0.56) {
    // Gold/Amber machine yellow: #f59e0b
    r = 245; g = 158; b = 11;
  }

  // Cabin (ny from 0.28 to 0.48, nx from 0.26 to 0.48)
  if (nx >= 0.28 && nx <= 0.48 && ny >= 0.30 && ny <= 0.48) {
    // Slanted front window
    const cabinSlope = 0.30 + (nx - 0.28) * 0.4;
    if (ny >= 0.30) {
      r = 255; g = 255; b = 255; // White cabin frame

      // Glass window cutout
      if (nx >= 0.31 && nx <= 0.45 && ny >= 0.33 && ny <= 0.45) {
        r = 10; g = 35; b = 66; // Dark tint glass
      }
    }
  }

  // Exhaust pipe
  if (nx >= 0.52 && nx <= 0.55 && ny >= 0.24 && ny <= 0.48) {
    r = 203; g = 213; b = 225; // Silver exhaust
  }

  // Bulldozer Blade in front (nx from 0.70 to 0.80, ny from 0.38 to 0.68)
  if (nx >= 0.70 && nx <= 0.78 && ny >= 0.40 && ny <= 0.68) {
    const bladeCurve = 0.70 + Math.sin((ny - 0.40) / 0.28 * Math.PI) * 0.07;
    if (nx >= bladeCurve - 0.03 && nx <= bladeCurve + 0.04) {
      r = 245; g = 158; b = 11; // Amber blade
    }
  }

  // Push Arm connecting blade to chassis
  const inArmX = nx >= 0.54 && nx <= 0.72;
  const inArmY = ny >= 0.52 && ny <= 0.60;
  if (inArmX && inArmY && (nx - 0.54) * 0.4 < (ny - 0.50)) {
    r = 217; g = 119; b = 6;
  }

  // Bottom Golden Badge Bar "CONTROL"
  if (nx >= 0.24 && nx <= 0.76 && ny >= 0.78 && ny <= 0.85) {
    r = 245; g = 158; b = 11; // Gold bar
  }

  // Maskable or rounded corners
  if (!isMaskable) {
    // Smooth rounded square with corner radius = 0.22
    const cornerR = 0.22;
    const cx = Math.max(0, Math.abs(dx) - (0.5 - cornerR));
    const cy = Math.max(0, Math.abs(dy) - (0.5 - cornerR));
    const cornerDist = Math.sqrt(cx * cx + cy * cy);
    if (cornerDist > cornerR) {
      a = 0; // Transparent outside corner
    }
  }

  return [r, g, b, a];
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. pwa-192x192.png
fs.writeFileSync(
  path.join(publicDir, 'pwa-192x192.png'),
  createPngBuffer(192, 192, (nx, ny, x, y, w, h) => drawAppIcon(nx, ny, x, y, w, h, false))
);
console.log('✓ Created pwa-192x192.png');

// 2. pwa-512x512.png
fs.writeFileSync(
  path.join(publicDir, 'pwa-512x512.png'),
  createPngBuffer(512, 512, (nx, ny, x, y, w, h) => drawAppIcon(nx, ny, x, y, w, h, false))
);
console.log('✓ Created pwa-512x512.png');

// 3. pwa-maskable-512x512.png (full bleed background for Android squircles)
fs.writeFileSync(
  path.join(publicDir, 'pwa-maskable-512x512.png'),
  createPngBuffer(512, 512, (nx, ny, x, y, w, h) => drawAppIcon(nx, ny, x, y, w, h, true))
);
console.log('✓ Created pwa-maskable-512x512.png');

// 4. apple-touch-icon.png (180x180)
fs.writeFileSync(
  path.join(publicDir, 'apple-touch-icon.png'),
  createPngBuffer(180, 180, (nx, ny, x, y, w, h) => drawAppIcon(nx, ny, x, y, w, h, true))
);
console.log('✓ Created apple-touch-icon.png');

// 5. favicon.png & favicon.ico
fs.writeFileSync(
  path.join(publicDir, 'favicon.png'),
  createPngBuffer(64, 64, (nx, ny, x, y, w, h) => drawAppIcon(nx, ny, x, y, w, h, false))
);
fs.writeFileSync(
  path.join(publicDir, 'favicon.ico'),
  createPngBuffer(48, 48, (nx, ny, x, y, w, h) => drawAppIcon(nx, ny, x, y, w, h, false))
);
console.log('✓ Created favicon.png & favicon.ico');
