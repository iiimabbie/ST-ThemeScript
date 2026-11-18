<div align="center">

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

# SillyTavern 主題腳本

**為 SillyTavern 主題加入 JavaScript**

![Version](https://img.shields.io/github/manifest-json/v/iiimabbie/ST-ThemeScript?label=version&color=8a5cf6)
![SillyTavern](https://img.shields.io/badge/SillyTavern-extension-e8a87c)
![i18n](https://img.shields.io/badge/i18n-繁中%20·%20简中%20·%20EN-2ea44f)
![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey)

[功能](#功能) · [安裝方式](#安裝方式) · [使用方式](#使用方式) · [連結](#連結)

</div>

## 功能

- 啟動或切換主題時，將自訂 CSS 中第一個 `<script>...</script>` 區塊作為 JavaScript 模組執行。
- 自動執行未核准的程式碼之前會要求確認。JavaScript 可完整存取頁面；核准紀錄對應完全相同的腳本文字。
- 替換或移除腳本之前，會呼叫選用的匯出函式 `cleanup()`；此函式可以是非同步的。

## 安裝方式

1. 在 SillyTavern 開啟**擴充功能**，點選**安裝擴充功能**。
2. 安裝 `https://github.com/iiimabbie/ST-ThemeScript` 並啟用 **Theme Script**。

## 使用方式

將腳本區塊放在**自訂 CSS 的最末尾**，位於所有 CSS 規則之後。放在 `</script>` 之後的 CSS 會失去下一條規則。未安裝此擴充功能時，腳本區塊不會執行，前面的 CSS 仍可正常運作。

編輯時不會執行腳本。點選**套用 JS** 即可核准並執行，內容相同時也能重新執行。按鈕外框表示編輯器中的腳本與目前執行中的腳本不同。移除區塊後點選**套用 JS** 會呼叫清理函式。切換主題時會自動執行不同且已核准的腳本；相同腳本不會重啟。

腳本可透過 `SillyTavern.getContext()` 存取 SillyTavern。腳本從 blob URL 執行，無法解析相對或路徑匯入；匯入時請使用完整的 HTTPS URL。

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

## 連結

- [Discord](https://discord.gg/P6kR5dpFVh)：提問與回報問題
- [Rainori Notion](https://classy-christmas-5c1.notion.site/Rainori-4188b3769594807babe7d3fd4074d118)：iiimabbie 的其他作品
