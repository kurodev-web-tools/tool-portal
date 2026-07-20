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
    "-show_entries",
    "stream=index,codec_type,codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_frames:format=duration",
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

export const verifyJaRender = async ({ outputRoot, sourceCommit, sourceTree, clean }) => {
  const videoPath = join(outputRoot, MP4_NAME);
  const probe = await probeVideo(videoPath);
  const streams = Array.isArray(probe.streams) ? probe.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const audioCount = streams.filter((stream) => stream.codec_type === "audio").length;
  const duration = Number(probe.format?.duration);
  const checks = [
    check("clean-source", clean === true, clean),
    check("width", video?.width === 1920, video?.width),
    check("height", video?.height === 1080, video?.height),
    check("codec", video?.codec_name === "h264", video?.codec_name),
    check("pixel-format", video?.pix_fmt === "yuv420p", video?.pix_fmt),
    check("r-frame-rate", video?.r_frame_rate === "30/1", video?.r_frame_rate),
    check("avg-frame-rate", video?.avg_frame_rate === "30/1", video?.avg_frame_rate),
    check("duration", duration >= 24.9 && duration <= 25.1, duration),
    check("audio-stream-count", audioCount === 0, audioCount),
    check("frame-count", video?.nb_frames === undefined || video.nb_frames === "750", video?.nb_frames),
  ];
  let decode = "PASS";
  try {
    await execute(FFMPEG, ["-v", "error", "-i", videoPath, "-f", "null", "-"]);
  } catch (cause) {
    decode = "FAIL";
    checks.push(check("full-decode", false, cause instanceof Error ? cause.message : "decode failed"));
  }
  if (decode === "PASS") checks.push(check("full-decode", true, "exit 0"));
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
      id: "ViewerEngagementPromptBoardLaunchJa",
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 750,
    },
    media: { video, format: { duration: probe.format?.duration }, audioStreamCount: audioCount, decode },
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
