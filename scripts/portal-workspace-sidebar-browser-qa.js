async (page) => {
  const base = "http://localhost:3100";
  const storageKey = "v-streamer-tools-portal-workspace-sidebar";
  const widths = [390, 820, 1024, 1280, 1366];
  const results = [];
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  const measure = async () => page.evaluate(() => {
    const aside = document.querySelector("aside[data-portal-workspace-sidebar-state]");
    const reopen = document.querySelector("[data-portal-workspace-sidebar-reopen]");
    const header = document.querySelector("header");

    return {
      state: aside?.getAttribute("data-portal-workspace-sidebar-state") ?? null,
      asideDisplay: aside ? getComputedStyle(aside).display : null,
      asideWidth: aside ? Math.round(aside.getBoundingClientRect().width) : null,
      reopenDisplay: reopen ? getComputedStyle(reopen).display : null,
      headerDisplay: header ? getComputedStyle(header).display : null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });

  const requireValue = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const waitForSidebarState = async (state) => {
    await page.locator(`aside[data-portal-workspace-sidebar-state="${state}"]`).waitFor({ state: "attached" });
  };

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/tools/schedule-calendar/`);

    if (width < 1024) {
      await page.evaluate((key) => {
        localStorage.setItem(key, JSON.stringify({ version: 1, state: "hidden" }));
      }, storageKey);
      await page.reload();
      await waitForSidebarState("hidden");

      const mobile = await measure();
      requireValue(mobile.asideDisplay === "none", `${width}: desktop aside must stay hidden on mobile`);
      requireValue(mobile.headerDisplay !== "none", `${width}: mobile header must remain visible`);
      requireValue(mobile.reopenDisplay === "none", `${width}: desktop reopen control must not appear on mobile`);
      requireValue(mobile.overflow === 0, `${width}: mobile page overflow`);

      const menuButton = page.locator('header button[class~="lg:hidden"]');
      await menuButton.focus();
      await page.keyboard.press("Enter");
      const drawerVisible = await page.locator("aside.fixed.lg\\:hidden").isVisible();
      requireValue(drawerVisible, `${width}: keyboard must open mobile drawer`);
      await page.screenshot({ path: `output/playwright/portal-sidebar/${width}-mobile-drawer.png` });
      results.push({ width, mode: "mobile", mobile, drawerVisible });
      continue;
    }

    await page.evaluate((key) => localStorage.removeItem(key), storageKey);
    await page.reload();
    await waitForSidebarState("expanded");

    const expanded = await measure();
    requireValue(expanded.state === "expanded", `${width}: missing preference must fall back to expanded`);
    requireValue(expanded.asideDisplay === "flex", `${width}: expanded aside must be visible`);
    requireValue(expanded.asideWidth === 288, `${width}: expanded width must be 288`);
    requireValue(expanded.overflow === 0, `${width}: expanded page overflow`);
    await page.screenshot({ path: `output/playwright/portal-sidebar/${width}-expanded.png` });

    const railControl = page.locator("[data-portal-workspace-sidebar-control=rail]");
    await railControl.focus();
    await page.keyboard.press("Enter");
    const rail = await measure();
    requireValue(rail.state === "rail", `${width}: keyboard must select rail`);
    requireValue(rail.asideWidth === 80, `${width}: rail width must be 80`);
    requireValue(rail.overflow === 0, `${width}: rail page overflow`);
    requireValue(
      await page.locator('aside[data-portal-workspace-sidebar-state] nav a[href="/"]').getAttribute("aria-label") === "Home",
      `${width}: rail navigation must retain its full accessible name`
    );

    await page.reload();
    await waitForSidebarState("rail");
    const railReload = await measure();
    requireValue(railReload.state === "rail", `${width}: rail must persist after reload`);

    await page.goto(`${base}/tools/sns-split-image-maker/`);
    await waitForSidebarState("rail");
    const sharedRail = await measure();
    requireValue(sharedRail.state === "rail", `${width}: rail must be shared across workspace tools`);
    requireValue(sharedRail.overflow === 0, `${width}: shared rail page overflow`);
    await page.screenshot({ path: `output/playwright/portal-sidebar/${width}-rail.png` });

    const hiddenControl = page.locator("[data-portal-workspace-sidebar-control=hidden]");
    await hiddenControl.focus();
    await page.keyboard.press("Enter");
    const hidden = await measure();
    requireValue(hidden.state === "hidden", `${width}: hidden state must be selected`);
    requireValue(hidden.asideDisplay === "none", `${width}: hidden aside must not occupy layout`);
    requireValue(hidden.reopenDisplay !== "none", `${width}: reopen control must remain visible`);
    requireValue(hidden.overflow === 0, `${width}: hidden page overflow`);
    requireValue(
      await page.evaluate(() => document.activeElement?.hasAttribute("data-portal-workspace-sidebar-reopen")),
      `${width}: hiding must transfer focus to the persistent reopen control`
    );
    await page.screenshot({ path: `output/playwright/portal-sidebar/${width}-hidden.png` });

    const reopen = page.locator("[data-portal-workspace-sidebar-reopen]");
    await page.keyboard.press("Enter");
    const reopened = await measure();
    requireValue(reopened.state === "expanded", `${width}: keyboard reopen must restore expanded`);
    requireValue(
      await page.evaluate(() => document.activeElement?.getAttribute("data-portal-workspace-sidebar-control") === "expanded"),
      `${width}: reopening must transfer focus to the restored expanded control`
    );

    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, state: "hidden" }));
    }, storageKey);
    await page.goto(`${base}/tools/`);
    const defaultMode = await measure();
    requireValue(defaultMode.asideDisplay === "flex", `${width}: default mode must ignore hidden workspace preference`);
    requireValue(defaultMode.reopenDisplay === null, `${width}: default mode must not render workspace reopen control`);
    requireValue(await page.locator("[data-portal-workspace-sidebar-control]").count() === 0, `${width}: default mode must not render workspace controls`);
    requireValue(defaultMode.overflow === 0, `${width}: default mode page overflow`);
    await page.screenshot({ path: `output/playwright/portal-sidebar/${width}-default.png` });

    results.push({ width, mode: "desktop", expanded, rail, railReload, sharedRail, hidden, reopened, defaultMode });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, state: "rail" }));
  }, storageKey);

  const regressionRoutes = [
    "/tools/schedule-calendar/",
    "/tools/thumbnail-editor/",
    "/tools/sns-split-image-maker/",
    "/tools/comment-translator/",
    "/admin/",
    "/admin/comment-translator/"
  ];
  const routeResults = [];

  for (const route of regressionRoutes) {
    await page.goto(`${base}${route}`);
    await waitForSidebarState("rail");
    const routeMeasure = await measure();
    requireValue(routeMeasure.state === "rail", `${route}: shared workspace rail missing`);
    requireValue(routeMeasure.overflow === 0, `${route}: page overflow`);
    routeResults.push({ route, state: routeMeasure.state, overflow: routeMeasure.overflow, title: await page.title() });
  }

  await page.goto(`${base}/tools/schedule-calendar/`);
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ version: 999, state: "hidden" }));
  }, storageKey);
  await page.reload();
  await waitForSidebarState("expanded");
  const unknownVersionFallback = await measure();
  requireValue(unknownVersionFallback.state === "expanded", "unknown version must fall back to expanded");

  return {
    results,
    routeResults,
    unknownVersionFallback,
    consoleErrorCount: consoleErrors.length,
    consoleErrors
  };
}
