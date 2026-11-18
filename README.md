<div align="center">

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

# Theme Script for SillyTavern

**Add JavaScript to a SillyTavern theme**

![Version](https://img.shields.io/github/manifest-json/v/iiimabbie/ST-ThemeScript?label=version&color=8a5cf6)
![SillyTavern](https://img.shields.io/badge/SillyTavern-extension-e8a87c)
![i18n](https://img.shields.io/badge/i18n-繁中%20·%20简中%20·%20EN-2ea44f)
![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey)

[Features](#features) · [Installation](#installation) · [Usage](#usage)

</div>

## Features

- Runs the first `<script>...</script>` block in Custom CSS as a JavaScript module on startup and theme changes.
- Requests confirmation before automatically running code that has not been approved. JavaScript has full access to the page. Approvals are saved per exact script.
- Calls an optional exported `cleanup()` function before replacing or removing a script; it may be async.

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
