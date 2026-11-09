const fs = require('fs');
const path = require('path');

function searchDir(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      searchDir(full, list);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      list.push(full);
    }
  }
  return list;
}

const files = searchDir('web/src');
const issues = [];

files.forEach(f => {
  if (f.includes('MayorCommandCenter')) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check for color: 'white' or color: '#ffffff' without solid background on same line
    if (/(color:\s*['"](?:white|#fff|#ffffff)['"])/i.test(line) && !/background|backgroundcolor|bg-/i.test(line)) {
      issues.push({ file: f, line: idx + 1, text: line.trim() });
    }
    // Also check for #e2e8f0 or #f1f5f9 used as color
    if (/(color:\s*['"]#(?:e2e8f0|f1f5f9|f8fafc)['"])/i.test(line)) {
      issues.push({ file: f, line: idx + 1, text: line.trim() });
    }
  });
});

console.log('Found issues:', issues.length);
issues.forEach(i => console.log(`${i.file}:${i.line}: ${i.text}`));

