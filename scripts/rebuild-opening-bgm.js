const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const partsDir = path.join(root, 'public', 'audio', 'shady-full');
const output = path.join(root, 'public', 'audio', 'shady-opening-full.mp3');
const partNames = ['part00.b64', 'part01.b64', 'part02-07.b64'];

const chunks = partNames.map(name => {
  const encoded = fs.readFileSync(path.join(partsDir, name), 'utf8').trim();
  return Buffer.from(encoded, 'base64');
});

const audio = Buffer.concat(chunks);
const expectedSize = 1015532;
if (audio.length !== expectedSize) {
  throw new Error(`Opening BGM rebuild size mismatch: ${audio.length} !== ${expectedSize}`);
}

fs.writeFileSync(output, audio);
console.log(`Rebuilt complete opening BGM: ${audio.length} bytes`);
