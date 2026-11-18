/*
 * Sticky Error Toast for SillyTavern
 * Only modifies toastr.error. Success/info/warning notifications are untouched.
 */

(() => {
    'use strict';

    const EXTENSION_KEY = 'sticky_error_toast';
    const DEFAULTS = {
        enabled: true,
        duration: 0,       // 0 = sticky / no auto-dismiss
        maxVisible: 5,     // oldest error toast is removed when this limit is exceeded
    };

    const clampInt = (value, min, max, fallback) => {
        const number = Number.parseInt(value, 10);
        return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
    };

    function initialize() {
        const st = window.SillyTavern || globalThis.SillyTavern;
        if (!st || typeof st.getContext !== 'function') {
            console.error('[Sticky Error Toast] SillyTavern context is unavailable.');
            return;
        }

        const context = st.getContext();
        const extensionSettings = context.extensionSettings;
        const saveSettings = context.saveSettingsDebounced;
        const toastrApi = window.toastr;
        const $ = window.jQuery;

        if (!extensionSettings || !toastrApi || typeof toastrApi.error !== 'function' || !$) {
            console.error('[Sticky Error Toast] Required SillyTavern/toastr APIs are unavailable.');
            return;
        }

        // Dispose a previous instance if the extension script is reloaded.
        if (typeof window.__stickyErrorToastDispose === 'function') {
            try { window.__stickyErrorToastDispose(); } catch (error) {
                console.warn('[Sticky Error Toast] Previous instance cleanup failed:', error);
            }
        }

        const settings = Object.assign({}, DEFAULTS, extensionSettings[EXTENSION_KEY] || {});
        settings.enabled = settings.enabled !== false;
        settings.duration = clampInt(settings.duration, 0, 60000, DEFAULTS.duration);
        settings.maxVisible = clampInt(settings.maxVisible, 1, 10, DEFAULTS.maxVisible);
        extensionSettings[EXTENSION_KEY] = settings;

        const originalError = toastrApi.error;

        function enforceVisibleLimit() {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const errors = Array.from(container.children)
                .filter((element) => element.classList.contains('toast-error'));
            const excess = errors.length - settings.maxVisible;
            if (excess <= 0) return;

            // Remove only the oldest error toasts. Other notification types are untouched.
            for (let index = 0; index < excess; index++) {
                const oldest = errors[index];
                try {
                    if (typeof toastrApi.clear === 'function') {
                        // Let Toastr cancel its timer, then remove immediately so
                        // a burst cannot temporarily exceed the configured cap.
                        toastrApi.clear($(oldest));
                    }
                } catch (error) {
                    // Fall through to immediate DOM removal.
                }
                oldest.remove();
            }
        }

        function wrappedError(message, title, optionsOverride) {
            if (!settings.enabled) {
                return originalError.call(this, message, title, optionsOverride);
            }

            // Preserve caller-supplied options, while deliberately overriding
            // timeout-related values so every error follows this extension's setting.
            const options = Object.assign(
                {},
                optionsOverride && typeof optionsOverride === 'object' ? optionsOverride : {},
                {
                    timeOut: settings.duration,
                    extendedTimeOut: settings.duration,
                    closeButton: true,
                    tapToDismiss: false,
                },
            );

            const result = originalError.call(this, message, title, options);
            enforceVisibleLimit();
            return result;
        }

        toastrApi.error = wrappedError;

        const panelId = 'sticky_error_toast_settings';
        const panelHtml = `
            <div id="${panelId}" class="extension_settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b><i class="fa-solid fa-thumbtack"></i> Sticky Error Toast</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="flex-container flexFlowColumn">
                            <label class="checkbox_label">
                                <input id="set_enabled" type="checkbox" />
                                <span>启用错误通知常驻</span>
                            </label>
                            <small>只影响红色错误通知（toastr.error）；成功、信息和警告通知保持原样。</small>

                            <label for="set_duration">错误通知显示时间</label>
                            <select id="set_duration" class="text_pole">
                                <option value="0">一直显示（手动关闭）</option>
                                <option value="5000">5 秒</option>
                                <option value="10000">10 秒</option>
                                <option value="20000">20 秒</option>
                                <option value="30000">30 秒</option>
                                <option value="60000">60 秒</option>
                            </select>

                            <label for="set_max_visible">同时最多显示几条错误</label>
                            <select id="set_max_visible" class="text_pole">
                                <option value="1">1 条</option>
                                <option value="3">3 条</option>
                                <option value="5">5 条</option>
                                <option value="8">8 条</option>
                                <option value="10">10 条</option>
                            </select>
                            <small>达到上限后，新错误会顶替最早出现的错误，避免弹窗无限堆积。</small>

                            <div class="flex-container">
                                <button id="set_test" class="menu_button" type="button">
                                    <i class="fa-solid fa-vial"></i> 测试错误通知
                                </button>
                            </div>
                            <small>设置会自动保存。显示时间设为 0 时，通知不会自动消失；可通过右上角 × 关闭。</small>
                        </div>
                    </div>
                </div>
            </div>`;

        function mountSettings() {
            if (document.getElementById(panelId)) return true;
            const target = document.getElementById('extensions_settings2')
                || document.getElementById('extensions_settings');
            if (!target) return false;

            $(target).append(panelHtml);
            const $panel = $(`#${panelId}`);
            const $enabled = $panel.find('#set_enabled');
            const $duration = $panel.find('#set_duration');
            const $maxVisible = $panel.find('#set_max_visible');

            $enabled.prop('checked', settings.enabled);
            $duration.val(String(settings.duration));
            $maxVisible.val(String(settings.maxVisible));

            $enabled.on('change', function () {
                settings.enabled = this.checked;
                if (typeof saveSettings === 'function') saveSettings();
            });

            $duration.on('change', function () {
                settings.duration = clampInt(this.value, 0, 60000, DEFAULTS.duration);
                if (typeof saveSettings === 'function') saveSettings();
            });

            $maxVisible.on('change', function () {
                settings.maxVisible = clampInt(this.value, 1, 10, DEFAULTS.maxVisible);
                if (typeof saveSettings === 'function') saveSettings();
                enforceVisibleLimit();
            });

            $panel.find('#set_test').on('click', function () {
                toastrApi.error(
                    '这是一条测试错误通知。你可以检查它是否常驻，以及最多显示数量是否生效。',
                    'Sticky Error Toast 测试',
                );
            });

            return true;
        }

        // The extension settings container may be added shortly after the script loads.
        let attempts = 0;
        const mountTimer = window.setInterval(() => {
            attempts += 1;
            if (mountSettings() || attempts >= 40) {
                window.clearInterval(mountTimer);
                if (attempts >= 40 && !document.getElementById(panelId)) {
                    console.warn('[Sticky Error Toast] Could not find the Extensions settings container.');
                }
            }
        }, 250);

        window.__stickyErrorToastDispose = () => {
            window.clearInterval(mountTimer);
            if (toastrApi.error === wrappedError) {
                toastrApi.error = originalError;
            }
            const panel = document.getElementById(panelId);
            if (panel) panel.remove();
            delete window.__stickyErrorToastDispose;
        };

        console.info('[Sticky Error Toast] Loaded. Error notifications only; default duration: sticky; max visible: 5.');
    }

    if (window.jQuery) {
        window.jQuery(initialize);
    } else {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    }
})();
