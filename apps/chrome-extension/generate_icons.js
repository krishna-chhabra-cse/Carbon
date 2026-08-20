const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1x1 valid blue pixel PNG
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeQHz/xTz7AAAAABJRU5ErkJggg==';
const buf = Buffer.from(pngBase64, 'base64');

[16, 32, 48, 128].forEach(size => {
  fs.writeFileSync(path.join(iconsDir, 'icon' + size + '.png'), buf);
});

console.log('✅ Chrome extension icons generated.');
