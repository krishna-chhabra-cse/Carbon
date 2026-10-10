import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('record cinematic product workflow', async ({ page }) => {
  // We navigate to the local or production URL directly to the app
  await page.goto('http://localhost:5173/app');
  
  // Cinematic Wait (Wait for animations to settle)
  await page.waitForTimeout(2000);

  // Mouse hover emulation for visible cursor effects
  await page.mouse.move(960, 540); // Center
  await page.mouse.wheel(0, 400); // Smooth scroll down
  await page.waitForTimeout(1000);

  // Smooth mouse movement to the input box
  const inputBounds = await page.locator('#repo-url-input').boundingBox();
  if (inputBounds) {
    await page.mouse.move(inputBounds.x + inputBounds.width / 2, inputBounds.y + inputBounds.height / 2, { steps: 50 });
    await page.waitForTimeout(500);
    await page.mouse.click(inputBounds.x + inputBounds.width / 2, inputBounds.y + inputBounds.height / 2);
    
    // Realistic typing speed
    await page.keyboard.type('https://github.com/expressjs/express', { delay: 40 });
    await page.waitForTimeout(800);
    
    // Move to Analyze button and click
    const btnBounds = await page.locator('button[type="submit"]').boundingBox();
    if (btnBounds) {
      await page.mouse.move(btnBounds.x + btnBounds.width / 2, btnBounds.y + btnBounds.height / 2, { steps: 30 });
      await page.mouse.click(btnBounds.x + btnBounds.width / 2, btnBounds.y + btnBounds.height / 2);
    }
  }

  // Let the orbital loading skeleton animate for 5 seconds
  await page.waitForTimeout(5000);

  // Save the exact timing metadata to be ingested by Remotion
  const timingData = {
    startScrapeAt: 0,
    typingStartsAt: 3.5,
    clickAnalyzeAt: 6.2,
    loadingAnimationDuration: 5.0
  };
  fs.writeFileSync(path.join(__dirname, '../recordings/timing.json'), JSON.stringify(timingData, null, 2));
});
