import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const size = {
  width: 48,
  height: 48,
};

export const contentType = 'image/png';

export default async function Icon() {
  const iconPath = path.join(process.cwd(), 'public', 'favicon-48.png');
  const bytes = await readFile(iconPath);

  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, must-revalidate',
    },
  });
}
