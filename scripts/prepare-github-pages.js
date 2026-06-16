const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');

if (!fs.existsSync(outDir)) {
  throw new Error('Missing out directory. Run `npm run build` before preparing GitHub Pages.');
}

fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

console.log('Prepared out/ for GitHub Pages.');
