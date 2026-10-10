import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  timeout: 60000,
  use: {
    /* Capture high-quality 1080p video of every UI interaction */
    video: 'on',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, /* 4K retina quality for sharp zooming in Remotion */
    actionTimeout: 15000,
    trace: 'off',
    launchOptions: {
      slowMo: 50, /* Humanize clicks and scrolling */
    },
  },
  outputDir: './public/recordings', /* WebM / MP4 recordings land here for Remotion */
});
