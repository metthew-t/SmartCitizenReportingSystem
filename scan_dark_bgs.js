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
const darkBgs = [];

files.forEach(f => {
  if (f.includes('MayorCommandCenter')) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/rgba\((?:15,\s*23,\s*42|17,\s*31,\s*53|30,\s*41,\s*59)/i.test(line)) {
      darkBgs.push({ file: f, line: idx + 1, text: line.trim() });
    }
  });
});

console.log('Found dark navy translucent backgrounds in non-mayor files:', darkBgs.length);
darkBgs.forEach(i => console.log(`${i.file}:${i.line}: ${i.text}`));

