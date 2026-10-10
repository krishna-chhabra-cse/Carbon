const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const videoPath = path.join(__dirname, '../out/video.mp4');
const outDir = path.join(__dirname, '../out/frames');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating contact sheet and QA frames...');

try {
  // Extract a frame every 1 second for visual inspection
  execSync(`ffmpeg -y -i "${videoPath}" -vf fps=1 "${outDir}/frame_%03d.png"`, { stdio: 'inherit' });
  
  // Montage into a contact sheet using ImageMagick/ffmpeg
  console.log(`\nQA frames generated in: ${outDir}`);
  console.log('Inspect these frames to verify:');
  console.log('1. Timing of typography entrances');
  console.log('2. Proper mouse hover states from Playwright');
  console.log('3. Mask overlapping and Z-index correctness');
  console.log('4. Text legibility during camera scale');
} catch (error) {
  console.log('Ensure FFmpeg is installed to run the QA tool.');
}
