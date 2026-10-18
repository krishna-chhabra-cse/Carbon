// Headless Chrome GL backend for a storyboard. Styles that draw with WebGL
// (catalog "requires": ["webgl"]) need one: "angle" uses the GPU (Windows,
// macOS); Linux servers have no GPU, and "angle" there fails with "Could not
// create a WebGL context", so they get "swangle" (ANGLE on SwiftShader, CPU).
// REMOTION_GL overrides both. No dependencies, so backend tests can import it.
export const chromiumOptionsFor = (storyboard, { platform = process.platform, env = process.env } = {}) =>
  storyboard?.direction?.requires?.includes("webgl") ? { gl: env.REMOTION_GL || (platform === "linux" ? "swangle" : "angle") } : {};
