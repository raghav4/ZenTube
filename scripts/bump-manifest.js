const fs = require('fs');
const version = process.argv[2];
if (!version) { console.error('Usage: node scripts/bump-manifest.js <version>'); process.exit(1); }
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
manifest.version = version;
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json bumped to ${version}`);
