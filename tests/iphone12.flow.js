(async (page) => {
  const errors = [];
  const movement = [];
  let peakSpeed = 0, peakWarp = 0;
  const warpSamples = [], horizontalSamples = [];
  const starTravel = () => page.evaluate(() =>
    window.__sceneGraph.getObjectByName("star-layer-3").children[0].material.uniforms.uTravel.value);
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.DeviceOrientationEvent = undefined;
    window.DeviceMotionEvent = undefined;
  });
  await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const gesture = async (x, y, endX, endY) => {
    const stageBefore = await page.locator("main").getAttribute("data-stage");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, radiusX: 5, radiusY: 5 }],
    });
    for (let i = 1; i <= 5; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{
          x: x + (endX - x) * i / 5,
          y: y + (endY - y) * i / 5,
          radiusX: 5,
          radiusY: 5,
        }],
      });
      await page.waitForTimeout(25);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.waitForTimeout(70);
    peakSpeed = await page.evaluate(() =>
      Math.max(
        0,
        ...Object.values(window.__sceneDebug?.planets || {}).map((p) =>
          p.speed
        ),
      )
    );
    await page.waitForTimeout(280);
    const warp = await page.evaluate(() =>
      window.__sceneGraph.getObjectByName("star-layer-3").children[0].material.uniforms.uWarp.value);
    const stageAfter = await page.locator("main").getAttribute("data-stage");
    warpSamples.push({ stageBefore, stageAfter, warp });
    peakWarp = Math.max(peakWarp, warp);
    if (stageBefore !== stageAfter) await page.screenshot({ path: `artifacts/warp-stage-${stageAfter}.png` });
    check(stageBefore !== stageAfter ? warp > .2 && warp <= .401 : warp < .02,
      "Warp must appear only on planet transitions");
    await page.waitForTimeout(1050);
  };
  const tap = async (locator) => {
    const bounds = await locator.boundingBox();
    const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  const tapPoint = async (x, y) => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.waitForTimeout(100);
  };
  const objectTap = async (id) => {
    const before = await page.evaluate(() =>
      structuredClone(window.__sceneDebug.objects)
    );
    const object = before[id];
    check(!!object, `Missing interactive object ${id}`);
    await tapPoint(
      Math.max(45, Math.min(345, object.x)),
      Math.max(85, Math.min(790, object.y)),
    );
    const after = await page.evaluate(() =>
      structuredClone(window.__sceneDebug.objects)
    );
    check(after[id].taps === object.taps + 1, `Tap did not reach ${id}`);
    for (const key of Object.keys(before)) {
      if (key !== id && after[key]) {
        check(
          after[key].taps === before[key].taps,
          `${id} incorrectly affected ${key}`,
        );
      }
    }
  };
  const swipe = (direction) =>
    gesture(40, direction === 1 ? 650 : 420, 40, direction === 1 ? 420 : 650);
  await page.getByRole("button", { name: "Başla", exact: true }).waitFor();
  await page.waitForTimeout(2300);
  check(await page.getByRole("heading", { name: "Sen Doğmadan Önce" }).count() === 1,
    "Opening title is missing");
  check(await page.locator(".permission-copy, .permission-fallback, .masthead").count() === 0,
    "Decorative or permission copy remains in opening");
  await page.screenshot({ path: "artifacts/01-start-iphone12.png" });
  await tap(page.getByRole("button", { name: "Başla", exact: true }));
  await page.getByRole("heading", { name: "Merhabalar Hanım Efendi" })
    .waitFor();
  check(
    await page.locator("main").getAttribute("data-mode") === "touch",
    "Unavailable sensor must select touch",
  );
  await page.getByText("Parmağını ekranda gezdir ✨").waitFor();
  await page.waitForTimeout(200);
  check(
    await page.evaluate(() => window.__sceneDebug.portalObjects) === 0,
    "Portal objects remain after transition",
  );
  check(
    await page.evaluate(() =>
      !window.__sceneGraph.getObjectByName("start-portal")
    ),
    "Portal remains in the actual Three.js scene",
  );
  check(await page.evaluate(() =>
    !window.__sceneGraph.getObjectByName("cluster-left") &&
    !window.__sceneGraph.getObjectByName("cluster-right")),
    "Artificial tutorial clusters remain");
  await gesture(120, 540, 260, 580);
  check(
    await page.locator("main").getAttribute("data-phase") === "TUTORIAL",
    "Diagonal drag must not navigate",
  );
  await page.getByText("Aşağı kaydır", { exact: true }).waitFor();
  await page.screenshot({ path: "artifacts/02-tutorial-iphone12.png" });
  const readHorizontal = () => page.evaluate(async () => {
    const { input } = await import("/src/experience/store.js");
    const uniforms = window.__sceneGraph.getObjectByName("star-layer-3").children[0].material.uniforms;
    return { committed: input.persistentTravelX, rendered: uniforms.uTravelX.value, committedY: input.persistentTravelY, renderedY: uniforms.uTravelY.value };
  });
  for (const direction of [1, -1]) {
    for (let i = 0; i < 6; i++) {
      const before = await readHorizontal();
      await gesture(direction > 0 ? 60 : 310, 570, direction > 0 ? 310 : 60, 570);
      const released = await readHorizontal();
      check((released.committed - before.committed) * direction > .5,
        "Consecutive horizontal swipes did not accumulate");
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart", touchPoints: [{ x: 100, y: 600 }],
      });
      await page.waitForTimeout(180);
      const touched = await readHorizontal();
      check(touched.committed === released.committed && touched.committedY === released.committedY, "Touchstart reset committed travel");
      check(Math.abs(touched.rendered - released.rendered) < .005, "Touchstart snapped the rendered field");
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      const lifted = await readHorizontal();
      check(lifted.committed === touched.committed && lifted.committedY === touched.committedY, "Touchend reset committed travel");
      horizontalSamples.push({ direction, released, touched, lifted });
    }
  }
  for (const [dx, dy] of [[180, -140], [180, 140], [-180, 140], [-180, -140]]) {
    const before = await readHorizontal();
    await gesture(195 - dx / 2, 500 - dy / 2, 195 + dx / 2, 500 + dy / 2);
    const after = await readHorizontal();
    check((after.committed - before.committed) * dx > 0 && (after.committedY - before.committedY) * dy > 0,
      "Diagonal travel must move both persistent axes");
    check((after.rendered - before.rendered) * dx > 0 && (after.renderedY - before.renderedY) * dy > 0,
      "Diagonal travel did not reach shader uniforms");
    await tapPoint(180, 610);
    const touched = await readHorizontal();
    check(after.committed === touched.committed && after.committedY === touched.committedY,
      "Tap reset diagonal travel");
  }
  const tutorialTravel = await starTravel();
  for (let i = 0; i < 4; i++) await swipe(1);
  check((await starTravel()) > tutorialTravel + 4, "Stars did not advance with tutorial swipes");
  check(
    await page.locator("main").getAttribute("data-stage") === "1",
    "Four intro swipes must enter Neptune",
  );
  const expectedTexts = await page.evaluate(async () => {
    const { stages } = await import("/src/story/storyData.js");
    return stages.slice(1).flatMap((stage) => stage.segments);
  });
  const normalizeText = (value) => value.replace(/\s+/g, " ").trim();
  const texts = [], screenshots = [];
  for (let i = 0; i < 19; i++) {
    await page.waitForTimeout(100);
    const storyMessage = page.locator(".story-message");
    check(await storyMessage.isVisible(), `Story text is not visible: ${i}`);
    check(await storyMessage.evaluate((el) => Number(getComputedStyle(el).opacity) > 0),
      `Story text remains transparent: ${i}`);
    texts.push(await storyMessage.innerText());
    check(normalizeText(texts.at(-1)) === normalizeText(expectedTexts[i]),
      `Incorrect story text: ${i}`);
    const stage = await page.locator("main").getAttribute("data-stage");
    const segment = await page.locator("main").getAttribute("data-segment");
    const planets = await page.evaluate(() =>
      structuredClone(window.__sceneDebug.planets)
    );
    const active = Object.entries(planets).find(([, p]) => !p.exiting);
    check(!!active, `No active planet at ${i}`);
    if (Number(segment) > 1) check(active[1].targetColumn === 1, "Story segment reset the chosen column");
    movement.push({ stage, segment, name: active[0], ...active[1], peakSpeed });
    if (segment === "1") {
      const beforeRow = active[1].y;
      await gesture(80, 560, 310, 560);
      await page.waitForTimeout(650);
      await objectTap(active[0]);
      await gesture(310, 560, 80, 560);
      await page.waitForTimeout(650);
      await objectTap(active[0]);
      const afterRow = await page.evaluate((name) => window.__sceneDebug.planets[name], active[0]);
      check(afterRow.targetColumn === 1 && Math.abs(afterRow.y - beforeRow) < .15,
        "Horizontal transfer changed story row");
    }
    if (stage === "2" && segment === "1") await objectTap("constellation");
    if (stage === "3" && segment === "1") await objectTap("meteor");
    if (i === 0) {
      await page.waitForTimeout(3000);
      const a = await page.evaluate(() =>
        window.__sceneDebug.planets.neptune.rotation
      );
      await page.waitForTimeout(650);
      const b = await page.evaluate(() =>
        window.__sceneDebug.planets.neptune.rotation
      );
      check(b > a, "Idle rotation stopped after scroll momentum decayed");
      const pose = () => page.evaluate(() => ({ ...window.__sceneDebug.planets.neptune }));
      const beforeLateral = await pose();
      await gesture(80, 560, 310, 560);
      const rightLateral = await pose();
      await gesture(310, 560, 80, 560);
      const leftLateral = await pose();
      check(rightLateral.x < beforeLateral.x - 1 && leftLateral.x > rightLateral.x + 1,
        "Right swipe must send planet left; left swipe must send it right");
      check(leftLateral.targetColumn === 1 && rightLateral.targetColumn === -1, "Column mapping incorrect");
      check(Math.abs(leftLateral.y - beforeLateral.y) < .1,
        "Horizontal swipe disturbed vertical story position");
    }
    const bounds = await page.locator(".story-message").boundingBox();
    check(bounds && [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
      && bounds.width > 0 && bounds.height > 0,
      `Invalid story text bounding box: ${i}`);
    check(
      bounds.x >= 20 && bounds.x + bounds.width <= 370 && bounds.y >= 70 &&
        bounds.y + bounds.height <= 800,
      `Story text outside safe viewport: ${i}`,
    );
    if (segment === "0" || i === 18) {
      const path = `artifacts/stage-${stage}-iphone12.png`;
      await page.screenshot({ path });
      screenshots.push(path);
    }
    if (i < 18) await swipe(1);
  }
  for (const stage of ["1", "2", "3", "4", "5"]) {
    const samples = movement.filter((m) => m.stage === stage);
    for (let i = 1; i < samples.length; i++) {
      check(
        samples[i].y > samples[i - 1].y + .2,
        `Planet did not travel upwards in stage ${stage}`,
      );
    }
    check(
      samples.at(-1).progress > .98,
      `Stage ${stage} did not reach its real segment count`,
    );
    check(samples.every((m) => m.speed > 0), "Planet rotation reached zero");
  }
  check(
    movement.some((m) => m.peakSpeed > .12),
    "Scroll never accelerated planet rotation",
  );
  check(
    await page.locator("[role=progressbar]").getAttribute("aria-valuenow") ===
      "100",
    "Final progress must be full",
  );
  const musicUrl = "https://www.youtube.com/watch?v=YP7ghF9pwys&list=RDYP7ghF9pwys&index=1&t=70s";
  const cta = page.getByRole("link", { name: "Müziğin tadını çıkar", exact: true });
  check(await cta.isVisible(), "Final music CTA is not visible");
  check((await cta.innerText()).trim() === "Müziğin tadını çıkar", "CTA label is incorrect");
  check(!/YouTube/i.test(await cta.innerText()), "CTA must not expose the provider name");
  check(await cta.getAttribute("href") === musicUrl, "CTA URL is incorrect");
  check(await cta.getAttribute("target") === "_blank", "CTA must open a new tab");
  const rel = (await cta.getAttribute("rel") || "").split(/\s+/);
  check(rel.includes("noopener") && rel.includes("noreferrer"), "CTA rel must be safe");
  await page.context().route(musicUrl, (route) => route.fulfill({ contentType: "text/html", body: "<title>Music destination test</title>" }));
  const opened = page.waitForEvent("popup");
  await tap(cta);
  const popup = await opened;
  await popup.waitForLoadState("domcontentloaded");
  check(popup.url() === musicUrl, "CTA did not open the supplied URL");
  await popup.close();
  await page.bringToFront();
  const finalTravel = await starTravel();
  await swipe(-1);
  check((await starTravel()) < finalTravel - .5, "Stars did not reverse with navigation");
  check(peakWarp > .2 && peakWarp <= .401, "Stage transitions never produced star streaks");
  check(
    await page.locator("main").getAttribute("data-phase") === "STORY",
    "Backward navigation from final must work",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: "artifacts/landscape.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await swipe(-1);
  check(errors.length === 0, errors.join("\n"));
  return {
    movement,
    peakWarp,
    warpSamples,
    horizontalSamples,
    segments: texts.length,
    texts,
    screenshots,
    errors,
    metrics: await page.evaluate(() => window.__cosmosMetrics),
  };
});
