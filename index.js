import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { eventSource, event_types } from '../../../events.js';
import { t } from '../../../i18n.js';
import { callGenericPopup, POPUP_RESULT, POPUP_TYPE } from '../../../popup.js';

const settingsKey = 'ST-ThemeScript';
let activeModule = null;
let activeScript = '';
let requestId = 0;
let execution = Promise.resolve();

function extractScript(css) {
    const code = css.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1] || '';
    return code.trim() ? code : '';
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

function approve(code) {
    const approved = extension_settings[settingsKey].approved;
    const hash = hashScript(code);
    if (!approved.includes(hash)) {
        approved.push(hash);
        saveSettingsDebounced();
    }
}

function showError(error) {
    console.error('[Theme Script]', error);
    toastr.error(String(error?.message || error));
}

async function cleanup() {
    const previous = activeModule;
    activeModule = null;
    activeScript = '';
    try {
        if (typeof previous?.cleanup === 'function') await previous.cleanup();
    } catch (error) {
        showError(error);
    }
}

function initialize() {
    extension_settings[settingsKey] ??= {};
    extension_settings[settingsKey].approved ??= [];
    const textarea = document.getElementById('customCSS');
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'theme-script-apply';
    button.className = 'menu_button menu_button_icon';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-code';
    const label = document.createElement('span');
    label.textContent = t`套用 JS`;
    button.append(icon, label);
    document.getElementById('CustomCSS-textAreaBlock').insertAdjacentElement('afterend', button);

    function currentScript() {
        return extractScript(SillyTavern.getContext().powerUserSettings.custom_css);
    }

    function updatePending() {
        button.classList.toggle('theme-script-pending', extractScript(textarea.value) !== activeScript);
    }

    function requestRun(code, explicit = false) {
        const id = ++requestId;
        if (explicit && code) approve(code);
        execution = execution.then(async () => {
            if (id !== requestId || (!explicit && code === activeScript)) return;
            await cleanup();
            updatePending();
            if (id !== requestId) return;
            if (!code) {
                if (explicit) toastr.info(t`沒有 JS，已停止原本的腳本`);
                return;
            }

            if (!explicit && !extension_settings[settingsKey].approved.includes(hashScript(code))) {
                const content = document.createElement('div');
                const message = document.createElement('p');
                message.textContent = t`此主題包含 JavaScript (腳本)，執行後可以完整存取此頁面。是否允許執行？`;
                const hint = document.createElement('p');
                const example = document.createElement('code');
                example.textContent = t`請幫我解析此段js，在sillytavern執行有無資料外洩風險。`;
                hint.append(t`若不確定危險性，請整段丟給 AI 判斷。範例例句：`, example);
                const preview = document.createElement('pre');
                preview.className = 'theme-script-preview';
                preview.textContent = code;
                content.append(message, hint, preview);
                const result = await callGenericPopup(content, POPUP_TYPE.CONFIRM, '', { wide: true });
                if (id !== requestId || result !== POPUP_RESULT.AFFIRMATIVE) return;
                approve(code);
            }

            const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
            try {
                activeModule = await import(url);
                activeScript = code;
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

    button.addEventListener('click', () => requestRun(extractScript(textarea.value), true));
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
    requestRun(currentScript());
    updatePending();
}

eventSource.on(event_types.APP_READY, initialize);
