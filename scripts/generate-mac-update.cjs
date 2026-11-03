const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const { stat, writeFile } = require('node:fs/promises');
const path = require('node:path');

async function generateMacUpdate(version, directory) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '') || !directory) {
    throw new Error('Usage: node scripts/generate-mac-update.cjs <version> <directory>');
  }
  const files = [];
  for (const arch of ['x64', 'arm64']) {
    const url = `Storytel-Player-${version}-mac-${arch}.zip`;
    const file = path.join(directory, url);
    const { size } = await stat(file);
    if (size === 0) throw new Error(`Empty update archive: ${url}`);
    const hash = createHash('sha512');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    files.push({ url, sha512: hash.digest('base64'), size });
  }
  // Both macOS jobs publish the same metadata filename. Generate the complete
  // manifest after both uploads, so the last builder cannot drop an architecture.
  const lines = [
    `version: ${version}`,
    'files:',
    ...files.flatMap(({ url, sha512, size }) => [
      `  - url: ${url}`,
      `    sha512: ${sha512}`,
      `    size: ${size}`,
    ]),
    `path: ${files[0].url}`,
    `sha512: ${files[0].sha512}`,
    `releaseDate: '${new Date().toISOString()}'`,
    '',
  ];
  const output = path.join(directory, 'latest-mac.yml');
  await writeFile(output, lines.join('\n'));
  return output;
}

module.exports = { generateMacUpdate };
if (require.main === module) {
  generateMacUpdate(process.argv[2], process.argv[3]).then(
    (output) => console.log(`Generated ${output} for Intel and Apple Silicon`),
    (error) => { console.error(error.message); process.exitCode = 1; },
  );
}
