async (page) => {
  const base = "http://localhost:3100";
  const storageKey = "v-streamer-tools-portal-workspace-sidebar";
  const widths = [390, 744, 820, 1024, 1133, 1180, 1280, 1366, 1368];
  const sidebarToolHrefs = [
    "/tools/schedule-calendar/",
    "/tools/comment-translator/",
    "/tools/thumbnail-editor/",
    "/tools/sns-split-image-maker/"
  ];
  const results = [];
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  const measure = async () => page.evaluate(() => {
    const aside = document.querySelector("aside[data-portal-workspace-sidebar-state]");
    const toggle = document.querySelector("[data-portal-workspace-sidebar-toggle]");
    const header = document.querySelector("header");

    return {
      state: aside?.getAttribute("data-portal-workspace-sidebar-state") ?? null,
      asideDisplay: aside ? getComputedStyle(aside).display : null,
      asideWidth: aside ? Math.round(aside.getBoundingClientRect().width) : null,
      togglePresent: toggle !== null,
      toggleVisible: toggle ? toggle.getClientRects().length > 0 : false,
      toggleLabel: toggle?.getAttribute("aria-label") ?? null,
      toggleExpanded: toggle?.getAttribute("aria-expanded") ?? null,
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

  const requireVisibleToolRail = async (width) => {
    for (const href of sidebarToolHrefs) {
      requireValue(
        await page.locator(`aside[data-portal-workspace-sidebar-state] a[href="${href}"]`).isVisible(),
        `${width}: compact rail must keep ${href} visible`
      );
    }
  };

  const requireVisibleMobileTools = async (width) => {
    const mobileTools = page.locator('[data-portal-mobile-implemented-tools="shared-sidebar-tools"]');
    requireValue(await mobileTools.isVisible(), `${width}: mobile implemented-tools section must be visible`);
    for (const href of sidebarToolHrefs) {
      requireValue(await mobileTools.locator(`a[href="${href}"]`).isVisible(), `${width}: mobile drawer must show ${href}`);
    }
  };

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/tools/schedule-calendar/`);

    if (width < 1024) {
      await page.evaluate((key) => {
        localStorage.setItem(key, JSON.stringify({ version: 1, state: "hidden" }));
      }, storageKey);
      await page.reload();
      await waitForSidebarState("rail");

      const mobile = await measure();
      requireValue(mobile.asideDisplay === "none", `${width}: desktop aside must stay hidden on mobile`);
      requireValue(mobile.headerDisplay !== "none", `${width}: mobile header must remain visible`);
      requireValue(!mobile.toggleVisible, `${width}: desktop preference toggle must not appear on mobile`);
      requireValue(mobile.overflow === 0, `${width}: mobile page overflow`);

      const menuButton = page.locator('header button[class~="lg:hidden"]');
      await menuButton.focus();
      await page.keyboard.press("Enter");
      const drawerVisible = await page.locator("aside.fixed.lg\\:hidden").isVisible();
      requireValue(drawerVisible, `${width}: keyboard must open mobile drawer`);
      await requireVisibleMobileTools(width);
      await page.screenshot({ path: `output/playwright/portal-sidebar/${width}-mobile-drawer.png` });
      results.push({ width, mode: "mobile", mobile, drawerVisible });
      continue;
    }

    if (width < 1280) {
      await page.evaluate((key) => {
        localStorage.setItem(key, JSON.stringify({ version: 2, state: "expanded" }));
      }, storageKey);
      await page.reload();
      await waitForSidebarState("expanded");

      const tabletExpandedPreference = await measure();
      requireValue(tabletExpandedPreference.asideDisplay === "flex", `${width}: tablet rail must remain visible`);
      requireValue(tabletExpandedPreference.asideWidth === 80, `${width}: tablet rail width must be 80`);
      requireValue(!tabletExpandedPreference.toggleVisible, `${width}: desktop preference toggle must stay hidden on tablet`);
      requireValue(tabletExpandedPreference.overflow === 0, `${width}: tablet expanded-preference page overflow`);
      await requireVisibleToolRail(width);

      await page.evaluate((key) => {
        localStorage.setItem(key, JSON.stringify({ version: 1, state: "hidden" }));
      }, storageKey);
      await page.reload();
      await waitForSidebarState("rail");

      const tabletLegacyHiddenMigration = await measure();
      requireValue(tabletLegacyHiddenMigration.state === "rail", `${width}: legacy hidden preference must migrate to compact`);
      requireValue(tabletLegacyHiddenMigration.asideDisplay === "flex", `${width}: migrated preference must render the tablet rail`);
      requireValue(tabletLegacyHiddenMigration.asideWidth === 80, `${width}: migrated preference must keep the tablet rail at 80`);
      requireValue(!tabletLegacyHiddenMigration.toggleVisible, `${width}: tablet must not expose the desktop toggle`);
      requireValue(
        await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null")?.state === "hidden", storageKey),
        `${width}: read migration must not mutate localStorage during render`
      );
      requireValue(tabletLegacyHiddenMigration.overflow === 0, `${width}: tablet migrated-preference page overflow`);
      await requireVisibleToolRail(width);
      await page.screenshot({ path: `output/playwright/portal-sidebar/${width}-tablet-rail.png` });

      await page.goto(`${base}/tools/`);
      const tabletDefaultMode = await measure();
      requireValue(tabletDefaultMode.asideDisplay === "flex", `${width}: default mode tablet rail must be visible`);
      requireValue(tabletDefaultMode.asideWidth === 80, `${width}: default mode tablet rail width must be 80`);
      requireValue(!tabletDefaultMode.togglePresent, `${width}: default mode must not render workspace toggle`);
      requireValue(tabletDefaultMode.overflow === 0, `${width}: default mode tablet page overflow`);
      await requireVisibleToolRail(width);

      results.push({ width, mode: "tablet-rail", tabletExpandedPreference, tabletLegacyHiddenMigration, tabletDefaultMode });
      continue;
    }

    await page.evaluate((key) => localStorage.removeItem(key), storageKey);
    await page.reload();
    await waitForSidebarState("expanded");

    const expanded = await measure();
    requireValue(expanded.state === "expanded", `${width}: missing preference must fall back to expanded`);
    requireValue(expanded.asideDisplay === "flex", `${width}: expanded aside must be visible`);
    requireValue(expanded.asideWidth === 288, `${width}: expanded width must be 288`);
    requireValue(expanded.toggleVisible, `${width}: desktop action toggle must be visible`);
    requireValue(expanded.toggleExpanded === "true", `${width}: expanded action state must be exposed`);
    requireValue(expanded.toggleLabel === "サイドバーをコンパクト表示", `${width}: expanded action label must describe compacting`);
    requireValue(expanded.overflow === 0, `${width}: expanded page overflow`);
    await page.screenshot({ path: `output/playwright/portal-sidebar/${width}-expanded.png` });

    const sidebarToggle = page.locator('[data-portal-workspace-sidebar-toggle="expanded-compact-only"]');
    await sidebarToggle.focus();
    await page.keyboard.press("Enter");
    const rail = await measure();
    requireValue(rail.state === "rail", `${width}: keyboard must select rail`);
    requireValue(rail.asideWidth === 80, `${width}: rail width must be 80`);
    requireValue(rail.toggleExpanded === "false", `${width}: compact action state must be exposed`);
    requireValue(rail.toggleLabel === "サイドバーを展開", `${width}: compact action label must describe expanding`);
    requireValue(
      await page.evaluate(() => document.activeElement?.hasAttribute("data-portal-workspace-sidebar-toggle")),
      `${width}: toggling compact must retain keyboard focus`
    );
    requireValue(rail.overflow === 0, `${width}: rail page overflow`);
    await requireVisibleToolRail(width);
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

    const sharedToggle = page.locator('[data-portal-workspace-sidebar-toggle="expanded-compact-only"]');
    await sharedToggle.focus();
    await page.keyboard.press("Enter");
    const reexpanded = await measure();
    requireValue(reexpanded.state === "expanded", `${width}: the same toggle must restore expanded state`);
    requireValue(reexpanded.asideWidth === 288, `${width}: restored expanded width must be 288`);
    requireValue(
      await page.evaluate(() => document.activeElement?.hasAttribute("data-portal-workspace-sidebar-toggle")),
      `${width}: restoring expanded must retain keyboard focus`
    );

    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, state: "hidden" }));
    }, storageKey);
    await page.goto(`${base}/tools/`);
    const defaultMode = await measure();
    requireValue(defaultMode.asideDisplay === "flex", `${width}: default mode must ignore hidden workspace preference`);
    requireValue(!defaultMode.togglePresent, `${width}: default mode must not render workspace toggle`);
    requireValue(defaultMode.overflow === 0, `${width}: default mode page overflow`);
    await requireVisibleToolRail(width);
    await page.screenshot({ path: `output/playwright/portal-sidebar/${width}-default.png` });

    results.push({ width, mode: "desktop", expanded, rail, railReload, sharedRail, reexpanded, defaultMode });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ version: 2, state: "rail" }));
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
