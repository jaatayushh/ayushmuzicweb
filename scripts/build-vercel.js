import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('--- AyushMuzic Vercel Build Starting ---');

// 1. Build React Music Player with Vite
console.log('Building React Player with Vite...');
execSync('node node_modules/vite/bin/vite.js build', { stdio: 'inherit' });

const distDir = path.resolve('dist');
const websiteDir = path.resolve('website');
const playDir = path.join(distDir, 'play');

// 2. Setup /play directory with the React app
console.log('Configuring /play route for Web Player...');
if (!fs.existsSync(playDir)) {
  fs.mkdirSync(playDir, { recursive: true });
}
fs.copyFileSync(path.join(distDir, 'index.html'), path.join(playDir, 'index.html'));

// Copy dist/assets to dist/play/assets so relative paths resolve cleanly
const distAssets = path.join(distDir, 'assets');
const playAssets = path.join(playDir, 'assets');
if (fs.existsSync(distAssets)) {
  fs.cpSync(distAssets, playAssets, { recursive: true });
}

// 3. Set root index.html to the AyushMuzic landing/info website
console.log('Placing AyushMuzic landing website at root / ...');
fs.copyFileSync(path.join(websiteDir, 'index.html'), path.join(distDir, 'index.html'));

// 4. Copy website static files to dist/website (style.css, app.js, assets)
const distWebsite = path.join(distDir, 'website');
if (!fs.existsSync(distWebsite)) {
  fs.mkdirSync(distWebsite, { recursive: true });
}

if (fs.existsSync(path.join(websiteDir, 'style.css'))) {
  fs.copyFileSync(path.join(websiteDir, 'style.css'), path.join(distWebsite, 'style.css'));
  fs.copyFileSync(path.join(websiteDir, 'style.css'), path.join(distDir, 'style.css'));
}
if (fs.existsSync(path.join(websiteDir, 'app.js'))) {
  fs.copyFileSync(path.join(websiteDir, 'app.js'), path.join(distWebsite, 'app.js'));
  fs.copyFileSync(path.join(websiteDir, 'app.js'), path.join(distDir, 'app.js'));
}
if (fs.existsSync(path.join(websiteDir, 'assets'))) {
  fs.cpSync(path.join(websiteDir, 'assets'), path.join(distWebsite, 'assets'), { recursive: true });
  fs.cpSync(path.join(websiteDir, 'assets'), path.join(distDir, 'website/assets'), { recursive: true });
}

console.log('--- AyushMuzic Vercel Build Succeeded! ---');
