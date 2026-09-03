import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// File paths
const paths = {
  package: resolve('package.json'),
  appVersion: resolve('src/version.ts'),
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

// 3. Update README.md (the website in docs/ reads the version from the GitHub API at runtime)
let readme = readFileSync(paths.readme, 'utf-8');

// Update download links in README
readme = readme.replace(
  /releases\/download\/v.*?\//g,
  `releases/download/v${newVersion}/`
);

// Update Windows installer filename: Storytel-Player-Setup-X.Y.Z.exe
readme = readme.replace(
  /Storytel-Player-Setup-\d+\.\d+\.\d+/g,
  `Storytel-Player-Setup-${newVersion}`
);

// Update macOS and Linux filenames, keeping any arch suffix:
// Storytel-Player-X.Y.Z-mac-x64.dmg, Storytel-Player-X.Y.Z-mac-arm64.dmg,
// Storytel-Player-X.Y.Z.AppImage, Storytel-Player-X.Y.Z-arm64.AppImage
readme = readme.replace(
  /Storytel-Player-\d+\.\d+\.\d+((?:-[a-z0-9]+)*)\.(dmg|AppImage)/g,
  `Storytel-Player-${newVersion}$1.$2`
);

writeFileSync(paths.readme, readme);
console.log('✅ Updated README.md');