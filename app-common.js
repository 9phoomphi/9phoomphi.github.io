(function (global) {
  'use strict';

  var STORAGE_SCRIPT_URL = 'docControlScriptUrlV3';
  var STORAGE_DEVICE_KEY = 'docControlDeviceKeyV3';

  function safeText(value) {
    return String(value == null ? '' : value);
  }

  function safeTrim(value) {
    return safeText(value).trim();
  }

  function normalizeScriptUrl(url) {
    var raw = safeTrim(url);
    if (!raw) return '';
    return raw.replace(/\s+/g, '');
  }

  function randomDeviceKey() {
    return 'dk_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
  }

  function safeUrl(url) {
    var v = safeTrim(url);
    if (!v) return '';
    return /^https?:\/\//i.test(v) ? v : '';
  }

  function normalizeConfigObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function readConfig() {
    var cfg = normalizeConfigObject(global.DOC_CONTROL_CONFIG);
    var links = normalizeConfigObject(cfg.links);

    return {
      appName: safeTrim(cfg.appName),
      subtitle: safeTrim(cfg.subtitle),
      scriptUrl: normalizeScriptUrl(cfg.scriptUrl),
      deviceKey: safeTrim(cfg.deviceKey),
      lockSettings: !!cfg.lockSettings,
      links: {
        webApp: safeUrl(links.webApp),
        spreadsheet: safeUrl(links.spreadsheet),
        appsScriptProject: safeUrl(links.appsScriptProject),
        driveFolder: safeUrl(links.driveFolder),
        manual: safeUrl(links.manual)
      }
    };
  }

  function getStoredSettings() {
    var cfg = readConfig();
    var savedUrl = '';
    var savedDevice = '';

    try {
      savedUrl = normalizeScriptUrl(localStorage.getItem(STORAGE_SCRIPT_URL) || '');
      savedDevice = safeTrim(localStorage.getItem(STORAGE_DEVICE_KEY) || '');
    } catch (_e) {}

    var scriptUrl = cfg.scriptUrl || savedUrl;
    var deviceKey = cfg.deviceKey || savedDevice || randomDeviceKey();

    return {
      scriptUrl: scriptUrl,
      deviceKey: deviceKey,
      lockSettings: cfg.lockSettings,
      config: cfg
    };
  }

  function persistSettings(scriptUrl, deviceKey) {
    var nextUrl = normalizeScriptUrl(scriptUrl);
    var nextDevice = safeTrim(deviceKey);
    if (!nextUrl) throw new Error('missing_script_url');
    if (!nextDevice) throw new Error('missing_device_key');

    try {
      localStorage.setItem(STORAGE_SCRIPT_URL, nextUrl);
      localStorage.setItem(STORAGE_DEVICE_KEY, nextDevice);
    } catch (_e) {}

    return {
      scriptUrl: nextUrl,
      deviceKey: nextDevice
    };
  }

  function ensureSettingsOrThrow() {
    var settings = getStoredSettings();
    if (!settings.scriptUrl) throw new Error('missing_script_url');
    if (!settings.deviceKey) throw new Error('missing_device_key');
    return settings;
  }

  function createApiClient(settings) {
    if (typeof global.DocumentControlApi !== 'function') {
      throw new Error('api_client_missing');
    }

    var s = settings || ensureSettingsOrThrow();
    return new global.DocumentControlApi({
      scriptUrl: s.scriptUrl,
      deviceKey: s.deviceKey,
      timeoutMs: 20000
    });
  }

  function parseQuery(search) {
    var source = typeof search === 'string' ? search : (global.location ? global.location.search : '');
    var query = source.replace(/^\?/, '');
    var out = {};
    if (!query) return out;

    var parts = query.split('&');
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p) continue;
      var idx = p.indexOf('=');
      var k = idx >= 0 ? p.substring(0, idx) : p;
      var v = idx >= 0 ? p.substring(idx + 1) : '';
      try { k = decodeURIComponent(k.replace(/\+/g, ' ')); } catch (_e1) {}
      try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (_e2) {}
      if (!k) continue;
      if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = v;
    }
    return out;
  }

  function buildPageUrl(path, params) {
    var base = safeTrim(path || 'index.html') || 'index.html';
    var q = [];
    var key;
    params = params || {};

    for (key in params) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
      var value = params[key];
      if (value === undefined || value === null || value === '') continue;
      q.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
    }

    return q.length ? (base + '?' + q.join('&')) : base;
  }

  function redirect(path, params, replace) {
    if (!global.location) return;
    var url = buildPageUrl(path, params);
    if (replace) {
      global.location.replace(url);
    } else {
      global.location.href = url;
    }
  }

  function escapeHtml(value) {
    return safeText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtMoney(value) {
    var raw = safeTrim(value);
    if (!raw) return '-';
    var num = Number(raw.replace(/,/g, ''));
    if (isNaN(num)) return raw;
    return num.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  global.DocFrontendCommon = {
    safeText: safeText,
    safeTrim: safeTrim,
    normalizeScriptUrl: normalizeScriptUrl,
    randomDeviceKey: randomDeviceKey,
    readConfig: readConfig,
    getStoredSettings: getStoredSettings,
    persistSettings: persistSettings,
    ensureSettingsOrThrow: ensureSettingsOrThrow,
    createApiClient: createApiClient,
    parseQuery: parseQuery,
    buildPageUrl: buildPageUrl,
    redirect: redirect,
    escapeHtml: escapeHtml,
    fmtMoney: fmtMoney,
    storageKeys: {
      scriptUrl: STORAGE_SCRIPT_URL,
      deviceKey: STORAGE_DEVICE_KEY
    }
  };
})(typeof window !== 'undefined' ? window : this);
