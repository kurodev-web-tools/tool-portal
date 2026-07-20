import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSITOR_ROOT = join(PACKAGE_ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc");
const FFPROBE = join(COMPOSITOR_ROOT, "ffprobe.exe");
const FFMPEG = join(COMPOSITOR_ROOT, "ffmpeg.exe");
const MP4_NAME = "viewer-engagement-prompt-board-launch-ja.mp4";

export const SCHEMA_VERSION = 1;

export class RenderVerificationError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RenderVerificationError";
  }
}

const execute = async (file, args) => {
  try {
    return await execFileAsync(file, args, {
      cwd: PACKAGE_ROOT,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (cause) {
    throw new RenderVerificationError(`Command failed: ${file}`, { cause });
  }
};

export const probeVideo = async (videoPath) => {
  const { stdout } = await execute(FFPROBE, [
    "-v",
    "error",
    "-count_frames",
    "-show_entries",
    "stream=index,codec_type,codec_name,width,height,pix_fmt,color_range,color_space,color_transfer,color_primaries,r_frame_rate,avg_frame_rate,nb_frames,nb_read_frames:format=duration",
    "-of",
    "json",
    videoPath,
  ]);
  try {
    return JSON.parse(stdout);
  } catch (cause) {
    throw new RenderVerificationError("ffprobe returned invalid JSON", { cause });
  }
};

const versionLine = async (file) => (await execute(file, ["-version"])).stdout.split(/\r?\n/, 1)[0] ?? "";
const check = (name, verdict, actual) => ({ name, verdict: verdict ? "PASS" : "FAIL", actual });

export const needsNormalization = (video) =>
  video?.pix_fmt !== "yuv420p" ||
  video?.color_range !== "tv" ||
  video?.color_space !== "bt709" ||
  video?.color_transfer !== "bt709" ||
  video?.color_primaries !== "bt709";

export const buildMediaChecks = ({ video, duration, audioCount, decodePassed }) => [
  check("width", video?.width === 1920, video?.width),
  check("height", video?.height === 1080, video?.height),
  check("codec", video?.codec_name === "h264", video?.codec_name),
  check("pixel-format", video?.pix_fmt === "yuv420p", video?.pix_fmt),
  check("color-range", video?.color_range === "tv", video?.color_range),
  check("color-space", video?.color_space === "bt709", video?.color_space),
  check("color-transfer", video?.color_transfer === "bt709", video?.color_transfer),
  check("color-primaries", video?.color_primaries === "bt709", video?.color_primaries),
  check("r-frame-rate", video?.r_frame_rate === "30/1", video?.r_frame_rate),
  check("avg-frame-rate", video?.avg_frame_rate === "30/1", video?.avg_frame_rate),
  check("duration", duration >= 24.9 && duration <= 25.1, duration),
  check("audio-stream-count", audioCount === 0, audioCount),
  check("declared-frame-count", video?.nb_frames === "750", video?.nb_frames),
  check("decoded-frame-count", video?.nb_read_frames === "750", video?.nb_read_frames),
  check("full-decode", decodePassed, decodePassed ? "exit 0" : "non-zero exit"),
];

export const verifyRender = async ({
  outputRoot,
  sourceCommit,
  sourceTree,
  clean,
  compositionId,
  mp4Name,
}) => {
  const videoPath = join(outputRoot, mp4Name);
  const probe = await probeVideo(videoPath);
  const streams = Array.isArray(probe.streams) ? probe.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const audioCount = streams.filter((stream) => stream.codec_type === "audio").length;
  const duration = Number(probe.format?.duration);
  let decodePassed = true;
  try {
    await execute(FFMPEG, ["-v", "error", "-i", videoPath, "-c:v", "rawvideo", "-f", "null", "-"]);
  } catch {
    decodePassed = false;
  }
  const checks = [
    check("clean-source", clean === true, clean),
    ...buildMediaChecks({ video, duration, audioCount, decodePassed }),
  ];
  const remotionPackage = JSON.parse(
    await readFile(join(PACKAGE_ROOT, "node_modules", "remotion", "package.json"), "utf8"),
  );
  const receipt = {
    schemaVersion: SCHEMA_VERSION,
    tools: {
      node: process.version,
      remotion: remotionPackage.version,
      ffmpeg: await versionLine(FFMPEG),
      ffprobe: await versionLine(FFPROBE),
    },
    sourceCommit,
    sourceTree,
    clean: clean ? "PASS" : "FAIL",
    composition: {
      id: compositionId,
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 750,
    },
    media: {
      video,
      format: { duration: probe.format?.duration },
      audioStreamCount: audioCount,
      decode: decodePassed ? "PASS" : "FAIL",
    },
    checks,
  };
  await writeFile(join(outputRoot, "verification.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  const failed = checks.filter(({ verdict }) => verdict !== "PASS");
  if (!clean || failed.length > 0) {
    throw new RenderVerificationError(
      `Japanese render verification failed: ${failed.map(({ name }) => name).join(", ")}`,
    );
  }
  return receipt;
};

export const verifyJaRender = (options) =>
  verifyRender({
    ...options,
    compositionId: "ViewerEngagementPromptBoardLaunchJa",
    mp4Name: MP4_NAME,
  });
