<div align="center">

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

# SillyTavern 主题脚本

**为 SillyTavern 主题添加 JavaScript**

![Version](https://img.shields.io/github/manifest-json/v/iiimabbie/ST-ThemeScript?label=version&color=8a5cf6)
![SillyTavern](https://img.shields.io/badge/SillyTavern-extension-e8a87c)
![i18n](https://img.shields.io/badge/i18n-繁中%20·%20简中%20·%20EN-2ea44f)
![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey)

[功能](#功能) · [安装方法](#安装方法) · [使用方法](#使用方法)

</div>

## 功能

- 启动或切换主题时，将自定义 CSS 中第一个 `<script>...</script>` 区块作为 JavaScript 模块运行。
- 自动运行未批准的代码前会请求确认。JavaScript 可以完全访问页面；批准记录对应完全相同的脚本文本。
- 替换或移除脚本前会调用可选的导出函数 `cleanup()`；此函数可以是异步的。

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
