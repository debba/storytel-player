const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { mkdtemp, readFile, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { generateMacUpdate } = require('../generate-mac-update.cjs');

test('macOS metadata includes both architectures with matching sizes and hashes', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'storytel-mac-update-'));
  try {
    for (const arch of ['x64', 'arm64']) {
      await writeFile(path.join(directory, `Storytel-Player-1.5.0-mac-${arch}.zip`), `archive-${arch}`);
    }
    const metadata = await readFile(await generateMacUpdate('1.5.0', directory), 'utf8');
    assert.match(metadata, /^version: 1\.5\.0$/m);
    for (const arch of ['x64', 'arm64']) {
      const contents = `archive-${arch}`;
      const hash = createHash('sha512').update(contents).digest('base64');
      assert.ok(metadata.includes(`  - url: Storytel-Player-1.5.0-mac-${arch}.zip\n    sha512: ${hash}\n    size: ${contents.length}`));
    }
    assert.match(metadata, /^path: Storytel-Player-1\.5\.0-mac-x64\.zip$/m);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('macOS metadata is not overwritten when an archive is missing or empty', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'storytel-mac-update-'));
  try {
    const output = path.join(directory, 'latest-mac.yml');
    await writeFile(output, 'previous metadata');
    await writeFile(path.join(directory, 'Storytel-Player-1.5.0-mac-x64.zip'), 'archive');
    await assert.rejects(generateMacUpdate('1.5.0', directory), /ENOENT/);
    await writeFile(path.join(directory, 'Storytel-Player-1.5.0-mac-arm64.zip'), '');
    await assert.rejects(generateMacUpdate('1.5.0', directory), /Empty update archive/);
    assert.equal(await readFile(output, 'utf8'), 'previous metadata');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
