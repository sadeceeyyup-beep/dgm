(async (page) => {
  // Test-only instrumentation. Native compositor readbacks do not pass through
  // JavaScript's WebGL API; stacks here identify application/dependency calls.
  await page.addInitScript(() => {
    window.__readPixelsDiagnostics = { count: 0, stacks: [] };
    for (const constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      const prototype = constructor?.prototype;
      const descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, "readPixels");
      if (!descriptor?.value) continue;
      const original = descriptor.value;
      Object.defineProperty(prototype, "readPixels", {
        ...descriptor,
        value: function (...args) {
          const diagnostic = window.__readPixelsDiagnostics;
          diagnostic.count++;
          if (diagnostic.stacks.length < 8) diagnostic.stacks.push(new Error("readPixels call").stack);
          return Reflect.apply(original, this, args);
        },
      });
    }
  });
  let phase = "without-screenshot";
  const warnings = [];
  const capture = (message) => {
    if (/outdated JSX transform|ReadPixels/i.test(message.text())) {
      warnings.push({ phase, text: message.text(), location: message.location() });
    }
  };
  page.on("console", capture);
  try {
    await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(6000);
    const beforeScreenshot = await page.evaluate(() => structuredClone(window.__readPixelsDiagnostics));
    phase = "with-screenshot";
    await page.screenshot({ path: "artifacts/warnings-probe.png" });
    await page.waitForTimeout(1000);
    const afterScreenshot = await page.evaluate(() => structuredClone(window.__readPixelsDiagnostics));
    if (warnings.some((warning) => /outdated JSX transform/i.test(warning.text))) {
      throw new Error("Outdated JSX transform warning persists");
    }
    return { beforeScreenshot, afterScreenshot, warnings };
  } finally {
    page.off("console", capture);
  }
});
