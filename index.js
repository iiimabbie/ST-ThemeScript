import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { eventSource, event_types } from '../../../events.js';
import { t, translate } from '../../../i18n.js';
import { callGenericPopup, POPUP_RESULT, POPUP_TYPE } from '../../../popup.js';
import { power_user } from '../../../power-user.js';

const settingsKey = 'ST-ThemeScript';
let activeModule = null;
let activeKey = '';
let requestId = 0;
let execution = Promise.resolve();
// 「套用 JS」按鈕在 APP_READY 才建立，提早執行時還沒有。
let applyButton = null;

const scriptBlock = /<script\b([^>]*)>([\s\S]*?)<\/script>/i;

// 回傳第一個 <script> 區塊；沒有區塊時 code 與 src 都是空字串。
function extractScript(css) {
    const match = css.match(scriptBlock);
    const template = document.createElement('template');
    template.innerHTML = `<script${match?.[1] || ''}></script>`;
    const tag = template.content.firstElementChild;
    const code = match?.[2] || '';
    return {
        code: code.trim() ? code : '',
        src: tag.getAttribute('src')?.trim() || '',
        early: tag.dataset.runAt === 'early',
    };
}

// 遠端腳本以網址辨識，內嵌腳本以程式碼辨識。
function scriptKey(script) {
    return script.src ? `src:${script.src}` : script.code;
}

async function loadCode(script) {
    if (!script.src) return script.code;
    if (new URL(script.src, location.href).protocol !== 'https:') throw new Error(t`src 只接受 https 網址`);
    const response = await fetch(script.src, { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    // CSS 檔可兼作主題的 @import：只執行其中 <script> 區塊的內文。其他檔案整份當 JS。
    const text = await response.text();
    const isCss = response.headers.get('Content-Type')?.includes('text/css') || new URL(script.src).pathname.endsWith('.css');
    if (!isCss || !scriptBlock.test(text)) return text;
    const inner = extractScript(text);
    if (inner.src) throw new Error(t`遠端檔案的 <script> 不可再有 src`);
    return inner.code;
}

function hashScript(code) {
    let first = 0xdeadbeef;
    let second = 0x41c6ce57;
    for (const char of code.split('')) {
        const value = char.charCodeAt(0);
        first = Math.imul(first ^ value, 2654435761);
        second = Math.imul(second ^ value, 1597334677);
    }
    first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
    second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);
    return String(4294967296 * (2097151 & second) + (first >>> 0));
}

const SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value, bits) {
    return (value >>> bits) | (value << (32 - bits));
}

// crypto.subtle 只在 HTTPS 或 localhost 可用，用區網 http 開酒館時沒有，所以自己算。
function sha256(text) {
    const bytes = new TextEncoder().encode(text);
    const padded = new Uint8Array(((bytes.length + 72) >> 6) << 6);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, Math.floor(bytes.length / 0x20000000));
    view.setUint32(padded.length - 4, bytes.length * 8);
    const hash = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const words = new Uint32Array(64);
    for (let offset = 0; offset < padded.length; offset += 64) {
        for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4);
        for (let i = 16; i < 64; i++) {
            const low = words[i - 15];
            const high = words[i - 2];
            words[i] = words[i - 16] + (rotr(low, 7) ^ rotr(low, 18) ^ (low >>> 3)) + words[i - 7] + (rotr(high, 17) ^ rotr(high, 19) ^ (high >>> 10));
        }
        let [a, b, c, d, e, f, g, h] = hash;
        for (let i = 0; i < 64; i++) {
            const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + SHA256_K[i] + words[i]) | 0;
            const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
            [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) | 0, c, b, a, (t1 + t2) | 0];
        }
        [a, b, c, d, e, f, g, h].forEach((value, i) => { hash[i] += value; });
    }
    return Array.from(hash, value => value.toString(16).padStart(8, '0')).join('');
}

// 遠端內容由別人控制，可能被刻意做成相同的 hashScript，所以改用 SHA-256。
// 內嵌腳本沿用 hashScript，既有核准才不會失效。
function approvalHash(code, remote) {
    return remote ? `sha256:${sha256(code)}` : hashScript(code);
}

function isApproved(code, remote) {
    return extension_settings[settingsKey].approved.includes(approvalHash(code, remote));
}

function approve(code, remote) {
    if (isApproved(code, remote)) return;
    extension_settings[settingsKey].approved.push(approvalHash(code, remote));
    saveSettingsDebounced();
}

function showError(error) {
    console.error('[Theme Script]', error);
    toastr.error(String(error?.message || error));
}

async function cleanup() {
    const previous = activeModule;
    activeModule = null;
    activeKey = '';
    try {
        if (typeof previous?.cleanup === 'function') await previous.cleanup();
    } catch (error) {
        showError(error);
    }
}

function updatePending() {
    const textarea = document.getElementById('customCSS');
    applyButton?.classList.toggle('theme-script-pending', scriptKey(extractScript(textarea.value)) !== activeKey);
}

async function confirmRun(code, src) {
    const content = document.createElement('div');
    const message = document.createElement('p');
    message.textContent = t`此主題包含 JavaScript (腳本)，執行後可以完整存取此頁面。是否允許執行？`;
    const hint = document.createElement('p');
    const example = document.createElement('code');
    example.textContent = t`請幫我解析此段js，在sillytavern執行有無資料外洩風險。`;
    hint.append(t`若不確定危險性，請整段丟給 AI 判斷。範例例句：`, example);
    content.append(message, hint);
    if (src) {
        const source = document.createElement('p');
        const url = document.createElement('code');
        url.textContent = src;
        source.append(t`來源網址：`, url);
        content.append(source);
    }
    const preview = document.createElement('pre');
    preview.className = 'theme-script-preview';
    preview.textContent = code;
    content.append(preview);
    return await callGenericPopup(content, POPUP_TYPE.CONFIRM, '', { wide: true }) === POPUP_RESULT.AFFIRMATIVE;
}

// explicit：使用者按「套用 JS」。early：載入畫面期間，未核准的腳本留到 APP_READY 再確認。
function requestRun(script, { explicit = false, early = false } = {}) {
    const id = ++requestId;
    const key = scriptKey(script);
    const remote = Boolean(script.src);
    execution = execution.then(async () => {
        if (id !== requestId || (!explicit && key === activeKey)) return;
        let code;
        try {
            code = await loadCode(script);
        } catch (error) {
            console.error('[Theme Script]', script.src, error);
            if (explicit) toastr.error(t`無法載入遠端腳本：${error.message}`);
            return;
        }
        if (id !== requestId || (early && code && !isApproved(code, remote))) return;

        await cleanup();
        updatePending();
        if (id !== requestId) return;
        if (!code) {
            if (explicit) toastr.info(t`沒有 JS，已停止原本的腳本`);
            return;
        }

        // 按鈕只核准內嵌腳本；遠端內容是抓回來才看到的，仍要確認。
        if (!isApproved(code, remote) && (remote || !explicit)) {
            const allowed = await confirmRun(code, script.src);
            if (id !== requestId || !allowed) return;
        }
        approve(code, remote);

        const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        try {
            activeModule = await import(url);
            activeKey = key;
            if (id !== requestId) await cleanup();
            else if (explicit) toastr.success(t`JS 已套用`);
        } catch (error) {
            showError(error);
        } finally {
            URL.revokeObjectURL(url);
            updatePending();
        }
    });
}

function currentScript() {
    return extractScript(power_user.custom_css);
}

const HELP_ITEMS = [
    '把 JS 用 `<script>...</script>` 包起來，放在客製 CSS 的最後面。`</script>` 後面不要再寫 CSS，緊接在後面的第一段會失效。',
    '打字時只有 CSS 會即時生效，JS 要按「套用 JS」才會執行。按鈕有外框，代表有改動還沒套用。',
    '切換主題或重新整理頁面時會自動執行。沒同意過的腳本會先跳確認框。',
    '寫成 `<script data-run-at="early">`，同意過的腳本會在載入畫面時就執行，適合決定外觀的主題。沒同意過的，等載入完成再確認。',
    '寫成 `<script src="https://...">` 可以從網址載入腳本，只接受 https，標籤裡的程式碼會被忽略。CSS 檔（`.css` 網址或 `text/css`）裡有 `<script>` 區塊時只執行區塊內的 JS，所以同一個檔案也能給 `@import` 載入 CSS。同意的是抓回來的 JS，JS 改了會重新確認；按「套用 JS」會重新抓取。',
    '腳本可以寫 `export function cleanup()`，換腳本、換主題或刪掉腳本之前，會先呼叫它收拾。',
    '用 `SillyTavern.getContext()` 存取酒館。要 import 其他模組，請寫完整的 https 網址。',
    '沒裝這個擴充的人匯入主題時，CSS 照常生效，JS 不會執行。',
];

const HELP_EXAMPLE = `<script>
const button = document.createElement('button');
button.className = 'menu_button';
button.textContent = 'Hello';
document.body.append(button);

export function cleanup() {
    button.remove();
}
</script>`;

// 反引號包住的片段顯示成 <code>。
function withCode(text) {
    return text.split('`').map((part, index) => {
        if (index % 2 === 0) return document.createTextNode(part);
        const code = document.createElement('code');
        code.textContent = part;
        return code;
    });
}

function showHelp() {
    const content = document.createElement('div');
    content.className = 'theme-script-help';
    const title = document.createElement('h3');
    title.textContent = t`主題腳本使用說明`;
    const list = document.createElement('ol');
    for (const item of HELP_ITEMS) {
        const li = document.createElement('li');
        li.append(...withCode(translate(item)));
        list.append(li);
    }
    const exampleTitle = document.createElement('p');
    exampleTitle.textContent = t`範例：`;
    const example = document.createElement('pre');
    example.textContent = HELP_EXAMPLE;
    content.append(title, list, exampleTitle, example);
    callGenericPopup(content, POPUP_TYPE.TEXT, '', { wide: true, allowVerticalScrolling: true });
}

function initialize() {
    const textarea = document.getElementById('customCSS');
    applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.id = 'theme-script-apply';
    applyButton.className = 'menu_button menu_button_icon';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-code';
    const label = document.createElement('span');
    label.textContent = t`套用 JS`;
    applyButton.append(icon, label);
    const helpButton = document.createElement('button');
    helpButton.type = 'button';
    helpButton.className = 'menu_button menu_button_icon';
    const helpIcon = document.createElement('i');
    helpIcon.className = 'fa-solid fa-circle-question';
    const helpLabel = document.createElement('span');
    helpLabel.textContent = t`套用 JS 說明`;
    helpButton.append(helpIcon, helpLabel);
    helpButton.addEventListener('click', showHelp);
    const buttons = document.createElement('div');
    buttons.className = 'theme-script-buttons';
    buttons.append(helpButton, applyButton);
    document.getElementById('CustomCSS-textAreaBlock').insertAdjacentElement('afterend', buttons);

    applyButton.addEventListener('click', () => requestRun(extractScript(textarea.value), { explicit: true }));
    let inputRewrite = false;
    $(textarea).on('input', () => {
        requestId++;
        inputRewrite = true;
        updatePending();
        queueMicrotask(() => { inputRewrite = false; });
    });
    const observer = new MutationObserver(() => {
        if (inputRewrite) {
            inputRewrite = false;
            return;
        }
        requestRun(currentScript());
        updatePending();
    });
    observer.observe(document.getElementById('custom-style'), { childList: true, characterData: true, subtree: true });
    // 等提早執行的請求跑完再排，避免它被視為過期而清掉後重跑。
    execution.then(() => requestRun(currentScript()));
    updatePending();
}

extension_settings[settingsKey] ??= {};
extension_settings[settingsKey].approved ??= [];
const initialScript = currentScript();
if (initialScript.early) requestRun(initialScript, { early: true });
eventSource.on(event_types.APP_READY, initialize);
