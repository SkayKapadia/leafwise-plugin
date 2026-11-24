# Leafwise: Claude Code plugin

This is the Claude Code plugin for **Leafwise**, a VS Code extension (also for Cursor and Windsurf) that has you predict what Claude Code will change while you wait, then review the surprises first, and grows a private tree as you go.

The plugin's only job is to tell the extension when a Claude Code run starts and ends. It makes no network calls.

## Install

1. Install the **Leafwise** extension.
   - **VS Code:** open the Extensions view, search for **Leafwise** and click **Install**, or use its [Marketplace page](https://marketplace.visualstudio.com/items?itemName=SunilKapadia.leafwise).
   - **Cursor or Windsurf** (they don't use the VS Code Marketplace): download [`leafwise.vsix`](https://github.com/SkayKapadia/leafwise-plugin/releases/latest/download/leafwise.vsix) from the [latest release](https://github.com/SkayKapadia/leafwise-plugin/releases/latest). Then open the Extensions view, click the **…** menu, choose **Install from VSIX…**, and pick the file.
2. In Claude Code, run:

   ```
   /plugin marketplace add SkayKapadia/leafwise-plugin
   /plugin install leafwise@leafwise
   ```

Requirements: git 2.31 or later and Node 18 or later on your PATH.

## Your code stays on your machine

- **Nothing is sent anywhere.** Leafwise makes no network calls, so it has no way to push, upload or share your code, your prompts or anything else. Its tests fail if any code tries to connect.
- **The plugin's script never opens your source files.** It asks git, on your machine, for a snapshot. Git reads the files and keeps the snapshot inside your own repo's `.git` folder, as `git stash -u` would. Git never pushes these snapshots and removes them later through its normal cleanup.
- **The review happens in your editor.** The extension shows you the diff between two snapshots, locally. Its saved history holds counts and outcomes, never file paths or code.

What it does keep locally: the snapshots above (which include any untracked file you have not added to `.gitignore`), and for about 48 hours one line per run with the time, the folder and the snapshot id, readable only by you.

## What the plugin does

On each prompt you submit, and each time Claude stops, its hook (`plugin/hooks/emit.js`) runs once. It:

- takes a snapshot of your working tree with a temporary git index (your real index and files are not touched);
- appends one line to a private events file: session id, folder, snapshot id and time. **It never stores your prompt.**

Events files live in `%LOCALAPPDATA%\leafwise` on Windows and `~/.leafwise` on macOS and Linux, are readable only by you, and are deleted after about 48 hours. The hook prints nothing and always exits successfully, so it can't block or change Claude's work.

## Report a problem

Open an issue in this repository.

## License

MIT. This repository is generated from the Leafwise source; the plugin script here is a built file.
