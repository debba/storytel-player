import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// File paths
const paths = {
  package: resolve('package.json'),
  appVersion: resolve('src/version.ts'),
  website: resolve('docs/index.html'),
  readme: resolve('README.md')
};

// 1. Read the new version from package.json (already updated by npm version)
const pkg = JSON.parse(readFileSync(paths.package, 'utf-8'));
const newVersion = pkg.version;

console.log(`🔄 Syncing version to ${newVersion}...`);

// 2. Update src/version.ts
const versionContent = `export const APP_VERSION = "${newVersion}";\n`;
writeFileSync(paths.appVersion, versionContent);
console.log('✅ Updated src/version.ts');

// 3. Update website/index.html
let website = readFileSync(paths.website, 'utf-8');

// Update version badge: <span class="badge version">v0.6.0</span>
website = website.replace(
  /<span class="badge version">v.*?<\/span>/,
  `<span class="badge version">v${newVersion}</span>`
);

let readme = readFileSync(paths.readme, 'utf-8');

// Update download links in README
readme = readme.replace(
  /releases\/download\/v.*?\//g,
  `releases/download/v${newVersion}/`
);

readme = readme.replace(
  /Storytel-Player-\d+\.\d+\.\d+_/g,
  `Storytel-Player-${newVersion}_`
);

writeFileSync(paths.readme, readme);
console.log('✅ Updated README.md');