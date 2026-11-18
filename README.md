<div align="center">

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

# Theme Script for SillyTavern

**Add JavaScript to a SillyTavern theme**

![Version](https://img.shields.io/github/manifest-json/v/iiimabbie/ST-ThemeScript?label=version&color=8a5cf6)
![SillyTavern](https://img.shields.io/badge/SillyTavern-extension-e8a87c)
![i18n](https://img.shields.io/badge/i18n-繁中%20·%20简中%20·%20EN-2ea44f)
![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey)

[Features](#features) · [Installation](#installation) · [Usage](#usage) · [Links](#links)

</div>

## Features

- Runs the first `<script>...</script>` block in Custom CSS as a JavaScript module on startup and theme changes.
- Requests confirmation before automatically running code that has not been approved. JavaScript has full access to the page. Approvals are saved per exact script.
- Calls an optional exported `cleanup()` function before replacing or removing a script; it may be async.
- Optional early run (`data-run-at="early"`) and remote scripts (`src="https://..."`).

## Installation

1. In SillyTavern, open **Extensions** and click **Install extension**.
2. Install `https://github.com/iiimabbie/ST-ThemeScript` and enable **Theme Script**.

## Usage

Put the script block at the very end of **Custom CSS**, after every CSS rule. CSS following `</script>` loses its next rule. Without this extension the block remains inert and the preceding CSS works normally.

Editing does not execute the script. Click **Apply JS** to approve and run it, or rerun it even if unchanged. The outlined button indicates that the editor's script differs from the active script. Removing the block and clicking **Apply JS** calls cleanup. Theme changes run different approved scripts automatically; identical scripts are not restarted.

Scripts can access SillyTavern via `SillyTavern.getContext()`. They run from blob URLs, so relative or path imports do not resolve; use full HTTPS URLs for imports.

```html
<script>
const button = document.createElement('button');
button.className = 'menu_button';
button.textContent = 'Hello';
button.onclick = () => console.log(SillyTavern.getContext());
document.body.appendChild(button);

export function cleanup() {
    button.remove();
}
</script>
```

### Early run

`<script data-run-at="early">` runs an approved script while the loading screen is still showing, so themes that depend on the script for their look do not flash. A script that has not been approved does not run early and asks for confirmation once loading finishes. Without the attribute, the script runs after loading finishes as before.

### Remote scripts

`<script src="https://...">` fetches the script from a URL; only https is accepted, and code inside the tag is ignored. Approval covers the fetched content, not the URL: when the content changes, the confirmation shows the source URL and the full code again. **Apply JS** always fetches again and still asks for confirmation if the content has not been approved. If fetching fails or takes longer than 10 seconds, the running script keeps running. Remote approvals are stored as SHA-256 hashes.

If the fetched file is CSS (a `.css` URL or a `text/css` response) and contains a `<script>...</script>` block, only that block's content runs; any other file runs whole as JS, so one file can hold both the CSS and the JS. Only the JS counts for approval, so CSS changes do not ask again. The `<script>` inside the file cannot have its own `src`. Load the CSS with `@import` from the same URL:

```html
@import url("https://example.github.io/my-theme/theme.css");
<script src="https://example.github.io/my-theme/theme.css" data-run-at="early"></script>
```

## Links

- [Discord](https://discord.gg/P6kR5dpFVh): questions and bug reports
- [Rainori on Notion](https://classy-christmas-5c1.notion.site/Rainori-4188b3769594807babe7d3fd4074d118): other works by iiimabbie
