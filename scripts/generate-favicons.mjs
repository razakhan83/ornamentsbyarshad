import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_IMAGE = 'C:\\Users\\razak\\.gemini\\antigravity-ide\\brain\\e210e880-e14e-460c-89b0-53d25a6f03bf\\.user_uploaded\\media_1788567755560.png';
const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SRC_APP_DIR = path.join(ROOT_DIR, 'src', 'app');

async function createPaddedFavicon(inputBuffer, canvasSize, logoScale = 0.62) {
  // 1. Trim source image transparent margins
  const trimmedBuffer = await sharp(inputBuffer).trim().png().toBuffer();

  // 2. Resize trimmed logo to fit comfortably within the safe circle area
  const innerSize = Math.round(canvasSize * logoScale);
  const resizedLogo = await sharp(trimmedBuffer)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  // 3. Create solid white canvas and composite the resized logo in center
  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: resizedLogo,
        gravity: 'center',
      },
    ])
    .png();
}

async function generate() {
  console.log('Reading source image from:', SOURCE_IMAGE);
  const inputBuffer = await fs.readFile(SOURCE_IMAGE);

  // 1. Generate 48x48 PNG
  const p48 = await (await createPaddedFavicon(inputBuffer, 48, 0.64)).toBuffer();
  await fs.writeFile(path.join(PUBLIC_DIR, 'favicon-48.png'), p48);
  console.log('Generated public/favicon-48.png (48x48 on white bg)');

  // 2. Generate 192x192 PNG
  const p192 = await (await createPaddedFavicon(inputBuffer, 192, 0.62)).toBuffer();
  await fs.writeFile(path.join(PUBLIC_DIR, 'favicon-192.png'), p192);
  console.log('Generated public/favicon-192.png (192x192 on white bg)');

  // 3. Generate 180x180 PNG (Apple touch icon)
  const p180 = await (await createPaddedFavicon(inputBuffer, 180, 0.62)).toBuffer();
  await fs.writeFile(path.join(PUBLIC_DIR, 'apple-icon.png'), p180);
  console.log('Generated public/apple-icon.png (180x180 on white bg)');

  // 4. Generate 512x512 PNG
  const p512 = await (await createPaddedFavicon(inputBuffer, 512, 0.62)).toBuffer();
  await fs.writeFile(path.join(PUBLIC_DIR, 'icon.png'), p512);
  await fs.writeFile(path.join(PUBLIC_DIR, 'Chaina-Store-fav-icon.png'), p512);
  console.log('Generated public/icon.png & Chaina-Store-fav-icon.png (512x512 on white bg)');

  // 5. Generate favicon.ico (48x48 on white bg)
  await fs.writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), p48);
  console.log('Generated public/favicon.ico');

  // 6. Update src/app source icon files
  await fs.writeFile(path.join(SRC_APP_DIR, 'icon-source.png'), p512);
  console.log('Generated src/app/icon-source.png');

  console.log('All favicon assets updated with clean white background and circle-safe padding!');
}

generate().catch((err) => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
