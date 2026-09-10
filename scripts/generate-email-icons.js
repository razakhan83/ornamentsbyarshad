const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(__dirname, '..', 'public', 'email-icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

function iconSvg(paths, stroke, fill = 'none') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

const icons = {
  'email-white.png': iconSvg('<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>', '#ffffff'),
  'phone-white.png': iconSvg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>', '#ffffff'),
  'chat-white.png': iconSvg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', '#ffffff'),
  'thumbs-up-white.png': iconSvg('<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>', '#ffffff'),
  'star-gold.png': `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  'facebook-green.png': iconSvg('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>', 'none', '#064e3b'),
  'instagram-green.png': iconSvg('<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>', '#064e3b'),
  'whatsapp-green.png': iconSvg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', '#064e3b'),
  'globe-green.png': iconSvg('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', '#064e3b'),
  'facebook-teal.png': iconSvg('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>', 'none', '#5eead4'),
  'instagram-teal.png': iconSvg('<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>', '#5eead4'),
  'whatsapp-teal.png': iconSvg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', '#5eead4'),
  'globe-teal.png': iconSvg('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', '#5eead4'),
};

function zigzagSvg(fill) {
  const w = 600;
  const h = 16;
  const step = 20;
  const points = [`0,${h}`];
  for (let x = 0; x < w; x += step) {
    points.push(`${x + step / 2},0`);
    points.push(`${x + step},${h}`);
  }
  points.push(`${w},${h}`, `0,${h}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polygon fill="${fill}" points="${points.join(' ')}"/></svg>`;
}

async function writePng(filename, svg, width, height) {
  const filePath = path.join(dir, filename);
  await sharp(Buffer.from(svg))
    .resize(width, height, { fit: 'contain', background: transparent })
    .png()
    .toFile(filePath);
  console.log('Created', filename);
}

async function run() {
  for (const [filename, svg] of Object.entries(icons)) {
    await writePng(filename, svg, 96, 96);
  }
  await writePng('zigzag-to-white.png', zigzagSvg('#ffffff'), 600, 16);
  await writePng('zigzag-to-green.png', zigzagSvg('#E3FCEF'), 600, 16);
  await writePng('zigzag-to-body-dark.png', zigzagSvg('#1b2420'), 600, 16);
  await writePng('zigzag-to-footer-dark.png', zigzagSvg('#17231e'), 600, 16);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
