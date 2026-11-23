"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/hook/emit.ts
var emit_exports = {};
__export(emit_exports, {
  buildEvent: () => buildEvent,
  runHook: () => runHook
});
module.exports = __toCommonJS(emit_exports);
var fs4 = __toESM(require("fs"));

// src/platform/paths.ts
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
function currentPlatform() {
  return { platform: process.platform, env: process.env, homedir: os.homedir() };
}
function eventsDir(ctx = currentPlatform()) {
  if (ctx.env.UNDERSTORY_EVENTS_DIR) return ctx.env.UNDERSTORY_EVENTS_DIR;
  if (ctx.platform === "win32") {
    const base = ctx.env.LOCALAPPDATA || path.win32.join(ctx.homedir, "AppData", "Local");
    return path.win32.join(base, "understory");
  }
  return path.posix.join(ctx.homedir, ".understory");
}
function normalizePath(input, platform = process.platform, resolveLinks = true) {
  let p = input.trim();
  if (platform === "win32") {
    const msys = /^\/([a-zA-Z])(?:\/(.*))?$/.exec(p);
    if (msys) p = `${msys[1]}:\\${msys[2] ?? ""}`;
    p = path.win32.resolve(p);
    p = p.replace(/^([a-z]):/, (_m, drive) => `${drive.toUpperCase()}:`);
  } else {
    p = path.posix.resolve(p);
  }
  if (resolveLinks && platform === process.platform) {
    try {
      p = fs.realpathSync.native(p);
    } catch {
    }
  }
  return p;
}
function ensureEventsDir(dir, platform = process.platform) {
  if (platform === "win32") {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }
  fs.mkdirSync(dir, { recursive: true, mode: 448 });
  fs.chmodSync(dir, 448);
}
function appendLine(file, line, platform = process.platform) {
  const text = line.endsWith("\n") ? line : `${line}
`;
  if (platform === "win32") fs.appendFileSync(file, text, "utf8");
  else fs.appendFileSync(file, text, { encoding: "utf8", mode: 384 });
}
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function removeFile(file, platform = process.platform) {
  try {
    fs.rmSync(file, { force: true });
    return true;
  } catch (err) {
    const code = err.code;
    if (platform === "win32" && (code === "EBUSY" || code === "EPERM")) {
      sleepSync(100);
      try {
        fs.rmSync(file, { force: true });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

// src/git/snapshot.ts
var import_crypto = require("crypto");
var fs2 = __toESM(require("fs"));
var os2 = __toESM(require("os"));
var path2 = __toESM(require("path"));

// src/git/git.ts
var import_child_process = require("child_process");
var GitTimeoutError = class extends Error {
};
var DEFAULT_TIMEOUT_MS = 1e4;
function git(cwd, args, opts = {}) {
  let timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (opts.deadline !== void 0) {
    timeout = opts.deadline - Date.now();
    if (timeout <= 0) throw new GitTimeoutError("git budget exhausted");
  }
  return (0, import_child_process.execFileSync)("git", ["-C", cwd, ...args], {
    env: opts.env ?? process.env,
    timeout,
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024
  });
}
function gitText(cwd, args, opts = {}) {
  return git(cwd, args, opts).toString("utf8").trim();
}

// src/git/snapshot.ts
var SNAPSHOT_BUDGET_MS = 2e3;
var TEMP_PREFIX = "understory-";
var STALE_TEMP_MS = 60 * 60 * 1e3;
function findRepoFast(cwd, env = process.env) {
  if (env.GIT_DIR || env.GIT_WORK_TREE || env.GIT_INDEX_FILE || env.GIT_CEILING_DIRECTORIES) return void 0;
  let dir = path2.resolve(cwd);
  for (; ; ) {
    const dotGit = path2.join(dir, ".git");
    let stat = null;
    try {
      stat = fs2.statSync(dotGit);
    } catch {
      stat = null;
    }
    if (stat?.isDirectory()) return { root: normalizePath(dir), index: path2.join(dotGit, "index") };
    if (stat?.isFile()) {
      const m = /^gitdir:\s*(.+?)\s*$/m.exec(fs2.readFileSync(dotGit, "utf8"));
      if (!m) return void 0;
      return { root: normalizePath(dir), index: path2.join(path2.resolve(dir, m[1]), "index") };
    }
    const parent = path2.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
function locateRepo(cwd, deadline) {
  try {
    const [top, index] = gitText(cwd, ["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-path", "index"], { deadline }).split(/\r?\n/);
    return top && index ? { root: normalizePath(top), index } : null;
  } catch {
    return null;
  }
}
function snapshot(root, deadline = Date.now() + SNAPSHOT_BUDGET_MS, indexPath) {
  const tmp = path2.join(os2.tmpdir(), `${TEMP_PREFIX}${(0, import_crypto.randomUUID)()}`);
  try {
    try {
      const idx = indexPath ?? gitText(root, ["rev-parse", "--path-format=absolute", "--git-path", "index"], { deadline });
      if (idx && fs2.existsSync(idx)) fs2.copyFileSync(idx, tmp);
    } catch {
      removeFile(tmp);
    }
    const env = { ...process.env, GIT_INDEX_FILE: tmp };
    git(root, ["add", "-A"], { env, deadline });
    const tree = gitText(root, ["write-tree"], { env, deadline });
    return /^[0-9a-f]{40,64}$/.test(tree) ? tree : null;
  } catch {
    return null;
  } finally {
    removeFile(tmp);
    removeFile(`${tmp}.lock`);
  }
}
function cleanStaleTempFiles(now = Date.now()) {
  const dir = os2.tmpdir();
  let names;
  try {
    names = fs2.readdirSync(dir).filter((n) => n.startsWith(TEMP_PREFIX));
  } catch {
    return;
  }
  for (const name of names) {
    const full = path2.join(dir, name);
    try {
      if (now - fs2.statSync(full).mtimeMs > STALE_TEMP_MS) removeFile(full);
    } catch {
    }
  }
}

// src/events/eventFile.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var FILE_RE = /^events-(\d{4}-\d{2}-\d{2})\.jsonl$/;
function utcDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}
function eventFileName(ms) {
  return `events-${utcDate(ms)}.jsonl`;
}
function eventFileDate(name) {
  return FILE_RE.exec(name)?.[1] ?? null;
}
function writeEvent(dir, ev, platform = process.platform) {
  ensureEventsDir(dir, platform);
  appendLine(path3.join(dir, eventFileName(Date.parse(ev.at))), JSON.stringify(ev), platform);
}
function cleanupOldEventFiles(dir, now = Date.now(), platform = process.platform) {
  const cutoff = utcDate(now - 24 * 60 * 60 * 1e3);
  let names;
  try {
    names = fs3.readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const date = eventFileDate(name);
    if (date && date < cutoff) removeFile(path3.join(dir, name), platform);
  }
}

// src/hook/emit.ts
function buildEvent(kind, input, now = Date.now()) {
  if (typeof input.session_id !== "string" || !input.session_id) return null;
  const deadline = now + SNAPSHOT_BUDGET_MS;
  const cwd = typeof input.cwd === "string" && input.cwd ? normalizePath(input.cwd) : null;
  const fast = cwd ? findRepoFast(cwd) : null;
  const repo = fast === void 0 && cwd ? locateRepo(cwd, deadline) : fast ?? null;
  const tree = repo ? snapshot(repo.root, deadline, repo.index) : null;
  return { v: 1, event: kind, session: input.session_id, cwd, root: repo?.root ?? null, tree, at: new Date(now).toISOString() };
}
function runHook(argv, stdinText, dir = eventsDir()) {
  const kind = argv[2] === "start" ? "start" : argv[2] === "end" ? "end" : null;
  if (!kind) return;
  let input;
  try {
    input = JSON.parse(stdinText);
  } catch {
    return;
  }
  const ev = buildEvent(kind, input);
  if (!ev) return;
  writeEvent(dir, ev);
  if (kind === "end") {
    cleanupOldEventFiles(dir);
    cleanStaleTempFiles();
  }
}
function main() {
  process.on("uncaughtException", () => process.exit(0));
  try {
    const stdinText = fs4.readFileSync(0, "utf8");
    runHook(process.argv, stdinText);
  } catch {
  }
  process.exitCode = 0;
}
if (require.main === module) main();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildEvent,
  runHook
});
