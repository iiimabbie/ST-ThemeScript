<div align="center">

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

# SillyTavern 主题脚本

**为 SillyTavern 主题添加 JavaScript**

![Version](https://img.shields.io/github/manifest-json/v/iiimabbie/ST-ThemeScript?label=version&color=8a5cf6)
![SillyTavern](https://img.shields.io/badge/SillyTavern-extension-e8a87c)
![i18n](https://img.shields.io/badge/i18n-繁中%20·%20简中%20·%20EN-2ea44f)
![License](https://img.shields.io/badge/license-CC%20BY--NC--ND%204.0-lightgrey)

[功能](#功能) · [安装方法](#安装方法) · [使用方法](#使用方法) · [链接](#链接)

</div>

## 功能

- 启动或切换主题时，将自定义 CSS 中第一个 `<script>...</script>` 区块作为 JavaScript 模块运行。
- 自动运行未批准的代码前会请求确认。JavaScript 可以完全访问页面；批准记录对应完全相同的脚本文本。
- 替换或移除脚本前会调用可选的导出函数 `cleanup()`；此函数可以是异步的。
- 可选择提前运行（`data-run-at="early"`），或从网址加载脚本（`src="https://..."`）。

## 安装方法

1. 在 SillyTavern 中打开**扩展程序**，点击**安装扩展程序**。
2. 安装 `https://github.com/iiimabbie/ST-ThemeScript` 并启用 **Theme Script**。

## 使用方法

将脚本区块放在**自定义 CSS 的最末尾**，位于所有 CSS 规则之后。放在 `</script>` 之后的 CSS 会丢失下一条规则。没有安装此扩展程序时，脚本区块不会运行，前面的 CSS 仍可正常工作。

编辑时不会运行脚本。点击**应用 JS** 即可批准并运行，内容相同时也可重新运行。按钮的外框表示编辑器中的脚本与当前运行的脚本不同。移除区块后点击**应用 JS** 会调用清理函数。切换主题时会自动运行不同且已批准的脚本；相同脚本不会重启。

脚本可通过 `SillyTavern.getContext()` 访问 SillyTavern。脚本从 blob URL 运行，无法解析相对或路径导入；导入时请使用完整的 HTTPS URL。

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

### 提前运行

`<script data-run-at="early">` 会让已批准的脚本在加载画面期间就运行，靠脚本决定外观的主题就不会闪一下。未批准的脚本不会提前运行，等加载完成后再请求确认。没有此属性时，保持加载完成后才运行。

### 远程脚本

`<script src="https://...">` 从网址获取脚本，只接受 https，标签内的代码会被忽略。批准的是获取到的内容，而不是网址：内容一变就会再次确认，确认框会显示来源网址和完整代码。点击**应用 JS** 一律重新获取，内容未批准时仍会请求确认。获取失败或超过 10 秒时，正在运行的脚本会继续运行。远程脚本的批准以 SHA-256 记录。

获取到的是 CSS 文件（网址以 `.css` 结尾或响应为 `text/css`）且含有 `<script>...</script>` 区块时，只运行区块内容，所以同一个文件可以同时放 CSS 和 JS；其他文件整份当 JS 运行。批准只计算 JS，只改 CSS 不会再次确认。文件里的 `<script>` 不可再有 `src`。CSS 用同一个网址以 `@import` 加载：

```html
@import url("https://example.github.io/my-theme/theme.css");
<script src="https://example.github.io/my-theme/theme.css" data-run-at="early"></script>
```

## 链接

- [Discord](https://discord.gg/P6kR5dpFVh)：提问与反馈问题
- [Rainori Notion](https://classy-christmas-5c1.notion.site/Rainori-4188b3769594807babe7d3fd4074d118)：iiimabbie 的其他作品
