# 配信カンペボード X紹介動画 Stage A Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 25秒・16:9・無音の配信カンペボードX紹介動画をRemotionで再構成し、まず日本語版MP4と9枚のレビュー静止画をユーザー確認可能な状態まで制作する。

**Architecture:** marketing/viewer-engagement-prompt-board-launch-video/ をroot Next.js appから切り離した独立packageにし、typed Japanese content、750-frame timeline、props駆動のUI mock、artifact verification scriptsを分離する。Stage Aでは日本語Compositionだけを登録し、英語content/exportは作らない。承認候補はclean exact commit/treeからのみ生成し、out/ja はGit管理外のレビュー成果物とする。

**Tech Stack:** Remotion 4.0.490、React 19.2.7、TypeScript 6.0.3、Vitest 4.1.10、Biome 2.5.4、subset-font 2.5.0、fontkit 2.0.4、Node.js scripts、Remotion同梱FFmpeg/ffprobe。

---

## Scope and execution gates

- Authority: docs/superpowers/specs/2026-07-19-viewer-engagement-prompt-board-x-promo-video-design.md
- Stage Aだけを実装する。ViewerEngagementPromptBoardLaunchEn、英語visible content、英語MP4は作らない。
- production app、root package.json、root package-lock.json、runtime、browser storageは変更しない。
- 実ブラウザQAは行わない。Remotion frame、9枚のPNG、完成MP4だけを制作面として確認する。
- Xへの投稿、アップロード、予約投稿、approval.json作成は行わない。
- このworktreeではdependency mutationが未承認である。Task 1のnpm install、lockfile生成、font source取得の直前に、対象directoryとcommandを示してユーザーの明示承認を得る。
- 本計画がユーザー承認されたら、Task 1の前にこのplan fileだけを`docs: plan prompt board video implementation`としてcommitする。未追跡planを残したままclean provenance判定へ進まない。
- 実装時は @superpowers:subagent-driven-development を使い、各Taskの実装後にspec compliance reviewとcode-quality reviewを行う。
- UI構築後は @omo:visual-qa でRemotion出力だけを確認し、完成主張前は @verification-before-completion を使う。

## File map

### Standalone package

- Create: marketing/viewer-engagement-prompt-board-launch-video/.gitignore
- Create: marketing/viewer-engagement-prompt-board-launch-video/package.json
- Create: marketing/viewer-engagement-prompt-board-launch-video/package-lock.json
- Create: marketing/viewer-engagement-prompt-board-launch-video/tsconfig.json
- Create: marketing/viewer-engagement-prompt-board-launch-video/biome.json

### Deterministic contracts

- Create: marketing/viewer-engagement-prompt-board-launch-video/src/compositions.ts
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/content.ts
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/timeline.ts
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/tokens.ts
- Test: marketing/viewer-engagement-prompt-board-launch-video/src/compositions.test.ts
- Test: marketing/viewer-engagement-prompt-board-launch-video/src/content.test.ts
- Test: marketing/viewer-engagement-prompt-board-launch-video/src/timeline.test.ts

### Fonts

- Create: marketing/viewer-engagement-prompt-board-launch-video/scripts/font-source.mjs
- Create: marketing/viewer-engagement-prompt-board-launch-video/scripts/fetch-font-source.mjs
- Create: marketing/viewer-engagement-prompt-board-launch-video/scripts/build-font-subsets.mjs
- Create: marketing/viewer-engagement-prompt-board-launch-video/scripts/verify-font-coverage.mjs
- Create: marketing/viewer-engagement-prompt-board-launch-video/public/fonts/noto-sans-jp-700-promo-v1.woff2
- Create: marketing/viewer-engagement-prompt-board-launch-video/public/fonts/noto-sans-jp-900-promo-v1.woff2
- Create: marketing/viewer-engagement-prompt-board-launch-video/public/fonts/OFL.txt
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/fonts.ts

### Remotion UI

- Create: marketing/viewer-engagement-prompt-board-launch-video/src/components/MemoHook.tsx
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/components/PromptBoardMock.tsx
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/components/Cursor.tsx
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/components/Caption.tsx
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/components/EndCard.tsx
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/PromptBoardLaunch.tsx
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/Root.tsx
- Create: marketing/viewer-engagement-prompt-board-launch-video/src/index.ts
- Test: marketing/viewer-engagement-prompt-board-launch-video/src/component-copy-contract.test.ts

### Artifact tooling

- Create: marketing/viewer-engagement-prompt-board-launch-video/scripts/render-review-stills.mjs
- Create: marketing/viewer-engagement-prompt-board-launch-video/scripts/verify-ja-render.mjs
- Create: marketing/viewer-engagement-prompt-board-launch-video/scripts/build-ja-artifacts.mjs
- Test: marketing/viewer-engagement-prompt-board-launch-video/src/render-contract.test.ts
- Modify: task.md

## Chunk 1: Standalone foundation and deterministic contracts

### Task 1: Bootstrap the isolated Remotion package

**Files:** standalone package/configuration files listed above.

- [ ] **Step 1: Reconfirm repository and dependency state**

~~~bash
git status --short
git branch --show-current
test ! -e marketing/viewer-engagement-prompt-board-launch-video/node_modules
~~~

Expected: only task-owned changes; branch codex/viewer-engagement-prompt-board-promo-video-design; no local dependency tree.

- [ ] **Step 2: Obtain the live dependency approval**

Use this exact request:

~~~text
C:/Users/taka/.codex/worktrees/pbmv/V_streamer_tools/marketing/viewer-engagement-prompt-board-launch-video 内に standalone package.json/package-lock.json を作成し、このdirectoryだけで npm install --package-lock-only と npm ci を実行すること、ならびに pinned Google Fonts source 2件を取得してpackage-local subsetを生成することを承認してください。root package metadata/lockfile、他worktree、参照元dependency treeは変更しません。
~~~

Expected: stop until explicit approval.

- [ ] **Step 3: Create exact package/config contracts**

package.json must contain:

~~~json
{
  "name": "@kuro-stream-kit/viewer-engagement-prompt-board-launch-video",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "check": "npm run test && npm run typecheck && npm run lint && npm run compositions && npm run fonts:verify",
    "compositions": "remotion compositions src/index.ts",
    "fonts:fetch": "node scripts/fetch-font-source.mjs",
    "fonts:build": "node scripts/build-font-subsets.mjs",
    "fonts:verify": "node scripts/verify-font-coverage.mjs",
    "lint": "biome check src scripts",
    "render:ja:preview": "remotion render src/index.ts ViewerEngagementPromptBoardLaunchJa out/.tmp/ja-preview.mp4 --codec h264 --crf 18 --pixel-format yuv420p --muted --concurrency=1 --gl=swiftshader --overwrite --timeout=60000 --log=error",
    "review:ja": "node scripts/render-review-stills.mjs",
    "artifact:ja": "node scripts/build-ja-artifacts.mjs",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@remotion/cli": "4.0.490",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "remotion": "4.0.490"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.4",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "fontkit": "2.0.4",
    "subset-font": "2.5.0",
    "typescript": "6.0.3",
    "vitest": "4.1.10"
  }
}
~~~

Create `.gitignore` with exactly:

~~~gitignore
node_modules/
.npm-cache/
.font-source/
out/
~~~

Create `tsconfig.json` with:

~~~json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
~~~

Create `biome.json` with:

~~~json
{
  "$schema": "https://biomejs.dev/schemas/2.5.4/schema.json",
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noDefaultExport": "error",
        "noNonNullAssertion": "error",
        "noParameterAssign": "error",
        "useImportType": "error"
      },
      "suspicious": {
        "noExplicitAny": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 110
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always"
    }
  }
}
~~~

- [ ] **Step 4: Generate only the standalone dependency tree**

~~~bash
cd marketing/viewer-engagement-prompt-board-launch-video
npm install --package-lock-only --ignore-scripts
npm ci
~~~

Expected: local package-lock.json/node_modules created. Root package.json and package-lock.json remain byte-identical.

- [ ] **Step 5: Verify isolation and configuration**

~~~bash
git diff -- package.json package-lock.json
npm --prefix marketing/viewer-engagement-prompt-board-launch-video exec remotion -- --version
npm --prefix marketing/viewer-engagement-prompt-board-launch-video exec tsc -- --version
npm --prefix marketing/viewer-engagement-prompt-board-launch-video exec biome -- --version
~~~

Expected: root diff empty; Remotion 4.0.490、TypeScript 6.0.3、Biome 2.5.4。`src`/`scripts`がまだないため、このstepではtypecheck/lintを実行しない。

- [ ] **Step 6: Commit the package foundation**

~~~bash
git add marketing/viewer-engagement-prompt-board-launch-video
git commit -m "build: add prompt board video workspace"
~~~

Exclude node_modules, .npm-cache, .font-source, and out via package-local .gitignore.

### Task 2: Lock Japanese content, fixture, timeline, and Composition contracts

**Files:** compositions/content/timeline/tokens modules and tests.

- [ ] **Step 1: Write the failing Japanese-only registry test**

~~~ts
expect(COMPOSITION_IDS).toEqual(["ViewerEngagementPromptBoardLaunchJa"]);
expect(VIDEO_METADATA).toEqual({
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 750,
});
expect(Object.keys(COMPOSITION_EXPORTS)).toEqual(["ja"]);
~~~

Also scan production source files only (`src/**/*.ts` and `src/**/*.tsx`, excluding `*.test.ts` and `*.test.tsx`) and fail if they contain the forbidden ID. Build the forbidden value inside the test as `["ViewerEngagementPromptBoardLaunch", "En"].join("")` so the test does not match itself.

- [ ] **Step 2: Verify the expected failure**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video test -- src/compositions.test.ts
~~~

Expected: FAIL because implementation does not exist.

- [ ] **Step 3: Implement the one-item registry and metadata**

compositions.ts owns one readonly Japanese ID. Do not create a dormant English ID or content export.

- [ ] **Step 4: Write failing fixture/copy tests**

~~~ts
expect(JA_CONTENT.plan.id).toBe("plan-weekend-chat");
expect(JA_CONTENT.plan.title).toBe("週末雑談");
expect(JA_CONTENT.prompts).toEqual([
  {id: "prompt-weekly-recap", body: "今週あったこと", category: "talking-point", segment: "main", tone: "casual", safetyNotes: "", order: 0},
  {id: "prompt-current-favorite", body: "最近ハマっているもの", category: "talking-point", segment: "main", tone: "casual", safetyNotes: "", order: 1},
  {id: "prompt-weekend-question", body: "みんなの週末予定を聞く", category: "question", segment: "closing", tone: "casual", safetyNotes: "", order: 2},
]);
expect(JA_CONTENT.captions).toEqual([
  "配信中、次に何を話すか迷ってない？",
  "まずは配信プランを作成",
  "話したいことをカンペにまとめる",
  "配信中は、今の話題に集中",
  "準備から配信中まで、話すことをひとつに。",
  "無料ですぐ使える",
  "配信カンペボード",
  "リンクは投稿本文へ",
]);
expect(VIDEO_VISIBLE_TEXT).toContain("リンクは投稿本文へ");
expect(VIDEO_VISIBLE_TEXT.join("\n")).not.toContain("https://");
expect(VIDEO_VISIBLE_TEXT.join("\n")).not.toMatch(/completed|完了/);
expect(JA_POST_COPY).toContain("https://streamer-tools.kuro-lab.com/tools/viewer-engagement-prompt-board/");
expect(STATIC_UI_COUNTER_TEXT).toEqual(["#1", "#2", "#3", "1 / 2", "2 / 2", "3件"]);
expect(FONT_GLYPH_TEXT).toBe(
  Array.from([...VIDEO_VISIBLE_TEXT, ...STATIC_UI_COUNTER_TEXT].join(""))
    .filter((character, index, all) => all.indexOf(character) === index)
    .sort((left, right) => (left.codePointAt(0) ?? 0) - (right.codePointAt(0) ?? 0))
    .join(""),
);
~~~

The content object includes every visible UI label, the three fixture bodies, and all eight Japanese caption/CTA strings from the spec. `VIDEO_VISIBLE_TEXT` excludes `JA_POST_COPY`; only the post copy contains the public URL.

- [ ] **Step 5: Run the fixture/copy test and verify RED**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video test -- src/content.test.ts
~~~

Expected: FAIL because `content.ts` is not implemented.

- [ ] **Step 6: Implement readonly Japanese content types and values**

Use PromptCardFixture, PromptBoardVideoContent, and PromptBoardVisualState types. Components receive copy through props. This step also creates the readonly `STATIC_UI_COUNTER_TEXT` and string `FONT_GLYPH_TEXT` exports asserted above, so later font scripts import an already-tested contract.

- [ ] **Step 7: Write failing timeline tests**

~~~ts
expect(SCENES).toEqual([
  {id: "hook", from: 0, to: 90},
  {id: "plan", from: 90, to: 210},
  {id: "cards", from: 210, to: 390},
  {id: "live", from: 390, to: 570},
  {id: "value", from: 570, to: 660},
  {id: "cta", from: 660, to: 750},
]);
expect(REVIEW_FRAMES).toEqual([30, 105, 180, 270, 420, 510, 600, 690, 749]);
expect(TIMELINE.live.makeCurrentSettled).toBeLessThan(TIMELINE.live.openLiveWorkspace);
expect(TIMELINE.live.openLiveWorkspace).toBeLessThan(TIMELINE.live.nextPromptClick);
expect(TIMELINE.live).toMatchObject({
  makeCurrentPress: 406,
  makeCurrentSettled: 420,
  openLiveWorkspace: 450,
  promptOneSelected: 474,
  nextPromptClick: 520,
  promptTwoSelected: 534,
});
expect(TRANSITIONS).toEqual([
  {id: "hook-to-plan", from: 82, to: 92, duration: 10},
  {id: "plan-to-cards", from: 200, to: 210, duration: 10},
  {id: "cards-to-live", from: 380, to: 390, duration: 10},
  {id: "live-to-value", from: 560, to: 570, duration: 10},
  {id: "value-to-cta", from: 650, to: 660, duration: 10},
]);
expect(TRANSITIONS.every(({duration}) => duration >= 8 && duration <= 14)).toBe(true);
~~~

- [ ] **Step 8: Run the timeline test and verify RED**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video test -- src/timeline.test.ts
~~~

Expected: FAIL because `timeline.ts` is not implemented.

- [ ] **Step 9: Implement frame-only timeline helpers and exact product tokens**

Use the exact live timings above. Set every cross-scene opacity/translate/scale transition to 10 frames and expose a readonly `TRANSITIONS` array so tests enforce the 8–14-frame contract. `visualStateAt(frame)` must keep prompt 1 selected until frame 519 and prompt 2 selected from frame 534 onward.

tokens.ts freezes current dark tokens from app/globals.css:

~~~ts
export const TOKENS = {
  background: "rgb(10 17 23)",
  foreground: "rgb(232 240 243)",
  surface: "rgb(15 25 33)",
  surfaceMuted: "rgb(22 35 44)",
  border: "rgb(47 65 75)",
  primary: "rgb(31 178 169)",
  primaryStrong: "rgb(78 207 197)",
  primarySoft: "rgb(16 67 66)",
  muted: "rgb(152 166 176)",
  radius: 8,
  safeArea: 96,
} as const;
~~~

- [ ] **Step 10: Run and commit contracts**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run test
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run typecheck
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run lint
git add marketing/viewer-engagement-prompt-board-launch-video/src
git commit -m "test: lock prompt board video contract"
~~~

Expected: all checks pass.

### Task 3: Build and verify package-local Japanese font subsets

**Files:** font scripts/assets/fonts.ts listed above.

- [ ] **Step 1: Write the fail-closed coverage command before assets exist**

verify-font-coverage.mjs imports `FONT_GLYPH_TEXT`, opens both WOFF2 files with fontkit, and calls hasGlyphForCodePoint for every non-whitespace Unicode code point.

Implement `collectRequiredCodePoints(text)` as `new Set(Array.from(text, (character) => character.codePointAt(0)))`; call it as `collectRequiredCodePoints(FONT_GLYPH_TEXT)`, remove whitespace/undefined code points, sort numerically, and check both weights. A missing file, font parse failure, or missing glyph sets `process.exitCode = 1`; zero missing glyphs prints only weight, required count, and PASS.

- [ ] **Step 2: Verify the expected missing-asset failure**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run fonts:verify
~~~

Expected: non-zero exit naming only the two absent font paths.

- [ ] **Step 3: Pin official source provenance**

font-source.mjs contains:

~~~js
export const GOOGLE_FONTS_COMMIT = "389b770410cc0b7c21c85673bfa2077420fe7f65";
export const FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/389b770410cc0b7c21c85673bfa2077420fe7f65/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf";
export const FONT_SHA256 = "c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f";
export const OFL_URL =
  "https://raw.githubusercontent.com/google/fonts/389b770410cc0b7c21c85673bfa2077420fe7f65/ofl/notosansjp/OFL.txt";
export const OFL_SHA256 = "1c05c68c34f9708415aada51f17e1b0092d2cea709bf4a94cd38114f9e73d7d9";
~~~

fetch-font-source.mjs writes the 9,589,900-byte source only under ignored .font-source/, verifies hash, and copies verified OFL to public/fonts/OFL.txt.

- [ ] **Step 4: Generate deterministic 700/900 WOFF2 subsets**

Use subset-font 2.5.0 with targetFormat woff2 and variationAxes wght pinned to 700/900. Import the string `FONT_GLYPH_TEXT` already created and committed in Task 2; both font scripts use this same exact export. No implicit ASCII range or ambient text is added.

The script reads only `.font-source/NotoSansJP[wght].ttf`, calls `subsetFont(source, glyphText, {targetFormat: "woff2", variationAxes: {wght: weight}})` for 700 and 900, writes to temporary sibling files, validates non-zero output, then atomically renames them to the two exact public/font paths. It never uses the older thumbnail-editor seed subsets.

- [ ] **Step 5: Fetch, build, and verify**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run fonts:fetch
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run fonts:build
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run fonts:verify
~~~

Expected: both exact WOFF2 paths exist and every visible code point is covered.

- [ ] **Step 6: Implement fail-closed Remotion loading**

fonts.ts uses one delayRender handle; loads both exact FontFace sources; adds them to document.fonts; waits for document.fonts.ready; calls continueRender only on success and cancelRender on any failure. Component styles specify only the package font family.

Use `staticFile("fonts/noto-sans-jp-700-promo-v1.woff2")` and the 900 counterpart. Construct both `FontFace("Prompt Board Noto Sans JP", url(...), {weight, style: "normal"})`, await `Promise.all(face.load())`, add both to `document.fonts`, await `document.fonts.ready`, and call `continueRender` once. Catch `unknown`, normalize it to `Error`, and call `cancelRender` once.

- [ ] **Step 7: Check and commit fonts/provenance**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run test
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run typecheck
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run lint
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run fonts:verify
git add marketing/viewer-engagement-prompt-board-launch-video/scripts marketing/viewer-engagement-prompt-board-launch-video/public/fonts marketing/viewer-engagement-prompt-board-launch-video/src/fonts.ts
git commit -m "build: add deterministic prompt board video fonts"
~~~

## Chunk 2: Japanese composition and review artifacts

### Task 4: Build the reconstructed prompt-board UI components

**Files:** MemoHook, PromptBoardMock, Cursor, Caption, EndCard, and component-copy-contract.test.ts.

- [ ] **Step 1: Write a failing component copy-boundary test**

Assert the exact files `MemoHook.tsx`、`PromptBoardMock.tsx`、`Cursor.tsx`、`Caption.tsx`、`EndCard.tsx` exist; import at least `PromptBoardMock` so the test cannot pass vacuously. Then scan those exact files and fail on Japanese/English product literals or production runtime/storage imports.

- [ ] **Step 2: Verify the expected failure**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video test -- src/component-copy-contract.test.ts
~~~

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement MemoHook, Caption, and Cursor**

Leaf components receive calculated opacity/position via readonly props. Essential copy remains 96px inside the canvas; meaningful UI mock remains at least 64px inside. Caption font size is at least 54px. Cursor exposes idle, moving, pressed, and settled states.

- [ ] **Step 4: Implement PromptBoardMock states**

~~~ts
type PromptBoardVisualState =
  | {readonly kind: "plan-editor"; readonly typedCharacters: number}
  | {readonly kind: "plan-created"}
  | {readonly kind: "cards"; readonly visibleCards: 1 | 2 | 3}
  | {readonly kind: "make-current"; readonly settled: boolean}
  | {
      readonly kind: "live";
      readonly selectedPromptId: "prompt-weekly-recap" | "prompt-current-favorite";
    };
~~~

The first two prompts remain adjacent talking-point cards. Every semantic UI label is at least 28px. The live detail shows 次のカンペ for prompt 1 and switches directly to prompt 2. Never render prompt completion state.

- [ ] **Step 5: Implement EndCard**

Render 無料ですぐ使える、配信カンペボード、リンクは投稿本文へ inside the 96px safe area. CTA headline is at least 72px. No URL.

- [ ] **Step 6: Run and commit component checks**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run test
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run typecheck
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run lint
git add marketing/viewer-engagement-prompt-board-launch-video/src/components marketing/viewer-engagement-prompt-board-launch-video/src/component-copy-contract.test.ts
git commit -m "feat: reconstruct prompt board video interface"
~~~

Expected: test/typecheck/lint all exit 0; the commit contains only the five components and their contract test.

### Task 5: Compose the 25-second Japanese video

**Files:** PromptBoardLaunch.tsx, Root.tsx, index.ts.

- [ ] **Step 1: Extend the failing Root contract**

Assert Root registers exactly one Japanese Composition with locked metadata and PromptBoardLaunch owner.

- [ ] **Step 2: Verify expected failure**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video test -- src/compositions.test.ts
~~~

Expected: FAIL because Root/composition do not exist.

- [ ] **Step 3: Implement exact scene orchestration**

- Frames 0–89: problem hook.
- 90–209: plan creation and 週末雑談 reveal.
- 210–389: three prompt cards appear in order.
- 390–569: 現在の配信にする settles, live workspace opens, then 次のカンペ selects prompt 2.
- 570–659: value caption over pulled-back UI.
- 660–749: CTA remains readable through the final frame.

Transitions use only opacity/translate/scale/filter over 8–14 frames. No random, date, storage, network, audio, or browser state.

- [ ] **Step 4: Register the Japanese Composition and fonts**

Import fonts.ts once from the entry path. Root registers the exact one-item Stage A set.

- [ ] **Step 5: Run discovery and checks**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run check
~~~

Expected: all checks pass; discovery lists exactly ViewerEngagementPromptBoardLaunchJa at 1920×1080, 30fps, 750 frames.

- [ ] **Step 6: Render the preview**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run render:ja:preview
~~~

Expected: out/.tmp/ja-preview.mp4 succeeds and is muted.

- [ ] **Step 7: Commit the composition**

~~~bash
git add marketing/viewer-engagement-prompt-board-launch-video/src
git commit -m "feat: animate prompt board launch flow"
~~~

### Task 6: Add deterministic render and evidence tooling

**Files:** render-review-stills.mjs, verify-ja-render.mjs, build-ja-artifacts.mjs, render-contract.test.ts.

- [ ] **Step 1: Write failing artifact contract tests**

Assert the nine zero-padded paths, final MP4 path, schemaVersion 1, dirty-source refusal, and that Stage A never creates approval.json.

- [ ] **Step 2: Verify expected failure**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video test -- src/render-contract.test.ts
~~~

Expected: FAIL because scripts/contracts are absent.

- [ ] **Step 3: Implement nine-frame rendering**

Spawn the local Remotion CLI for frames 30, 105, 180, 270, 420, 510, 600, 690, 749. Write temporary PNGs under out/.tmp/ja/review/ and promote only after all nine succeed.

- [ ] **Step 4: Implement MP4 verification**

Resolve ffprobe.exe and ffmpeg.exe from the local Remotion compositor package. Verify width 1920, height 1080, codec h264, pixel format yuv420p, frame rate 30/1, duration 24.9–25.1s, audio stream count 0, and full decode exit 0.

Write verification.json containing schemaVersion 1, tool versions, full sourceCommit, root sourceTree, clean verdict, metadata, and named check verdicts. Write post.txt and manifest.sha256 covering MP4, nine PNGs, post.txt, and verification.json.

- [ ] **Step 5: Implement the clean provenance gate**

build-ja-artifacts.mjs must:

1. require git status --porcelain for the package and design spec to be empty;
2. capture full HEAD and HEAD^{tree};
3. render only to out/.tmp/ja first;
4. verify stills and MP4;
5. replace only exact task-owned paths under out/ja;
6. never create approval.json.

- [ ] **Step 6: Run and commit tooling**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run check
git diff --check
git add marketing/viewer-engagement-prompt-board-launch-video/scripts marketing/viewer-engagement-prompt-board-launch-video/src/render-contract.test.ts marketing/viewer-engagement-prompt-board-launch-video/package.json marketing/viewer-engagement-prompt-board-launch-video/package-lock.json
git commit -m "test: verify prompt board video artifacts"
~~~

Expected: package check and `git diff --check` exit 0; the commit contains only artifact scripts, their contract test, and direct package script/lock updates.

### Task 7: Produce and inspect the Japanese review candidate

**Files:** modify task.md; modify video source only for demonstrated visual defects; generate ignored out/ja artifacts.

- [ ] **Step 1: Confirm clean source provenance**

~~~bash
git status --short
git rev-parse HEAD
git rev-parse "HEAD^{tree}"
~~~

Expected: clean; record exact SHA/tree.

- [ ] **Step 2: Build the candidate**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run artifact:ja
~~~

Expected: final MP4, nine PNGs, verification.json, manifest.sha256, post.txt; no approval.json.

- [ ] **Step 3: Perform Remotion-surface visual QA**

Use @omo:visual-qa and inspect all nine PNGs with the local image viewer. Verify every design review-frame row, 96px safe area, minimum font sizes, CJK line breaks, cursor/action causality, absence of completion UI, and CTA readability. Review the MP4 once at normal speed and once muted. Do not open production routes.

- [ ] **Step 4: Fix only demonstrated visual defects**

Run targeted checks and preview/stills. Commit any correction before regenerating the final candidate so provenance remains clean:

~~~bash
git add marketing/viewer-engagement-prompt-board-launch-video/src
git commit -m "fix: polish prompt board launch video"
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run artifact:ja
~~~

- [ ] **Step 5: Run the complete verification bundle**

~~~bash
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run check
npm --prefix marketing/viewer-engagement-prompt-board-launch-video run artifact:ja
git diff --check
git status --short
~~~

Expected: all package/render checks pass; Git remains clean because out is ignored.

- [ ] **Step 6: Audit the promotion range**

~~~bash
git diff --name-only origin/main...HEAD
git diff origin/main...HEAD -- . ":(exclude)*.woff2"
git diff --numstat origin/main...HEAD
~~~

Inspect for secrets/private identifiers, @ts-ignore, @ts-expect-error, as any, unexpected ownership, and oversized source files. Do not print binary font contents.

- [ ] **Step 7: Record Stage A checkpoint**

Update task.md with design spec commit, final source commit/tree, artifact paths, nine-frame QA result, Japanese version awaiting explicit approval, and English/X/BGM/approval.json not started.

- [ ] **Step 8: Commit only the task checkpoint**

~~~bash
git diff --check
git add task.md
git commit -m "docs: record prompt board video review candidate"
~~~

The artifact receipt remains bound to its recorded pre-checkpoint source SHA/tree. Do not relabel it as the later docs commit.

- [ ] **Step 9: Hand off for Japanese approval**

Report clickable absolute paths for MP4, nine stills/contact sheet, verification.json, manifest.sha256, post.txt, source commit/tree, and checks. Ask whether the Japanese MP4 plus nine stills are approved for freezing. Do not create approval.json, start Stage B, push, create a PR, or post to X without separate approval.

## Completion criteria

- Stage A Composition registry is exactly [ViewerEngagementPromptBoardLaunchJa].
- Japanese MP4 is 1920×1080, 30fps, 750 frames, H.264/yuv420p, audio stream 0, and fully decodes.
- Flow is visible: plan creation → three cards → make current → live → next prompt → CTA.
- Nine exact review frames pass the acceptance map and visual QA.
- Every visible Japanese glyph is covered by package-local Noto Sans JP subsets.
- Root package metadata/lockfile and production source are unchanged.
- Candidate is bound to a clean exact source commit/tree and hash manifest.
- approval.json、English source/output、X posting、browser QA、BGM remain untouched pending explicit approval.
