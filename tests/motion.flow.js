(async (page) => {
  const results = [];
  for (const permission of ["denied", "granted", "error"]) {
    await page.addInitScript((result) => {
      window.__permissionCalls = [];
      class Orientation extends Event {}
      Orientation.requestPermission = () => {
        window.__permissionCalls.push("orientation");
        if (result === "error") {
          return Promise.reject(new Error("mock rejection"));
        }
        return Promise.resolve(result);
      };
      window.DeviceOrientationEvent = Orientation;
      window.DeviceMotionEvent = class extends Event {};
      window.DeviceMotionEvent.requestPermission = () => {
        window.__permissionCalls.push("motion");
        return Promise.resolve(result === "granted" ? "granted" : "denied");
      };
    }, permission);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:5173/");
    await page.getByRole("button", { name: "Başla", exact: true }).waitFor();
    await page.getByRole("button", { name: "Başla", exact: true }).click();
    await page.getByRole("heading", { name: "Merhabalar Hanım Efendi" })
      .waitFor();
    if ((await page.evaluate(() => window.__permissionCalls)).length) {
      throw new Error("Motion permission was requested before tutorial action");
    }
    await page.getByRole("button", { name: "Hareketi etkinleştir" }).click();
    if (permission === "granted") {
      await page.evaluate(() => {
        const emit = (gamma, beta) => {
          const event = new Event("deviceorientation");
          Object.assign(event, { gamma, beta });
          window.dispatchEvent(event);
        };
        emit(0, 45);
        emit(12, 45);
      });
      await page.getByText("Telefonunu hafifçe hareket ettir ✨").waitFor();
      await page.getByText("Aşağı kaydır", { exact: true }).waitFor();
    } else await page.getByText("Parmağını ekranda gezdir ✨").waitFor();
    results.push({
      permission,
      mode: await page.locator("main").getAttribute("data-mode"),
      calls: await page.evaluate(() => window.__permissionCalls),
    });
    if (
      results.at(-1).mode !== (permission === "granted" ? "motion" : "touch")
    ) throw new Error("Incorrect permission fallback");
  }
  // Android-style API: no permission method, confirm real samples or retain touch.
  for (const sensorAvailable of [true, false]) {
    await page.goto("http://localhost:5173/");
    await page.evaluate(() => {
      window.DeviceOrientationEvent = class extends Event {};
      window.DeviceMotionEvent = class extends Event {};
    });
    await page.getByRole("button", { name: "Başla", exact: true }).click();
    await page.getByRole("heading", { name: "Merhabalar Hanım Efendi" }).waitFor();
    if (sensorAvailable) {
      await page.evaluate(() => {
        const timer = setInterval(() => {
          const event = new Event("deviceorientation");
          Object.assign(event, { gamma: 8, beta: 45 });
          window.dispatchEvent(event);
        }, 60);
        setTimeout(() => clearInterval(timer), 5000);
      });
    }
    await page.waitForTimeout(750);
    const mode = await page.locator("main").getAttribute("data-mode");
    if (mode !== (sensorAvailable ? "motion" : "touch")) {
      throw new Error("Android sensor detection selected the wrong input mode");
    }
    if (await page.getByRole("button", { name: "Hareketi etkinleştir" }).count()) {
      throw new Error("Android without permission API should not show permission action");
    }
    results.push({ platform: "android-style", sensorAvailable, mode });
  }
  return results;
});
