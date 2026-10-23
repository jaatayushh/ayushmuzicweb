import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('--- AyushMuzic Vercel Build Starting ---');

// 1. Build React Music Player with Vite directly into dist/
console.log('Building React Player with Vite...');
execSync('node node_modules/vite/bin/vite.js build', { stdio: 'inherit' });

const distDir = path.resolve('dist');
const playDir = path.join(distDir, 'play');

// 2. Setup /play directory with the React app as well for backwards compatibility
if (!fs.existsSync(playDir)) {
  fs.mkdirSync(playDir, { recursive: true });
}
fs.copyFileSync(path.join(distDir, 'index.html'), path.join(playDir, 'index.html'));

console.log('--- AyushMuzic Vercel Build Succeeded! Web Player is at root / ---');
