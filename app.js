(() => {
  'use strict';

  const MAX_CACHED_FILES = 80;
  const MAX_FULLSCREEN_LAYERS = 8;
  const MAX_COMPOSITE_LAYERS = 8;
  const MAX_FILE_BYTES = 60 * 1024 * 1024;
  const STUDIO_STORAGE_SCOPE = location.pathname.includes('kaki-studio-test') ? 'test' : 'prod';
  const STORAGE_KEY = `kaki-studio-${STUDIO_STORAGE_SCOPE}-settings-v1`;
  const IMAGE_DB_NAME = `kaki-studio-${STUDIO_STORAGE_SCOPE}-images-v1`;
  const IMAGE_DB_VERSION = 1;
  const IMAGE_STORE_NAME = 'files';
  const WATERMARK_DB_NAME = `kaki-studio-${STUDIO_STORAGE_SCOPE}-watermarks-v1`;
  const WATERMARK_STORE_NAME = 'watermarks';
  const ONBOARDING_KEY = `kaki-studio-${STUDIO_STORAGE_SCOPE}-onboarding-v1`;
  const THEME_KEY = `kaki-studio-${STUDIO_STORAGE_SCOPE}-theme-v1`;
  const PREVIEW_EDGE = 1500;
  const KAKI_PSD_TEMPLATE_SRC = 'assets/presets/kaki-heart-template.png?v=3';
  const THEMES = Object.freeze({
    original: { label: '原色纸张', metaColor: '#f3f1e9' },
    'frost-indigo': { label: '霜黛', metaColor: '#eceff2' },
    'pine-smoke': { label: '松烟青', metaColor: '#edefe9' },
    haitang: { label: '海棠', metaColor: '#f5f0ea' },
    'lotus-pink': { label: '藕荷', metaColor: '#f6f2f4' },
    'sakura-blue': { label: '樱蓝', metaColor: '#fbf2f5' },
    dianmo: { label: '点墨', metaColor: '#111214' }
  });

  const WATERMARK_DEFAULTS = Object.freeze({
    preset: 'none',
    text: 'KAKI STUDIO',
    size: 3.5,
    opacity: 100,
    position: 'br',
    margin: 4,
    rotate: -24,
    gap: 28,
    blend: 'normal',
    font: 'mono',
    color: '#ffffff',
    strokeColor: '#111111',
    stroke: 6,
    gradientColor: '#141412',
    gradientStrength: 100,
    gradientHeight: 50,
    bandBackground: '#141310',
    bandOpacity: 65,
    bandRightEnabled: true,
    bandRightMode: 'date',
    bandCustomText: '',
    bandPrice: ''
  });

  const COLLAGE_DEFAULTS = Object.freeze({
    ratio: 'auto',
    rows: 3,
    cols: 3,
    gap: 1.5,
    background: '#fbfaf7',
    numberEnabled: true,
    numberStart: 1,
    numberSize: 60,
    numberPosition: 'br',
    numberFont: 'sans',
    numberColor: '#ffffff',
    numberOpacity: 100,
    numberOutlineEnabled: true,
    numberOutlineColor: '#111111',
    numberOutlineOpacity: 100,
    numberOutlineWidth: 8,
    numberShadowEnabled: false,
    numberShadowColor: '#000000',
    numberShadowOpacity: 50,
    numberShadowBlur: 8,
    numberShadowX: 2,
    numberShadowY: 2,
    numberShowOnSold: true,
    soldEnabled: false,
    soldNumbers: '',
    remainingMode: false,
    customWidth: 4,
    customHeight: 5
  });

  const EXPORT_DEFAULTS = Object.freeze({
    format: 'jpeg',
    edge: '2400',
    edgeLocked: true,
    quality: 70,
    prefix: 'kaki'
  });

  const PRESETS = Object.freeze({
    gradient: { opacity: 100, size: 5, stroke: 2, gradientStrength: 100, gradientHeight: 50, font: 'sans' },
    band: { opacity: 100, size: 3.5, stroke: 6, font: 'mono', bandOpacity: 65, bandRightEnabled: true, bandRightMode: 'date' },
    'kaki-psd': { text: '@Kaki' }
  });

  // Derived from the 2000 × 2000 PSD's @Kaki text layer and its group effects.
  const KAKI_PSD_SIGNATURE = Object.freeze({
    text: '@Kaki',
    fontSizePercent: 6.2165,
    anchorX: 1804.4352631642366 / 2000,
    anchorY: 1467.6211535336402 / 2000,
    rotate: -6,
    font: 'javacom',
    color: '#000000',
    strokeColor: '#ffffff',
    strokeWidth: 5 / 2000,
    shadowAngle: 109,
    shadowDistance: 4 / 2000,
    shadowBlur: 4 / 2000,
    shadowOpacity: 0.45
  });

  const PRESET_ALIASES = { corner: 'none', center: 'gradient', double: 'none' };

  const FULLSCREEN_PRESET_DEFAULTS = Object.freeze({
    preset: 'tiled',
    text: 'KAKI STUDIO',
    size: 4,
    opacity: 80,
    rotate: -24,
    gap: 20,
    blend: 'normal',
    font: 'mono',
    color: '#ffffff',
    strokeColor: '#111111',
    stroke: 0,
    placement: 'cell'
  });

  const FULLSCREEN_PRESETS = Object.freeze({
    tiled: { opacity: 80, size: 4, stroke: 0, gap: 20, blend: 'normal', font: 'mono', placement: 'cell' }
  });

  const FRAME_DEFAULTS = Object.freeze({
    scale: 100,
    opacity: 100,
    blend: 'normal',
    x: 0,
    y: 0,
    placement: 'cell',
    tintEnabled: false,
    tintColor: '#ffffff',
    shadowEnabled: true,
    shadowColor: '#000000',
    shadowOpacity: 70,
    shadowBlur: 5,
    shadowX: 1,
    shadowY: 1,
  });

  const SMALL_DEFAULTS = Object.freeze({
    scale: 18,
    opacity: 90,
    blend: 'normal',
    anchor: 'br',
    x: 4,
    y: 4,
    placement: 'cell',
    rotate: 0,
    tintEnabled: false,
    tintColor: '#ffffff',
    shadowEnabled: true,
    shadowColor: '#000000',
    shadowOpacity: 70,
    shadowBlur: 3,
    shadowX: 2,
    shadowY: 2,
  });

  const BLEND_MODES = Object.freeze({
    normal: 'source-over',
    multiply: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    'soft-light': 'soft-light',
    lighten: 'lighten',
    darken: 'darken'
  });

  const FULLSCREEN_BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'lighten', 'darken'];

  const FONT_STACKS = {
    sans: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Helvetica Neue",sans-serif',
    serif: '"Songti SC","STSong","SimSun",Georgia,serif',
    mono: '"SFMono-Regular",Consolas,"Liberation Mono",monospace',
    'alfa-slab': '"Alfa Slab One","Kaki Sans",sans-serif',
    'bebas-neue': '"Bebas Neue","Kaki Sans",sans-serif',
    'zcool-kuaile': '"ZCOOL KuaiLe","Kaki Sans",sans-serif',
    'butter-bread': '"Kaki Butter Bread","Kaki Sans",sans-serif',
    'huiwen-mincho': '"Kaki Huiwen Mincho","Kaki Serif",serif',
    'love-song': '"Kaki Love Song","Kaki Sans",cursive',
    javacom: '"Javacom",cursive'
  };

  const CUSTOM_FONT_FAMILIES = Object.freeze({
    'alfa-slab': '"Alfa Slab One"',
    'bebas-neue': '"Bebas Neue"',
    'zcool-kuaile': '"ZCOOL KuaiLe"',
    'butter-bread': '"Kaki Butter Bread"',
    'huiwen-mincho': '"Kaki Huiwen Mincho"',
    'love-song': '"Kaki Love Song"',
    javacom: '"Javacom"'
  });

  const state = {
    files: [],
    activePage: 0,
    mode: 'watermark',
    watermark: { ...WATERMARK_DEFAULTS },
    fullscreenPreset: { ...FULLSCREEN_PRESET_DEFAULTS },
    collage: { ...COLLAGE_DEFAULTS },
    marks: {
      frame: { ...FRAME_DEFAULTS },
      small: { ...SMALL_DEFAULTS }
    },
    assets: {
      fullscreen: [],
      frame: [],
      small: []
    },
    selectedMarkLayers: { frame: null, small: null },
    export: { ...EXPORT_DEFAULTS },
    previewUrls: [],
    busy: false,
    previewToken: 0,
    renderToken: 0
  };

  const el = {};
  let previewTimer = 0;
  let resizeTimer = 0;
  let currentTheme = 'original';
  let kakiTemplateImage = null;
  let kakiTemplatePromise = null;
  let imageDbPromise = null;
  let watermarkDbPromise = null;
  let persistQueue = Promise.resolve();
  let watermarkPersistQueue = Promise.resolve();
  let storageWarningShown = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const numberOr = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const currentDateLabel = () => {
    const now = new Date();
    return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
  };
  const bandRightLabel = () => {
    const wm = state.watermark;
    if (wm.bandRightMode === 'price') return wm.bandPrice ? `RMB ${wm.bandPrice}` : 'RMB';
    if (wm.bandRightMode === 'custom') return String(wm.bandCustomText || '').trim();
    return currentDateLabel();
  };
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hexToRgba = (hex, alpha = 1) => {
    const value = String(hex || '#000000').replace('#', '');
    const safe = /^[0-9a-f]{6}$/i.test(value) ? value : '000000';
    const r = parseInt(safe.slice(0, 2), 16);
    const g = parseInt(safe.slice(2, 4), 16);
    const b = parseInt(safe.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`;
  };
  const getPath = (object, path) => path.split('.').reduce((value, key) => value && value[key], object);
  const setPath = (object, path, value) => {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((node, key) => node[key], object);
    target[last] = value;
  };

  function openImageDb() {
    if (imageDbPromise) return imageDbPromise;
    imageDbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        resolve(null);
        return;
      }
      const request = indexedDB.open(IMAGE_DB_NAME, IMAGE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
          db.createObjectStore(IMAGE_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('作品缓存无法打开'));
    });
    return imageDbPromise;
  }

  function openWatermarkDb() {
    if (watermarkDbPromise) return watermarkDbPromise;
    watermarkDbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        resolve(null);
        return;
      }
      const request = indexedDB.open(WATERMARK_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WATERMARK_STORE_NAME)) {
          db.createObjectStore(WATERMARK_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('水印素材缓存无法打开'));
    });
    return watermarkDbPromise;
  }

  function fileSnapshot() {
    return state.files.slice(0, MAX_CACHED_FILES).map((record, order) => ({
      id: record.id,
      order,
      name: record.name,
      width: record.width,
      height: record.height,
      type: record.file.type,
      lastModified: record.file.lastModified || Date.now(),
      blob: record.file
    }));
  }

  function persistImportedFiles() {
    const snapshot = fileSnapshot();
    persistQueue = persistQueue
      .catch(() => null)
      .then(async () => {
        const db = await openImageDb();
        if (!db) return;
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(IMAGE_STORE_NAME, 'readwrite');
          const store = transaction.objectStore(IMAGE_STORE_NAME);
          store.clear();
          snapshot.forEach((record) => store.put(record));
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error || new Error('作品缓存写入失败'));
          transaction.onabort = () => reject(transaction.error || new Error('作品缓存写入中止'));
        });
      })
      .catch((error) => {
        console.warn(error);
        if (!storageWarningShown) {
          storageWarningShown = true;
          toast('浏览器本地空间不足，作品可能无法在刷新后恢复', 'error');
        }
      });
    return persistQueue;
  }

  function clearStoredFiles() {
    persistQueue = persistQueue
      .catch(() => null)
      .then(async () => {
        const db = await openImageDb();
        if (!db) return;
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(IMAGE_STORE_NAME, 'readwrite');
          transaction.objectStore(IMAGE_STORE_NAME).clear();
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error || new Error('作品缓存清理失败'));
        });
      })
      .catch((error) => console.warn(error));
    return persistQueue;
  }

  async function restoreImportedFiles() {
    try {
      const db = await openImageDb();
      if (!db) return 0;
      const records = await new Promise((resolve, reject) => {
        const transaction = db.transaction(IMAGE_STORE_NAME, 'readonly');
        const request = transaction.objectStore(IMAGE_STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error('作品缓存读取失败'));
      });
      const restored = records
        .filter((record) => record?.blob instanceof Blob)
        .sort((a, b) => Number(a.order) - Number(b.order))
        .slice(0, MAX_CACHED_FILES)
        .map((record) => {
          const file = record.blob instanceof File
            ? record.blob
            : new File([record.blob], record.name, { type: record.type, lastModified: record.lastModified });
          return {
            id: record.id,
            file,
            name: record.name,
            width: Math.max(1, Number(record.width) || 1),
            height: Math.max(1, Number(record.height) || 1),
            thumbUrl: URL.createObjectURL(file)
          };
        });
      state.files.push(...restored);
      return restored.length;
    } catch (error) {
      console.warn(error);
      return 0;
    }
  }

  function compositeLayerList(type) {
    return type === 'fullscreen' ? state.assets.fullscreen : state.assets[type];
  }

  function compositeLayerSettings(layer, type) {
    return type === 'fullscreen'
      ? {
          opacity: layer.opacity,
          blend: layer.blend,
          fit: layer.fit,
          placement: layer.placement
        }
      : layer.settings;
  }

  function normalizeCompositeSettings(type, raw = {}) {
    if (type === 'fullscreen') {
      return {
        opacity: clamp(numberOr(raw.opacity, 100), 0, 100),
        blend: FULLSCREEN_BLENDS.includes(raw.blend) ? raw.blend : 'overlay',
        fit: ['cover', 'contain', 'tile'].includes(raw.fit) ? raw.fit : 'cover',
        placement: raw.placement === 'after' ? 'after' : 'before'
      };
    }
    const isFrame = type === 'frame';
    const defaults = isFrame ? FRAME_DEFAULTS : SMALL_DEFAULTS;
    const settings = { ...defaults, ...raw };
    sanitizeMarkSettings(settings, defaults, isFrame ? {
      scale: [10, 120], opacity: [5, 100], x: [-50, 50], y: [-50, 50],
      shadowOpacity: [0, 100], shadowBlur: [0, 120], shadowX: [-40, 40], shadowY: [-40, 40]
    } : {
      scale: [3, 70], opacity: [5, 100], x: [-45, 45], y: [-45, 45], rotate: [-45, 45],
      shadowOpacity: [0, 100], shadowBlur: [0, 60], shadowX: [-20, 20], shadowY: [-20, 20]
    });
    if (!isFrame && !['tl','tc','tr','ml','mc','mr','bl','bc','br'].includes(settings.anchor)) {
      settings.anchor = defaults.anchor;
    }
    if (!['cell','sheet'].includes(settings.placement)) settings.placement = defaults.placement;
    return settings;
  }

  async function savedAssetRecord(item) {
    if (!(item?.blob instanceof Blob)) return null;
    const file = item.blob instanceof File
      ? item.blob
      : new File([item.blob], item.name || 'watermark.png', {
          type: item.type || item.blob.type,
          lastModified: item.lastModified || Date.now()
        });
    const record = await createAssetRecord(file);
    record.id = item.id || record.id;
    return record;
  }

  async function saveWatermarkModule(type) {
    const layers = compositeLayerList(type);
    const snapshots = layers.map((layer) => {
      const settings = compositeLayerSettings(layer, type);
      return {
        id: layer.id,
        name: layer.record.name,
        width: layer.record.width,
        height: layer.record.height,
        type: layer.record.file.type,
        lastModified: layer.record.file.lastModified || Date.now(),
        blob: layer.record.file,
        settings: { ...settings }
      };
    });
    watermarkPersistQueue = watermarkPersistQueue
      .catch(() => null)
      .then(async () => {
        const db = await openWatermarkDb();
        if (!db) throw new Error('浏览器不支持本地水印缓存');
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(WATERMARK_STORE_NAME, 'readwrite');
          transaction.objectStore(WATERMARK_STORE_NAME).put({
            id: type,
            type,
            savedAt: Date.now(),
            layers: snapshots
          });
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error || new Error('水印缓存写入失败'));
          transaction.onabort = () => reject(transaction.error || new Error('水印缓存写入中止'));
        });
      });
    try {
      await watermarkPersistQueue;
      const label = type === 'fullscreen' ? '全屏水印' : type === 'frame' ? '水印框' : '小水印';
      toast(snapshots.length ? `已保存 ${snapshots.length} 张${label}` : `已清除${label}缓存`);
      const button = type === 'fullscreen' ? el.fullscreenSaveBtn : type === 'frame' ? el.frameSaveBtn : el.smallSaveBtn;
      const badge = button?.querySelector('.module-save-badge');
      if (button && badge) {
        button.classList.add('is-saved');
        badge.textContent = snapshots.length ? '已保存' : '已清除';
        window.setTimeout(() => {
          button.classList.remove('is-saved');
          badge.textContent = 'LOCAL';
        }, 1800);
      }
    } catch (error) {
      console.warn(error);
      toast('保存水印缓存失败，可能是浏览器存储空间不足', 'error');
    }
  }

  async function restoreWatermarkAssets() {
    try {
      const db = await openWatermarkDb();
      if (!db) return 0;
      const records = await new Promise((resolve, reject) => {
        const transaction = db.transaction(WATERMARK_STORE_NAME, 'readonly');
        const request = transaction.objectStore(WATERMARK_STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error('水印缓存读取失败'));
      });
      let restoredCount = 0;
      for (const saved of records) {
        const type = saved?.type;
        if (!['fullscreen', 'frame', 'small'].includes(type)) continue;
        const nextLayers = [];
        for (const item of Array.isArray(saved.layers) ? saved.layers : []) {
          try {
            const record = await savedAssetRecord(item);
            if (!record) continue;
            const settings = normalizeCompositeSettings(type, item.settings);
            nextLayers.push(type === 'fullscreen'
              ? { id: record.id, record, ...settings }
              : { id: record.id, record, settings });
          } catch (error) {
            console.warn(error);
          }
        }
        compositeLayerList(type).splice(0, compositeLayerList(type).length, ...nextLayers);
        if (type !== 'fullscreen' && nextLayers.length) {
          state.selectedMarkLayers[type] = nextLayers[0].id;
          state.marks[type] = nextLayers[0].settings;
        }
        restoredCount += nextLayers.length;
      }
      return restoredCount;
    } catch (error) {
      console.warn(error);
      return 0;
    }
  }

  function cacheEls() {
    const ids = [
      'resetSettingsBtn','dropZone','fileInput','queueView','queueStrip','libraryMeta',
      'clearImagesBtn','watermarkTab','collageTab','watermarkPanel','collagePanel',
      'watermarkText','watermarkTextBlock','watermarkSize','watermarkSizeValue','watermarkOpacity','watermarkOpacityValue',
      'watermarkPosition','watermarkMargin','watermarkMarginValue','watermarkFont','watermarkColor',
      'strokeColor','watermarkStroke','watermarkStrokeValue','cornerOptions',
      'bandOptions','bandBackground','bandOpacity','bandOpacityValue','bandRightCombo',
      'bandRightPreview','bandRightEnabled','bandRightFields','bandRightMode',
      'bandCustomField','bandCustomText','bandPriceField','bandPrice',
      'gradientColor','gradientStrength','gradientStrengthValue','gradientHeight',
      'gradientHeightValue','gradientOptions','gradientHeightOptions',
      'watermarkScaleOptions','watermarkTypeOptions','kakiPresetLockNote',
      'collageRatio','customRatioUI','customRatioWidth','customRatioHeight',
      'collageRows','collageCols','collageGap','collageGapValue','collageBg',
      'numberEnabled','numberStyleSettings','numberStart','numberSize','numberSizeValue','numberPosition','soldEnabled','soldOptions','soldNumbers',
      'numberFont','numberColor','numberOpacity','numberOpacityValue','numberOutlineEnabled',
      'numberOutlineOptions','numberOutlineColor','numberOutlineOpacity','numberOutlineOpacityValue',
      'numberOutlineWidth','numberOutlineWidthValue','numberShadowEnabled','numberShadowOptions',
      'numberShadowColor','numberShadowOpacity','numberShadowOpacityValue','numberShadowBlur',
      'numberShadowBlurValue','numberShadowX','numberShadowXValue','numberShadowY',
      'numberShadowYValue','numberShowOnSold',
      'remainingMode','exportFormat','exportEdge','exportEdgeState',
      'exportEdgeLockBtn','exportQuality','exportQualityValue','exportQualityRow','filePrefix',
      'stageTitle','previewMeta','previewSurface','previewCanvas','emptyState',
      'emptySelectBtn','prevBtn','nextBtn','pagerLabel','downloadCurrentBtn','exportAllBtn',
      'exportAllLabel','progressWrap','progressText','progressPercent','progressBar','toastRegion',
      'previewAllBtn','resultGallery','resultGrid',
      'numberOptions','fullscreenCount','fullscreenEmpty','fullscreenEmptyTitle','fullscreenEmptyHint',
      'fullscreenInput','addFullscreenBtn','fullscreenList','fullscreenSaveBtn','fullscreenPresetDetails',
      'fullscreenPresetText','fullscreenPresetOpacity','fullscreenPresetOpacityValue',
      'fullscreenPresetSize','fullscreenPresetSizeValue','fullscreenPresetRotate',
      'fullscreenPresetRotateValue','fullscreenPresetGap','fullscreenPresetGapValue',
      'fullscreenPresetBlend','fullscreenPresetPlacement','fullscreenPresetFont',
      'fullscreenPresetColor','fullscreenPresetStrokeColor','fullscreenPresetStroke',
      'fullscreenPresetStrokeValue',
      'signaturePresetWorkspace','presetSettingsDetails',
      'frameInput','frameChooseBtn','frameEmpty','frameEmptyTitle','frameEmptyHint',
      'frameList','frameEditor','frameActiveLabel','frameSaveBtn',
      'frameTintCombo','frameShadowControls','frameStatus',
      'smallInput','smallChooseBtn','smallEmpty','smallEmptyTitle','smallEmptyHint',
      'smallList','smallEditor','smallActiveLabel','smallSaveBtn',
      'smallTintCombo','smallShadowControls',
      'smallStatus','showWelcomeBtn','welcomeOverlay','welcomeStartBtn',
      'imagePreviewOverlay','imagePreviewImg','imagePreviewTitle','imagePreviewMeta','imagePreviewCloseBtn',
      'themePicker','themeToggleBtn','themeToggleLabel','themeMenu'
    ];
    ids.forEach((id) => { el[id] = document.getElementById(id); });
    el.signaturePresetCards = Array.from(document.querySelectorAll('[data-signature-preset-option]'));
    el.fullscreenPresetCards = Array.from(document.querySelectorAll('[data-fullscreen-preset-option]'));
    el.modeTabs = Array.from(document.querySelectorAll('[data-mode]'));
    el.watermarkControls = Array.from(document.querySelectorAll('[data-watermark]'));
    el.collageControls = Array.from(document.querySelectorAll('[data-collage]'));
    el.markControls = Array.from(document.querySelectorAll('[data-mark]'));
    el.fullscreenPresetControls = Array.from(document.querySelectorAll('[data-fullscreen-preset]'));
    el.collageOnlyControls = Array.from(document.querySelectorAll('.collage-only-control'));
    el.collageMarkPlacements = Array.from(document.querySelectorAll('.collage-mark-placement'));
    el.exportControls = Array.from(document.querySelectorAll('[data-export]'));
    el.themeOptions = Array.from(document.querySelectorAll('[data-theme-option]'));
  }

  function toast(message, type = '') {
    const node = document.createElement('div');
    node.className = `toast ${type}`.trim();
    node.textContent = message;
    el.toastRegion.appendChild(node);
    window.setTimeout(() => {
      node.style.opacity = '0';
      node.style.transform = 'translateY(4px)';
      node.style.transition = 'opacity .2s, transform .2s';
      window.setTimeout(() => node.remove(), 220);
    }, 3600);
  }

  function applyTheme(theme, announce = false) {
    currentTheme = THEMES[theme] ? theme : 'original';
    document.documentElement.dataset.theme = currentTheme;
    if (el.themeToggleLabel) el.themeToggleLabel.textContent = THEMES[currentTheme].label;
    if (el.themeToggleBtn) {
      el.themeToggleBtn.setAttribute('aria-label', `选择界面主题，当前为${THEMES[currentTheme].label}`);
      el.themeToggleBtn.title = '选择界面主题';
    }
    el.themeOptions.forEach((option) => {
      const selected = option.dataset.themeOption === currentTheme;
      option.classList.toggle('active', selected);
      option.setAttribute('aria-checked', String(selected));
    });
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.content = THEMES[currentTheme].metaColor;
    if (announce) toast(`已切换至${THEMES[currentTheme].label}主题`);
  }

  function restoreTheme() {
    let savedTheme = 'original';
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (THEMES[stored]) savedTheme = stored;
    } catch (_) { /* private mode can disable persistent storage */ }
    applyTheme(savedTheme);
  }

  function setThemeMenu(open, { focus } = {}) {
    if (!el.themeMenu || !el.themeToggleBtn) return;
    el.themeMenu.hidden = !open;
    el.themeToggleBtn.setAttribute('aria-expanded', String(open));
    if (!open) return;
    const target = el.themeOptions.find((option) => option.classList.contains('active')) || el.themeOptions[0];
    if (focus && target) target.focus();
  }

  function closeThemeMenu({ restoreFocus = false } = {}) {
    if (!el.themeMenu || el.themeMenu.hidden) return;
    setThemeMenu(false);
    if (restoreFocus) el.themeToggleBtn.focus();
  }

  function toggleThemeMenu() {
    if (!el.themeMenu) return;
    if (el.themeMenu.hidden) setThemeMenu(true, { focus: true });
    else closeThemeMenu({ restoreFocus: true });
  }

  function chooseTheme(theme) {
    if (!THEMES[theme]) return;
    const changed = currentTheme !== theme;
    applyTheme(theme, changed);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) { /* theme still applies for the current session */ }
    closeThemeMenu({ restoreFocus: true });
  }

  function syncRange(input, outputEl, suffix = '%') {
    if (!input) return;
    const min = numberOr(input.min, 0);
    const max = numberOr(input.max, 100);
    const value = numberOr(input.value, min);
    const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty('--pct', `${pct}%`);
    if (outputEl) outputEl.textContent = `${value}${suffix}`;
  }

  function syncAllRanges() {
    syncRange(el.watermarkSize, el.watermarkSizeValue);
    syncRange(el.watermarkOpacity, el.watermarkOpacityValue);
    syncRange(el.watermarkMargin, el.watermarkMarginValue);
    syncRange(el.fullscreenPresetOpacity, el.fullscreenPresetOpacityValue);
    syncRange(el.fullscreenPresetSize, el.fullscreenPresetSizeValue);
    syncRange(el.fullscreenPresetRotate, el.fullscreenPresetRotateValue, '°');
    syncRange(el.fullscreenPresetGap, el.fullscreenPresetGapValue, '');
    syncRange(el.fullscreenPresetStroke, el.fullscreenPresetStrokeValue);
    syncRange(el.watermarkStroke, el.watermarkStrokeValue);
    syncRange(el.bandOpacity, el.bandOpacityValue);
    syncRange(el.gradientStrength, el.gradientStrengthValue);
    syncRange(el.gradientHeight, el.gradientHeightValue);
    syncRange(el.collageGap, el.collageGapValue, 'px');
    syncRange(el.numberSize, el.numberSizeValue, 'px');
    syncRange(el.numberOpacity, el.numberOpacityValue);
    syncRange(el.numberOutlineOpacity, el.numberOutlineOpacityValue);
    syncRange(el.numberOutlineWidth, el.numberOutlineWidthValue, 'px');
    syncRange(el.numberShadowOpacity, el.numberShadowOpacityValue);
    syncRange(el.numberShadowBlur, el.numberShadowBlurValue, 'px');
    syncRange(el.numberShadowX, el.numberShadowXValue, 'px');
    syncRange(el.numberShadowY, el.numberShadowYValue, 'px');
    syncRange(el.exportQuality, el.exportQualityValue);
    document.querySelectorAll('[data-value-for]').forEach((output) => {
      const key = output.dataset.valueFor;
      const control = el.markControls.find((item) => item.dataset.mark === key && item.type === 'range');
      if (!control) return;
      syncRange(control, output, output.dataset.suffix || (key.endsWith('.rotate') ? '°' : '%'));
    });
  }

  function syncMarkControlsFromState() {
    el.markControls.forEach((control) => {
      const value = getPath(state.marks, control.dataset.mark);
      if (control.type === 'checkbox') control.checked = Boolean(value);
      else if (value !== undefined) control.value = value;
    });
  }

  function applyUiFromState() {
    el.watermarkText.value = state.watermark.text;
    el.watermarkSize.value = state.watermark.size;
    el.watermarkOpacity.value = state.watermark.opacity;
    el.watermarkPosition.value = state.watermark.position;
    el.watermarkMargin.value = state.watermark.margin;
    el.watermarkFont.value = state.watermark.font;
    el.watermarkColor.value = state.watermark.color;
    el.strokeColor.value = state.watermark.strokeColor;
    el.watermarkStroke.value = state.watermark.stroke;
    el.gradientColor.value = state.watermark.gradientColor;
    el.gradientStrength.value = state.watermark.gradientStrength;
    el.gradientHeight.value = state.watermark.gradientHeight;
    el.bandBackground.value = state.watermark.bandBackground;
    el.bandOpacity.value = state.watermark.bandOpacity;
    el.bandRightEnabled.checked = state.watermark.bandRightEnabled;
    el.bandRightMode.value = state.watermark.bandRightMode;
    el.bandCustomText.value = state.watermark.bandCustomText;
    el.bandPrice.value = state.watermark.bandPrice;
    updateBandUi();

    el.fullscreenPresetText.value = state.fullscreenPreset.text;
    el.fullscreenPresetOpacity.value = state.fullscreenPreset.opacity;
    el.fullscreenPresetSize.value = state.fullscreenPreset.size;
    el.fullscreenPresetRotate.value = state.fullscreenPreset.rotate;
    el.fullscreenPresetGap.value = state.fullscreenPreset.gap;
    el.fullscreenPresetBlend.value = state.fullscreenPreset.blend;
    el.fullscreenPresetPlacement.value = state.fullscreenPreset.placement;
    el.fullscreenPresetFont.value = state.fullscreenPreset.font;
    el.fullscreenPresetColor.value = state.fullscreenPreset.color;
    el.fullscreenPresetStrokeColor.value = state.fullscreenPreset.strokeColor;
    el.fullscreenPresetStroke.value = state.fullscreenPreset.stroke;

    el.collageRatio.value = state.collage.ratio;
    el.customRatioWidth.value = state.collage.customWidth;
    el.customRatioHeight.value = state.collage.customHeight;
    el.collageRows.value = state.collage.rows;
    el.collageCols.value = state.collage.cols;
    el.collageGap.value = state.collage.gap;
    el.collageBg.value = state.collage.background;
    el.numberEnabled.checked = state.collage.numberEnabled;
    el.numberStart.value = state.collage.numberStart;
    el.numberSize.value = state.collage.numberSize;
    el.numberPosition.value = state.collage.numberPosition;
    el.numberFont.value = state.collage.numberFont;
    el.numberColor.value = state.collage.numberColor;
    el.numberOpacity.value = state.collage.numberOpacity;
    el.numberOutlineEnabled.checked = state.collage.numberOutlineEnabled;
    el.numberOutlineColor.value = state.collage.numberOutlineColor;
    el.numberOutlineOpacity.value = state.collage.numberOutlineOpacity;
    el.numberOutlineWidth.value = state.collage.numberOutlineWidth;
    el.numberShadowEnabled.checked = state.collage.numberShadowEnabled;
    el.numberShadowColor.value = state.collage.numberShadowColor;
    el.numberShadowOpacity.value = state.collage.numberShadowOpacity;
    el.numberShadowBlur.value = state.collage.numberShadowBlur;
    el.numberShadowX.value = state.collage.numberShadowX;
    el.numberShadowY.value = state.collage.numberShadowY;
    el.numberShowOnSold.checked = state.collage.numberShowOnSold;
    el.soldEnabled.checked = state.collage.soldEnabled;
    el.soldNumbers.value = state.collage.soldNumbers;
    el.remainingMode.checked = state.collage.remainingMode;
    updateCollageUi();

    el.exportFormat.value = state.export.format;
    el.exportEdge.value = state.export.edge;
    el.exportQuality.value = state.export.quality;
    el.filePrefix.value = state.export.prefix;
    updateExportUi();

    el.signaturePresetCards.forEach((card) => {
      card.classList.toggle('active', card.dataset.signaturePresetOption === state.watermark.preset);
    });
    el.fullscreenPresetCards.forEach((card) => {
      card.classList.toggle('active', card.dataset.fullscreenPresetOption === state.fullscreenPreset.preset);
    });
    el.modeTabs.forEach((tab) => {
      const active = tab.dataset.mode === state.mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    el.watermarkTab.setAttribute('aria-controls', 'watermarkPanel');
    el.collageTab.setAttribute('aria-controls', 'collagePanel');
    el.watermarkPanel.hidden = false;
    el.collagePanel.hidden = state.mode !== 'collage';

    el.numberOptions.hidden = !state.collage.numberEnabled;
    el.numberStyleSettings.hidden = !state.collage.numberEnabled;
    el.soldOptions.hidden = !state.collage.soldEnabled;
    const fixedKakiPreset = state.watermark.preset === 'kaki-psd';
    el.cornerOptions.hidden = true;
    el.gradientOptions.hidden = state.watermark.preset !== 'gradient';
    el.gradientHeightOptions.hidden = state.watermark.preset !== 'gradient';
    el.bandOptions.hidden = state.watermark.preset !== 'band';
    el.watermarkScaleOptions.hidden = fixedKakiPreset;
    el.watermarkTypeOptions.hidden = fixedKakiPreset;
    el.kakiPresetLockNote.hidden = !fixedKakiPreset;
    el.watermarkTextBlock.classList.toggle('is-fixed-preset', fixedKakiPreset);
    el.watermarkTextBlock.querySelector('label').textContent = fixedKakiPreset ? '署名文字' : '水印文字';
    el.presetSettingsDetails.hidden = false;
    el.presetSettingsDetails.open = state.watermark.preset !== 'none';
    el.fullscreenPresetDetails.hidden = false;
    el.fullscreenPresetDetails.open = state.fullscreenPreset.preset !== 'none';

    syncMarkControlsFromState();

    syncAllRanges();
    syncStageTitle();
    renderMarkModules();
    updateActionAvailability();
  }

  function syncStageTitle() {
    const title = state.mode === 'watermark' ? '单图水印预览' : '目录拼图预览';
    el.stageTitle.textContent = title;
    document.title = state.mode === 'watermark'
      ? 'KAKI Studio · 批量图片水印'
      : 'KAKI Studio · 目录拼图';
  }

  function updateExportUi() {
    const locked = Boolean(state.export.edgeLocked);
    el.exportEdge.disabled = locked;
    el.exportEdgeState.textContent = locked ? '已锁定' : '可修改';
    el.exportEdgeLockBtn.textContent = locked ? '解锁' : '锁定';
    el.exportQualityRow.hidden = state.export.format !== 'jpeg';
  }

  function updateBandUi() {
    const enabled = Boolean(state.watermark.bandRightEnabled);
    const mode = state.watermark.bandRightMode;
    el.bandRightCombo.classList.toggle('is-on', enabled);
    el.bandRightFields.classList.toggle('is-on', enabled);
    el.bandCustomField.hidden = mode !== 'custom';
    el.bandPriceField.hidden = mode !== 'price';
    el.bandRightPreview.textContent = mode === 'date' ? '日期' : mode === 'price' ? 'RMB' : '文字';
  }

  function updateCollageUi() {
    el.collageOnlyControls.forEach((control) => {
      control.hidden = state.mode !== 'collage';
    });
    el.customRatioUI.hidden = state.collage.ratio !== 'custom';
    el.numberOptions.hidden = !state.collage.numberEnabled;
    el.soldOptions.hidden = !state.collage.soldEnabled;
    el.numberOutlineOptions.hidden = !state.collage.numberOutlineEnabled;
    el.numberShadowOptions.hidden = !state.collage.numberShadowEnabled;
  }

  function persistSettings() {
    try {
      const payload = {
        watermark: state.watermark,
        fullscreenPreset: state.fullscreenPreset,
        collage: state.collage,
        marks: state.marks,
        export: state.export,
        mode: state.mode
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) { /* localStorage may be disabled in private windows */ }
  }

  function restoreSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.watermark && typeof data.watermark === 'object') Object.assign(state.watermark, data.watermark);
      if (data.fullscreenPreset && typeof data.fullscreenPreset === 'object') {
        Object.assign(state.fullscreenPreset, data.fullscreenPreset);
      }
      if (data.collage && typeof data.collage === 'object') Object.assign(state.collage, data.collage);
      if (data.marks && typeof data.marks === 'object') {
        if (data.marks.frame) Object.assign(state.marks.frame, data.marks.frame);
        if (data.marks.small) Object.assign(state.marks.small, data.marks.small);
      }
      if (data.export && typeof data.export === 'object') Object.assign(state.export, data.export);
      if (data.mode === 'collage' || data.mode === 'watermark') state.mode = data.mode;
      sanitizeState();
    } catch (_) { /* ignore corrupted old settings */ }
  }

  function sanitizeState() {
    const wm = state.watermark;
    wm.text = String(wm.text ?? WATERMARK_DEFAULTS.text).slice(0, 60);
    wm.size = clamp(numberOr(wm.size, WATERMARK_DEFAULTS.size), 1, 18);
    wm.opacity = clamp(numberOr(wm.opacity, WATERMARK_DEFAULTS.opacity), 5, 100);
    wm.margin = clamp(numberOr(wm.margin, WATERMARK_DEFAULTS.margin), 2, 15);
    wm.rotate = clamp(numberOr(wm.rotate, WATERMARK_DEFAULTS.rotate), -45, 45);
    wm.gap = clamp(numberOr(wm.gap, WATERMARK_DEFAULTS.gap), 8, 48);
    wm.stroke = clamp(numberOr(wm.stroke, WATERMARK_DEFAULTS.stroke), 0, 12);
    wm.gradientStrength = clamp(numberOr(wm.gradientStrength, WATERMARK_DEFAULTS.gradientStrength), 10, 100);
    wm.gradientHeight = clamp(numberOr(wm.gradientHeight, WATERMARK_DEFAULTS.gradientHeight), 15, 75);
    if (PRESET_ALIASES[wm.preset]) wm.preset = PRESET_ALIASES[wm.preset];
    if (wm.preset !== 'none' && !PRESETS[wm.preset]) wm.preset = WATERMARK_DEFAULTS.preset;
    if (wm.font === 'javacom') wm.font = WATERMARK_DEFAULTS.font;
    if (!FONT_STACKS[wm.font]) wm.font = WATERMARK_DEFAULTS.font;
    if (!['br','bl','tr','tl','center'].includes(wm.position)) wm.position = WATERMARK_DEFAULTS.position;
    if (!/^#[0-9a-f]{6}$/i.test(wm.color)) wm.color = WATERMARK_DEFAULTS.color;
    if (!/^#[0-9a-f]{6}$/i.test(wm.strokeColor)) wm.strokeColor = WATERMARK_DEFAULTS.strokeColor;
    if (!/^#[0-9a-f]{6}$/i.test(wm.gradientColor)) wm.gradientColor = WATERMARK_DEFAULTS.gradientColor;
    if (!/^#[0-9a-f]{6}$/i.test(wm.bandBackground)) wm.bandBackground = WATERMARK_DEFAULTS.bandBackground;
    wm.bandOpacity = clamp(numberOr(wm.bandOpacity, WATERMARK_DEFAULTS.bandOpacity), 0, 100);
    if (!BLEND_MODES[wm.blend]) wm.blend = WATERMARK_DEFAULTS.blend;
    if (!['date','custom','price'].includes(wm.bandRightMode)) wm.bandRightMode = WATERMARK_DEFAULTS.bandRightMode;
    wm.bandRightEnabled = Boolean(wm.bandRightEnabled);
    wm.bandCustomText = String(wm.bandCustomText ?? '').slice(0, 40);
    wm.bandPrice = String(wm.bandPrice ?? '').replace(/[^\d.]/g, '').slice(0, 24);

    const fp = state.fullscreenPreset;
    fp.text = String(fp.text ?? FULLSCREEN_PRESET_DEFAULTS.text).slice(0, 60);
    fp.size = clamp(numberOr(fp.size, FULLSCREEN_PRESET_DEFAULTS.size), 1, 18);
    fp.opacity = clamp(numberOr(fp.opacity, FULLSCREEN_PRESET_DEFAULTS.opacity), 5, 100);
    fp.rotate = clamp(numberOr(fp.rotate, FULLSCREEN_PRESET_DEFAULTS.rotate), -45, 45);
    fp.gap = clamp(numberOr(fp.gap, FULLSCREEN_PRESET_DEFAULTS.gap), 8, 48);
    fp.stroke = clamp(numberOr(fp.stroke, FULLSCREEN_PRESET_DEFAULTS.stroke), 0, 12);
    if (fp.preset !== 'none' && !FULLSCREEN_PRESETS[fp.preset]) fp.preset = FULLSCREEN_PRESET_DEFAULTS.preset;
    if (!BLEND_MODES[fp.blend]) fp.blend = FULLSCREEN_PRESET_DEFAULTS.blend;
    if (!FONT_STACKS[fp.font]) fp.font = FULLSCREEN_PRESET_DEFAULTS.font;
    if (!/^#[0-9a-f]{6}$/i.test(fp.color)) fp.color = FULLSCREEN_PRESET_DEFAULTS.color;
    if (!/^#[0-9a-f]{6}$/i.test(fp.strokeColor)) fp.strokeColor = FULLSCREEN_PRESET_DEFAULTS.strokeColor;
    if (!['cell','sheet'].includes(fp.placement)) fp.placement = FULLSCREEN_PRESET_DEFAULTS.placement;

    const cl = state.collage;
    cl.rows = clamp(Math.round(numberOr(cl.rows, COLLAGE_DEFAULTS.rows)), 1, 8);
    cl.cols = clamp(Math.round(numberOr(cl.cols, COLLAGE_DEFAULTS.cols)), 1, 8);
    cl.gap = clamp(numberOr(cl.gap, COLLAGE_DEFAULTS.gap), 0, 80);
    cl.customWidth = clamp(Math.round(numberOr(cl.customWidth, COLLAGE_DEFAULTS.customWidth)), 1, 100);
    cl.customHeight = clamp(Math.round(numberOr(cl.customHeight, COLLAGE_DEFAULTS.customHeight)), 1, 100);
    cl.numberStart = clamp(Math.round(numberOr(cl.numberStart, 1)), 0, 99999);
    cl.numberSize = clamp(numberOr(cl.numberSize, COLLAGE_DEFAULTS.numberSize), 12, 180);
    if (cl.ratio === '1') cl.ratio = '1:1';
    if (cl.ratio === '0.75') cl.ratio = '3:4';
    if (cl.ratio === '0.8') cl.ratio = '4:5';
    if (cl.ratio === '0.5625') cl.ratio = '9:16';
    if (!['auto','1:1','3:4','4:3','9:16','16:9','custom'].includes(cl.ratio)) cl.ratio = 'auto';
    if (!['br','bl','tr','tl','bc','center'].includes(cl.numberPosition)) cl.numberPosition = 'br';
    if (!FONT_STACKS[cl.numberFont]) cl.numberFont = COLLAGE_DEFAULTS.numberFont;
    ['numberColor','numberOutlineColor','numberShadowColor'].forEach((key) => {
      if (!/^#[0-9a-f]{6}$/i.test(cl[key])) cl[key] = COLLAGE_DEFAULTS[key];
    });
    cl.numberOpacity = clamp(numberOr(cl.numberOpacity, 100), 5, 100);
    cl.numberOutlineOpacity = clamp(numberOr(cl.numberOutlineOpacity, 100), 0, 100);
    cl.numberOutlineWidth = clamp(numberOr(cl.numberOutlineWidth, 2), 0, 12);
    cl.numberShadowOpacity = clamp(numberOr(cl.numberShadowOpacity, 50), 0, 100);
    cl.numberShadowBlur = clamp(numberOr(cl.numberShadowBlur, 8), 0, 40);
    cl.numberShadowX = clamp(numberOr(cl.numberShadowX, 2), -20, 20);
    cl.numberShadowY = clamp(numberOr(cl.numberShadowY, 2), -20, 20);
    cl.numberOutlineEnabled = Boolean(cl.numberOutlineEnabled);
    cl.numberShadowEnabled = Boolean(cl.numberShadowEnabled);
    cl.numberShowOnSold = cl.numberShowOnSold !== false;
    if (!/^#[0-9a-f]{6}$/i.test(cl.background)) cl.background = COLLAGE_DEFAULTS.background;
    cl.soldNumbers = String(cl.soldNumbers ?? '').slice(0, 200);

    sanitizeMarkSettings(state.marks.frame, FRAME_DEFAULTS, {
      scale: [10, 120], opacity: [5, 100], x: [-50, 50], y: [-50, 50],
      shadowOpacity: [0, 100], shadowBlur: [0, 120], shadowX: [-40, 40], shadowY: [-40, 40]
    });
    sanitizeMarkSettings(state.marks.small, SMALL_DEFAULTS, {
      scale: [3, 70], opacity: [5, 100], x: [-45, 45], y: [-45, 45], rotate: [-45, 45],
      shadowOpacity: [0, 100], shadowBlur: [0, 60], shadowX: [-20, 20], shadowY: [-20, 20]
    });
    if (!['tl','tc','tr','ml','mc','mr','bl','bc','br'].includes(state.marks.small.anchor)) {
      state.marks.small.anchor = SMALL_DEFAULTS.anchor;
    }
    if (!['cell','sheet'].includes(state.marks.frame.placement)) state.marks.frame.placement = FRAME_DEFAULTS.placement;
    if (!['cell','sheet'].includes(state.marks.small.placement)) state.marks.small.placement = SMALL_DEFAULTS.placement;

    const ex = state.export;
    ex.format = ['jpeg','png'].includes(String(ex.format)) ? String(ex.format) : EXPORT_DEFAULTS.format;
    ex.edge = ['1600','2400','3200','4000'].includes(String(ex.edge)) ? String(ex.edge) : EXPORT_DEFAULTS.edge;
    ex.edgeLocked = ex.edgeLocked === undefined ? EXPORT_DEFAULTS.edgeLocked : Boolean(ex.edgeLocked);
    ex.quality = clamp(Math.round(numberOr(ex.quality, EXPORT_DEFAULTS.quality)), 70, 100);
    ex.prefix = String(ex.prefix || EXPORT_DEFAULTS.prefix).slice(0, 30);
  }

  function sanitizeMarkSettings(settings, defaults, limits) {
    Object.entries(limits).forEach(([key, [min, max]]) => {
      settings[key] = clamp(numberOr(settings[key], defaults[key]), min, max);
    });
    if (!BLEND_MODES[settings.blend]) settings.blend = defaults.blend;
    ['shadowEnabled','tintEnabled'].forEach((key) => {
      if (!(key in defaults)) return;
      settings[key] = Boolean(settings[key]);
    });
    ['shadowColor','tintColor'].forEach((key) => {
      if (!(key in defaults)) return;
      if (!/^#[0-9a-f]{6}$/i.test(settings[key])) settings[key] = defaults[key];
    });
  }

  function resetSettings() {
    state.watermark = { ...WATERMARK_DEFAULTS };
    state.fullscreenPreset = { ...FULLSCREEN_PRESET_DEFAULTS };
    state.collage = { ...COLLAGE_DEFAULTS };
    state.marks = {
      frame: { ...FRAME_DEFAULTS },
      small: { ...SMALL_DEFAULTS }
    };
    state.assets.frame.forEach((layer) => { layer.settings = { ...FRAME_DEFAULTS }; });
    state.assets.small.forEach((layer) => { layer.settings = { ...SMALL_DEFAULTS }; });
    state.marks.frame = state.assets.frame[0]?.settings || { ...FRAME_DEFAULTS };
    state.marks.small = state.assets.small[0]?.settings || { ...SMALL_DEFAULTS };
    state.selectedMarkLayers.frame = state.assets.frame[0]?.id || null;
    state.selectedMarkLayers.small = state.assets.small[0]?.id || null;
    state.export = { ...EXPORT_DEFAULTS };
    applyUiFromState();
    persistSettings();
    toast('已恢复默认设置');
    schedulePreview();
  }

  function applySignaturePreset(name) {
    name = PRESET_ALIASES[name] || name;
    if (!PRESETS[name]) return;
    if (state.watermark.preset === name) {
      state.watermark.preset = 'none';
      applyUiFromState();
      persistSettings();
      schedulePreview();
      return;
    }
    state.watermark.preset = name;
    Object.assign(state.watermark, PRESETS[name]);
    applyUiFromState();
    el.presetSettingsDetails.open = true;
    persistSettings();
    if (name === 'kaki-psd') {
      preloadKakiTemplate();
      schedulePreviewForFont('javacom');
    } else {
      schedulePreview();
    }
  }

  function applyFullscreenPreset(name) {
    if (!FULLSCREEN_PRESETS[name]) return;
    if (state.fullscreenPreset.preset === name) {
      state.fullscreenPreset.preset = 'none';
      applyUiFromState();
      persistSettings();
      schedulePreview();
      return;
    }
    state.fullscreenPreset.preset = name;
    Object.assign(state.fullscreenPreset, FULLSCREEN_PRESETS[name]);
    applyUiFromState();
    el.fullscreenPresetDetails.open = true;
    persistSettings();
    schedulePreview();
  }

  function setMode(mode) {
    if (!['watermark','collage'].includes(mode)) return;
    state.mode = mode;
    state.activePage = 0;
    applyUiFromState();
    persistSettings();
    renderQueue();
    schedulePreview();
  }

  function fileId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function readImageMeta(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const result = { width: img.naturalWidth, height: img.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(result);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`无法读取图片：${file.name}`));
      };
      img.src = url;
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (!img.naturalWidth || !img.naturalHeight) {
          reject(new Error('图片尺寸无效'));
          return;
        }
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片格式无法读取'));
      };
      img.src = url;
    });
  }

  function preloadKakiTemplate() {
    if (kakiTemplatePromise) return kakiTemplatePromise;
    kakiTemplatePromise = new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        kakiTemplateImage = image;
        resolve(image);
        schedulePreview();
      };
      image.onerror = () => {
        kakiTemplatePromise = null;
        console.error('Kaki 爱心模板加载失败');
        resolve(null);
      };
      image.src = KAKI_PSD_TEMPLATE_SRC;
    });
    return kakiTemplatePromise;
  }

  async function createAssetRecord(file) {
    const image = await loadImage(file);
    return {
      id: fileId(),
      file,
      name: file.name,
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      thumbUrl: URL.createObjectURL(file)
    };
  }

  function releaseAsset(record) {
    if (record?.thumbUrl) URL.revokeObjectURL(record.thumbUrl);
    if (record) record.image = null;
  }

  function releaseAllAssets() {
    state.assets.fullscreen.forEach((layer) => releaseAsset(layer.record));
    state.assets.fullscreen = [];
    state.assets.frame.forEach((layer) => releaseAsset(layer.record));
    state.assets.small.forEach((layer) => releaseAsset(layer.record));
    state.assets.frame = [];
    state.assets.small = [];
  }

  function validAssetFiles(files) {
    return Array.from(files || []).filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast(`${file.name}：不是图片文件`, 'error');
        return false;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast(`${file.name}：文件超过 60MB`, 'error');
        return false;
      }
      return true;
    });
  }

  async function addFullscreenAssets(files) {
    const incoming = validAssetFiles(files);
    if (!incoming.length) return;
    const room = MAX_FULLSCREEN_LAYERS - state.assets.fullscreen.length;
    if (room <= 0) {
      toast(`全屏水印最多 ${MAX_FULLSCREEN_LAYERS} 层`, 'error');
      return;
    }
    const selected = incoming.slice(0, room);
    const records = [];
    for (const file of selected) {
      try {
        records.push(await createAssetRecord(file));
      } catch (_) {
        toast(`${file.name}：无法读取`, 'error');
      }
    }
    records.forEach((record, index) => {
      state.assets.fullscreen.push({
        id: record.id,
        record,
        opacity: 100,
        blend: 'overlay',
        fit: 'cover',
        placement: 'before'
      });
    });
    if (incoming.length > room) toast(`最多保留 ${MAX_FULLSCREEN_LAYERS} 层全屏水印`, 'error');
    renderMarkModules();
    schedulePreview();
  }

  async function addCompositeAssets(type, files) {
    const incoming = validAssetFiles(files);
    if (!incoming.length) return;
    const layers = state.assets[type];
    const room = MAX_COMPOSITE_LAYERS - layers.length;
    const label = type === 'frame' ? '水印框' : '小水印';
    if (room <= 0) {
      toast(`${label}最多 ${MAX_COMPOSITE_LAYERS} 张`, 'error');
      return;
    }
    const selected = incoming.slice(0, room);
    const records = [];
    for (const file of selected) {
      try {
        records.push(await createAssetRecord(file));
      } catch (_) {
        toast(`${file.name}：无法读取`, 'error');
      }
    }
    records.forEach((record) => {
      layers.push({
        id: record.id,
        record,
        settings: { ...state.marks[type] }
      });
    });
    if (!state.selectedMarkLayers[type] && layers.length) {
      state.selectedMarkLayers[type] = layers[0].id;
      state.marks[type] = layers[0].settings;
    }
    if (incoming.length > room) toast(`最多保留 ${MAX_COMPOSITE_LAYERS} 张${label}`, 'error');
    renderMarkModules();
    syncMarkControlsFromState();
    schedulePreview();
  }

  function removeFullscreenAsset(id) {
    const index = state.assets.fullscreen.findIndex((layer) => layer.id === id);
    if (index < 0) return;
    releaseAsset(state.assets.fullscreen[index].record);
    state.assets.fullscreen.splice(index, 1);
    renderMarkModules();
    schedulePreview();
  }

  function removeCompositeAsset(type, id) {
    const layers = state.assets[type];
    const index = layers.findIndex((layer) => layer.id === id);
    if (index < 0) return;
    releaseAsset(layers[index].record);
    layers.splice(index, 1);
    if (state.selectedMarkLayers[type] === id) {
      const next = layers[0];
      state.selectedMarkLayers[type] = next?.id || null;
      if (next) state.marks[type] = next.settings;
    }
    renderMarkModules();
    syncMarkControlsFromState();
    schedulePreview();
  }

  function selectCompositeLayer(type, id) {
    const layer = state.assets[type].find((item) => item.id === id);
    if (!layer) return;
    state.selectedMarkLayers[type] = layer.id;
    state.marks[type] = layer.settings;
    renderMarkModules();
    syncMarkControlsFromState();
    syncAllRanges();
    schedulePreview();
  }

  function renderCompositeLayerList(type) {
    const layers = state.assets[type];
    const list = type === 'frame' ? el.frameList : el.smallList;
    list.innerHTML = '';
    layers.forEach((layer, index) => {
      const card = document.createElement('article');
      card.className = 'layer-card composite-layer-card';
      if (state.selectedMarkLayers[type] === layer.id) card.classList.add('active');
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `编辑第 ${index + 1} 张${type === 'frame' ? '水印框' : '小水印'} ${layer.record.name}`);

      const head = document.createElement('div');
      head.className = 'layer-head';
      const thumb = document.createElement('span');
      thumb.className = 'layer-thumb';
      const img = document.createElement('img');
      img.src = layer.record.thumbUrl;
      img.alt = '';
      thumb.appendChild(img);
      const name = document.createElement('div');
      name.className = 'layer-name';
      const title = document.createElement('strong');
      title.textContent = `第 ${index + 1} 张 · ${layer.record.name}`;
      const detail = document.createElement('small');
      detail.textContent = `${layer.record.width} × ${layer.record.height}`;
      name.append(title, detail);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'layer-remove';
      remove.title = '移除这一张';
      remove.setAttribute('aria-label', `移除 ${layer.record.name}`);
      remove.textContent = '×';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        removeCompositeAsset(type, layer.id);
      });
      head.append(thumb, name, remove);
      card.appendChild(head);
      card.addEventListener('click', () => selectCompositeLayer(type, layer.id));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectCompositeLayer(type, layer.id);
        }
      });
      list.appendChild(card);
    });
  }

  function renderMarkModules() {
    el.fullscreenCount.textContent = `${state.assets.fullscreen.length} 层`;
    const hasFullscreen = state.assets.fullscreen.length > 0;
    el.fullscreenEmptyTitle.textContent = hasFullscreen ? '继续添加全屏水印' : '还没有全屏水印';
    el.fullscreenEmptyHint.textContent = hasFullscreen
      ? `已导入 ${state.assets.fullscreen.length} / ${MAX_FULLSCREEN_LAYERS} 层`
      : '支持 PNG / WEBP · 最多 8 层';
    el.addFullscreenBtn.disabled = state.assets.fullscreen.length >= MAX_FULLSCREEN_LAYERS;

    const frameLayers = state.assets.frame;
    const smallLayers = state.assets.small;
    const activeFrame = frameLayers.find((layer) => layer.id === state.selectedMarkLayers.frame) || frameLayers[0];
    const activeSmall = smallLayers.find((layer) => layer.id === state.selectedMarkLayers.small) || smallLayers[0];
    if (activeFrame) {
      state.selectedMarkLayers.frame = activeFrame.id;
      state.marks.frame = activeFrame.settings;
    }
    if (activeSmall) {
      state.selectedMarkLayers.small = activeSmall.id;
      state.marks.small = activeSmall.settings;
    }

    el.frameStatus.textContent = `${frameLayers.length} 张`;
    el.frameEmptyTitle.textContent = frameLayers.length ? '继续添加水印框' : '还没有水印框';
    el.frameEmptyHint.textContent = frameLayers.length
      ? `已导入 ${frameLayers.length} / ${MAX_COMPOSITE_LAYERS} 张`
      : `PNG 透明底效果最好 · 最多 ${MAX_COMPOSITE_LAYERS} 张`;
    el.frameChooseBtn.disabled = frameLayers.length >= MAX_COMPOSITE_LAYERS;
    el.frameEditor.hidden = !frameLayers.length;
    el.frameActiveLabel.textContent = activeFrame
      ? `当前编辑：第 ${frameLayers.indexOf(activeFrame) + 1} 张 · ${activeFrame.record.name}`
      : '';

    el.smallStatus.textContent = `${smallLayers.length} 张`;
    el.smallEmptyTitle.textContent = smallLayers.length ? '继续添加小水印' : '还没有小水印';
    el.smallEmptyHint.textContent = smallLayers.length
      ? `已导入 ${smallLayers.length} / ${MAX_COMPOSITE_LAYERS} 张`
      : `可以导入透明底 Logo · 最多 ${MAX_COMPOSITE_LAYERS} 张`;
    el.smallChooseBtn.disabled = smallLayers.length >= MAX_COMPOSITE_LAYERS;
    el.smallEditor.hidden = !smallLayers.length;
    el.smallActiveLabel.textContent = activeSmall
      ? `当前编辑：第 ${smallLayers.indexOf(activeSmall) + 1} 张 · ${activeSmall.record.name}`
      : '';

    el.collageMarkPlacements.forEach((node) => {
      node.hidden = state.mode !== 'collage';
    });
    updateEffectVisibility();
    renderFullscreenList();
    renderCompositeLayerList('frame');
    renderCompositeLayerList('small');
  }

  function updateEffectVisibility() {
    el.frameShadowControls.hidden = !state.marks.frame.shadowEnabled;
    el.smallShadowControls.hidden = !state.marks.small.shadowEnabled;
    el.frameTintCombo.classList.toggle('is-on', state.marks.frame.tintEnabled);
    el.smallTintCombo.classList.toggle('is-on', state.marks.small.tintEnabled);
  }

  function makeOption(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }

  function renderFullscreenList() {
    el.fullscreenList.innerHTML = '';
    if (!state.assets.fullscreen.length) return;

    state.assets.fullscreen.forEach((layer, index) => {
      const card = document.createElement('article');
      card.className = 'layer-card';

      const head = document.createElement('div');
      head.className = 'layer-head';
      const thumb = document.createElement('span');
      thumb.className = 'layer-thumb';
      const thumbImg = document.createElement('img');
      thumbImg.src = layer.record.thumbUrl;
      thumbImg.alt = '';
      thumb.appendChild(thumbImg);
      const name = document.createElement('div');
      name.className = 'layer-name';
      const title = document.createElement('strong');
      title.textContent = `第 ${index + 1} 层 · ${layer.record.name}`;
      const detail = document.createElement('small');
      detail.textContent = `${layer.record.width} × ${layer.record.height}`;
      name.append(title, detail);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'layer-remove';
      remove.title = '移除这一层';
      remove.setAttribute('aria-label', `移除 ${layer.record.name}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => removeFullscreenAsset(layer.id));
      head.append(thumb, name, remove);

      const controls = document.createElement('div');
      controls.className = 'layer-controls';

      const opacityBox = document.createElement('div');
      opacityBox.className = 'layer-control';
      const opacityLabel = document.createElement('label');
      opacityLabel.htmlFor = `layer-opacity-${layer.id}`;
      opacityLabel.textContent = '不透明度';
      const opacityOut = document.createElement('output');
      opacityOut.textContent = `${layer.opacity}%`;
      opacityLabel.appendChild(opacityOut);
      const opacity = document.createElement('input');
      opacity.type = 'range';
      opacity.id = `layer-opacity-${layer.id}`;
      opacity.min = '0';
      opacity.max = '100';
      opacity.step = '1';
      opacity.value = String(layer.opacity);
      syncRange(opacity, opacityOut);
      opacity.addEventListener('input', () => {
        layer.opacity = numberOr(opacity.value, 40);
        syncRange(opacity, opacityOut);
        schedulePreview();
      });
      opacityBox.append(opacityLabel, opacity);

      const blendBox = document.createElement('div');
      blendBox.className = 'layer-control';
      const blendLabel = document.createElement('label');
      blendLabel.textContent = '混合模式';
      const blend = document.createElement('select');
      [
        ['normal','正常'], ['soft-light','柔光'], ['screen','滤色'], ['multiply','正片叠底'],
        ['overlay','叠加'], ['lighten','变亮'], ['darken','变暗']
      ].forEach(([value, label]) => blend.appendChild(makeOption(value, label)));
      blend.value = layer.blend;
      blend.addEventListener('change', () => {
        layer.blend = FULLSCREEN_BLENDS.includes(blend.value) ? blend.value : 'normal';
        schedulePreview();
      });
      blendBox.append(blendLabel, blend);

      const fitBox = document.createElement('div');
      fitBox.className = 'layer-control';
      const fitLabel = document.createElement('label');
      fitLabel.textContent = '铺放方式';
      const fit = document.createElement('select');
      [['cover','铺满画面'],['contain','完整显示'],['tile','平铺重复']].forEach(([value, label]) => fit.appendChild(makeOption(value, label)));
      fit.value = layer.fit;
      fit.addEventListener('change', () => {
        layer.fit = ['cover','contain','tile'].includes(fit.value) ? fit.value : 'cover';
        schedulePreview();
      });
      fitBox.append(fitLabel, fit);

      controls.append(opacityBox, blendBox, fitBox);
      if (state.mode === 'collage') {
        const placeBox = document.createElement('div');
        placeBox.className = 'layer-control wide';
        const placeLabel = document.createElement('label');
        placeLabel.textContent = '与拼图的关系';
        const place = document.createElement('select');
        [['before','拼图前叠加'],['after','拼图后叠加']].forEach(([value, label]) => place.appendChild(makeOption(value, label)));
        place.value = layer.placement;
        place.addEventListener('change', () => {
          layer.placement = place.value === 'before' ? 'before' : 'after';
          schedulePreview();
        });
        placeBox.append(placeLabel, place);
        controls.appendChild(placeBox);
      }

      card.append(head, controls);
      el.fullscreenList.appendChild(card);
    });
  }

  async function addFiles(fileList) {
    if (state.busy) {
      toast('请等待当前导出任务结束');
      return;
    }
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const accepted = [];
    const rejected = [];
    for (const file of incoming) {
      if (!file.type.startsWith('image/')) {
        rejected.push(`${file.name}：不是图片`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name}：文件超过 60MB`);
        continue;
      }
      accepted.push(file);
    }

    if (!accepted.length) {
      toast(rejected[0] || '没有可导入的图片', 'error');
      return;
    }

    el.dropZone.classList.add('is-loading');
    el.dropZone.setAttribute('aria-busy', 'true');
    const loaded = [];
    for (const file of accepted) {
      try {
        const meta = await readImageMeta(file);
        loaded.push({
          id: fileId(),
          file,
          name: file.name,
          width: meta.width,
          height: meta.height,
          thumbUrl: URL.createObjectURL(file)
        });
      } catch (_) {
        rejected.push(`${file.name}：无法读取`);
      }
    }
    state.files.push(...loaded);
    state.activePage = clamp(state.activePage, 0, Math.max(0, pageCount() - 1));
    renderQueue();
    syncStageTitle();
    updateActionAvailability();
    schedulePreview();
    if (loaded.length) await persistImportedFiles();
    el.dropZone.classList.remove('is-loading');
    el.dropZone.removeAttribute('aria-busy');

    if (loaded.length) {
      const cacheNotice = state.files.length > MAX_CACHED_FILES
        ? `；当前共 ${state.files.length} 张，刷新后仅恢复前 ${MAX_CACHED_FILES} 张缓存`
        : '';
      toast(`已加入 ${loaded.length} 张图片${cacheNotice}`);
    }
    if (rejected.length) toast(rejected.slice(0, 2).join('；'), 'error');
  }

  function removeFile(id) {
    const index = state.files.findIndex((f) => f.id === id);
    if (index < 0) return;
    const [removed] = state.files.splice(index, 1);
    if (removed.thumbUrl) URL.revokeObjectURL(removed.thumbUrl);
    state.activePage = clamp(state.activePage, 0, Math.max(0, pageCount() - 1));
    renderQueue();
    syncStageTitle();
    updateActionAvailability();
    schedulePreview();
    persistImportedFiles();
  }

  function clearFiles() {
    if (!state.files.length) return;
    if (!window.confirm(`确定清空这 ${state.files.length} 张图片吗？原始文件不会被删除。`)) return;
    state.files.forEach((f) => f.thumbUrl && URL.revokeObjectURL(f.thumbUrl));
    state.files = [];
    state.activePage = 0;
    renderQueue();
    syncStageTitle();
    updateActionAvailability();
    schedulePreview();
    clearStoredFiles();
    toast('作品队列已清空');
  }

  function renderQueue() {
    const hasFiles = state.files.length > 0;
    el.queueView.hidden = !hasFiles;
    el.queueStrip.innerHTML = '';
    if (!hasFiles) {
      el.libraryMeta.textContent = '尚未导入图片';
      window.dispatchEvent(new CustomEvent('kaki-studio:images-changed'));
      return;
    }
    el.libraryMeta.textContent = `${state.files.length} 张 · 合计 ${formatBytes(state.files.reduce((sum, f) => sum + f.file.size, 0))}`;

    const activeImageIndex = state.mode === 'collage'
      ? (collagePages()[state.activePage]?.records[0]?.fileIndex ?? 0)
      : clamp(state.activePage, 0, state.files.length - 1);

    state.files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.draggable = true;
      item.dataset.id = file.id;
      item.title = `${file.name} · ${file.width}×${file.height}`;
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `选择第 ${index + 1} 张 ${file.name}`);
      const img = document.createElement('img');
      img.src = file.thumbUrl;
      img.alt = '';
      img.loading = 'lazy';
      const badge = document.createElement('span');
      badge.textContent = pad(index + 1);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'queue-remove';
      remove.title = `移除 ${file.name}`;
      remove.setAttribute('aria-label', `移除 ${file.name}`);
      remove.textContent = '×';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        if (window.confirm(`确定从作品队列移除“${file.name}”吗？原始文件不会被删除。`)) {
          removeFile(file.id);
        }
      });
      item.append(img, badge, remove);
      item.addEventListener('click', () => {
        selectImage(index);
      });
      item.addEventListener('dblclick', () => openImagePreview(file, index));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectImage(index);
          openImagePreview(file, index);
        }
      });
      bindDragSort(item);
      if (index === activeImageIndex) item.classList.add('active');
      el.queueStrip.appendChild(item);
    });
    window.dispatchEvent(new CustomEvent('kaki-studio:images-changed'));
  }

  function selectImage(index) {
    if (!state.files[index]) return;
    if (state.mode === 'collage') {
      const page = collagePages().findIndex((item) => item.records.some((record) => record.fileIndex === index));
      state.activePage = Math.max(0, page);
    } else {
      state.activePage = index;
    }
    renderQueue();
    updatePager();
    schedulePreview();
  }

  let draggedId = null;
  function bindDragSort(item) {
    item.addEventListener('dragstart', (event) => {
      draggedId = item.dataset.id;
      item.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      try { event.dataTransfer.setData('text/plain', draggedId); } catch (_) {}
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.queue-item.drop-target').forEach((node) => node.classList.remove('drop-target'));
      draggedId = null;
    });
    item.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (item.dataset.id !== draggedId) item.classList.add('drop-target');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drop-target'));
    item.addEventListener('drop', (event) => {
      event.preventDefault();
      item.classList.remove('drop-target');
      const targetId = item.dataset.id;
      const sourceId = draggedId || event.dataTransfer.getData('text/plain');
      if (!sourceId || sourceId === targetId) return;
      const from = state.files.findIndex((f) => f.id === sourceId);
      const to = state.files.findIndex((f) => f.id === targetId);
      if (from < 0 || to < 0) return;
      const [moved] = state.files.splice(from, 1);
      state.files.splice(to, 0, moved);
      renderQueue();
      schedulePreview();
      persistImportedFiles();
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function openImagePreview(record, index) {
    if (!record) return;
    el.imagePreviewImg.src = record.thumbUrl;
    el.imagePreviewImg.alt = record.name;
    el.imagePreviewTitle.textContent = record.name;
    el.imagePreviewMeta.textContent = `第 ${index + 1} 张 · ${record.width} × ${record.height}`;
    el.imagePreviewOverlay.hidden = false;
  }

  function closeImagePreview() {
    el.imagePreviewOverlay.hidden = true;
    el.imagePreviewImg.removeAttribute('src');
  }

  function perPage() {
    return clamp(Math.round(state.collage.rows), 1, 8) * clamp(Math.round(state.collage.cols), 1, 8);
  }

  function choosePageLayout(count, maxRows, maxCols) {
    let best = null;
    for (let cols = 1; cols <= Math.min(maxCols, count); cols++) {
      const rows = Math.ceil(count / cols);
      if (rows > maxRows) continue;
      const emptyCells = rows * cols - count;
      const score = emptyCells * 20 + Math.abs(cols - maxCols) + Math.abs(rows - maxRows) * 0.5;
      if (!best || score < best.score) best = { cols, rows, score };
    }
    if (!best) {
      const cols = Math.min(maxCols, count);
      return { cols, rows: Math.ceil(count / cols) };
    }
    return best;
  }

  function collagePages() {
    if (!state.files.length) return [];
    const capacity = perPage();
    const indexed = state.files.map((record, fileIndex) => ({ record, fileIndex }));
    const groups = [];

    if (state.collage.ratio === 'auto') {
      let currentGroup = null;
      indexed.forEach((item) => {
        const ratio = clamp(item.record.width / item.record.height, 0.2, 5);
        if (!currentGroup || Math.abs(currentGroup.ratio - ratio) / currentGroup.ratio > 0.025) {
          currentGroup = {
            ratio,
            ratioSum: 0,
            ratioCount: 0,
            firstIndex: item.fileIndex,
            items: []
          };
          groups.push(currentGroup);
        }
        currentGroup.items.push(item);
        currentGroup.ratioSum += ratio;
        currentGroup.ratioCount++;
        currentGroup.ratio = clamp(currentGroup.ratioSum / currentGroup.ratioCount, 0.2, 5);
      });
    } else {
      groups.push({
        ratio: selectedCollageRatio(),
        firstIndex: 0,
        items: indexed
      });
    }

    const pages = [];
    const maxRows = clamp(Math.round(state.collage.rows), 1, 8);
    const maxCols = clamp(Math.round(state.collage.cols), 1, 8);
    groups.forEach((group, groupIndex) => {
      for (let i = 0; i < group.items.length; i += capacity) {
        const records = group.items.slice(i, i + capacity);
        const layout = choosePageLayout(records.length, maxRows, maxCols);
        pages.push({
          records,
          ratio: group.ratio,
          layoutCols: layout.cols,
          layoutRows: layout.rows,
          groupIndex,
          pageInGroup: i / capacity
        });
      }
    });
    return pages;
  }

  function selectedCollageRatio() {
    if (state.collage.ratio === 'custom') {
      return clamp(state.collage.customWidth / Math.max(1, state.collage.customHeight), 0.2, 5);
    }
    const ratios = { '1:1': 1, '3:4': 3 / 4, '4:3': 4 / 3, '9:16': 9 / 16, '16:9': 16 / 9 };
    return ratios[state.collage.ratio] || 0.8;
  }

  function pageCount() {
    if (!state.files.length) return 0;
    return state.mode === 'collage' ? collagePages().length : state.files.length;
  }

  function updatePager() {
    const count = pageCount();
    if (!count) {
      el.pagerLabel.textContent = '0 / 0';
      el.prevBtn.disabled = true;
      el.nextBtn.disabled = true;
      return;
    }
    state.activePage = clamp(state.activePage, 0, count - 1);
    el.pagerLabel.textContent = `${state.activePage + 1} / ${count}`;
    el.prevBtn.disabled = state.activePage <= 0;
    el.nextBtn.disabled = state.activePage >= count - 1;
  }

  function updateActionAvailability() {
    const has = state.files.length > 0;
    el.downloadCurrentBtn.disabled = !has || state.busy;
    el.exportAllBtn.disabled = !has || state.busy;
    el.previewAllBtn.disabled = !has || state.busy;
    el.exportAllLabel.textContent = state.mode === 'watermark' ? '批量导出 ZIP' : '打包全部页面';
    el.emptyState.hidden = has;
    el.previewCanvas.hidden = !has;
    updatePager();
  }

  function goPage(delta) {
    const count = pageCount();
    if (!count) return;
    state.activePage = clamp(state.activePage + delta, 0, count - 1);
    renderQueue();
    updatePager();
    schedulePreview();
  }

  function schedulePreview() {
    clearResultGallery();
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
      renderPreview().catch((error) => {
        console.error(error);
        toast('预览生成失败，请重新导入图片', 'error');
      });
    }, 70);
  }

  function warmCustomFonts() {
    if (!document.fonts) return;
    const fontKeys = new Set(['alfa-slab', 'bebas-neue']);
    if (state.watermark.preset === 'kaki-psd') fontKeys.add('javacom');
    [state.watermark.font, state.fullscreenPreset.font, state.collage.numberFont].forEach((key) => {
      if (CUSTOM_FONT_FAMILIES[key]) fontKeys.add(key);
    });
    const fontNames = [...fontKeys].map((key) => CUSTOM_FONT_FAMILIES[key]);
    const loaders = typeof document.fonts.load === 'function'
      ? fontNames.map((family) => document.fonts.load(`600 24px ${family}`))
      : [];
    Promise.allSettled([...loaders, document.fonts.ready]).then(() => schedulePreview());
  }

  function schedulePreviewForFont(fontKey) {
    const family = CUSTOM_FONT_FAMILIES[fontKey];
    if (!family || !document.fonts || typeof document.fonts.load !== 'function') {
      schedulePreview();
      return;
    }
    schedulePreview();
    document.fonts.load(`600 24px ${family}`).catch(() => null).then(() => schedulePreview());
  }

  function resolveWatermarkText(template, index) {
    const number = state.collage.numberStart + index;
    return String(template || '').replace(/\{n\}/gi, String(number)).replace(/\{nn\}/gi, pad(number));
  }

  function fitFontSize(ctx, text, baseSize, maxWidth, fontKey = state.watermark.font) {
    let size = baseSize;
    ctx.font = `600 ${size}px ${FONT_STACKS[fontKey] || FONT_STACKS.sans}`;
    const width = ctx.measureText(text).width;
    if (width > maxWidth && width > 0) size *= maxWidth / width;
    return Math.max(8, size);
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawText(ctx, text, x, y, size, align = 'left', baseline = 'middle', alpha = 1) {
    const wm = state.watermark;
    ctx.save();
    ctx.font = `600 ${size}px ${FONT_STACKS[wm.font] || FONT_STACKS.sans}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.lineJoin = 'round';
    ctx.globalAlpha = (wm.opacity / 100) * alpha;
    if (wm.stroke > 0) {
      ctx.strokeStyle = wm.strokeColor;
      ctx.lineWidth = Math.max(0.5, size * (wm.stroke / 100) * 1.8);
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = wm.color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawFullscreenPreset(ctx, boxW, boxH, number) {
    const fp = state.fullscreenPreset;
    if (fp.preset === 'none') return;
    const text = resolveWatermarkText(fp.text, number).trim();
    if (!text) return;
    const minDim = Math.min(boxW, boxH);
    const baseSize = minDim * (fp.size / 100);
    const size = fitFontSize(ctx, text, baseSize, boxW * 0.5, fp.font);
    const spacing = size * (fp.gap / 10);
    const diagonal = Math.hypot(boxW, boxH);
    ctx.save();
    ctx.translate(boxW / 2, boxH / 2);
    ctx.rotate(fp.rotate * Math.PI / 180);
    ctx.translate(-boxW / 2, -boxH / 2);
    ctx.font = `600 ${size}px ${FONT_STACKS[fp.font] || FONT_STACKS.sans}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = fp.opacity / 100;
    ctx.globalCompositeOperation = BLEND_MODES[fp.blend] || 'source-over';
    const measured = ctx.measureText(text).width;
    const stepX = Math.max(spacing, measured + size * 1.6);
    const stepY = Math.max(size * 3.5, size * (fp.gap / 6));
    const start = -boxW * 1.1;
    const endX = boxW * 2.1;
    const endY = boxH * 2.1;
    for (let y = -boxH * 0.7, row = 0; y < endY; y += stepY, row++) {
      const offset = row % 2 ? stepX / 2 : 0;
      for (let x = start - offset; x < endX; x += stepX) {
        if ((x + y) > -diagonal && (x + y) < diagonal * 2.2) {
          if (fp.stroke > 0) {
            ctx.strokeStyle = fp.strokeColor;
            ctx.lineWidth = Math.max(0.5, size * (fp.stroke / 100) * 1.8);
            ctx.strokeText(text, x, y);
          }
          ctx.fillStyle = fp.color;
          ctx.fillText(text, x, y);
        }
      }
    }
    ctx.restore();
  }

  function drawWatermark(ctx, boxW, boxH, number, options = {}) {
    const wm = state.watermark;
    const preset = options.preset || wm.preset;
    if (!preset || preset === 'none') return;
    const dims = options.dims || { x: 0, y: 0, w: boxW, h: boxH };
    const minDim = Math.min(boxW, boxH);
    const text = resolveWatermarkText(wm.text, number).trim();
    const rightLabel = preset === 'band' && wm.bandRightEnabled ? bandRightLabel() : '';
    if (!text && !rightLabel && preset !== 'kaki-psd') return;
    const margin = minDim * (wm.margin / 100);
    const baseSize = minDim * (wm.size / 100);

    ctx.save();
    if (options.clip) {
      roundedRect(ctx, dims.x, dims.y, dims.w, dims.h, options.radius || 0);
      ctx.clip();
    }
    ctx.translate(dims.x, dims.y);

    if (preset === 'kaki-psd') {
      const style = KAKI_PSD_SIGNATURE;
      const artSize = minDim;
      const artX = (boxW - artSize) / 2;
      const artY = (boxH - artSize) / 2;
      if (kakiTemplateImage) {
        ctx.drawImage(kakiTemplateImage, artX, artY, artSize, artSize);
      }
      if (!text) {
        ctx.restore();
        return;
      }
      const size = artSize * (style.fontSizePercent / 100);
      const strokeWidth = artSize * style.strokeWidth * 2;
      // PSD's 109° is the global-light angle; Canvas casts the shadow in the opposite direction.
      const shadowRadians = (style.shadowAngle + 180) * Math.PI / 180;
      const shadowX = artSize * style.shadowDistance * Math.cos(shadowRadians);
      const shadowY = -artSize * style.shadowDistance * Math.sin(shadowRadians);
      const shadowBlur = minDim * style.shadowBlur;
      ctx.translate(artX + artSize * style.anchorX, artY + artSize * style.anchorY);
      ctx.rotate(style.rotate * Math.PI / 180);
      ctx.font = `400 ${size}px ${FONT_STACKS[style.font]}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1, strokeWidth);
      ctx.strokeStyle = style.strokeColor;
      ctx.shadowColor = `rgba(0,0,0,${style.shadowOpacity})`;
      ctx.shadowOffsetX = shadowX;
      ctx.shadowOffsetY = shadowY;
      ctx.shadowBlur = Math.max(0.5, shadowBlur);
      ctx.strokeText(text, 0, 0);
      ctx.shadowColor = 'transparent';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = style.color;
      ctx.fillText(text, 0, 0);
    } else if (preset === 'gradient') {
      const gradientHeight = boxH * (wm.gradientHeight / 100);
      const top = boxH - gradientHeight;
      const strength = clamp(wm.gradientStrength / 100, 0, 1);
      const gradient = ctx.createLinearGradient(0, top, 0, boxH);
      gradient.addColorStop(0, hexToRgba(wm.gradientColor, 0));
      gradient.addColorStop(0.5, hexToRgba(wm.gradientColor, strength * 0.3));
      gradient.addColorStop(1, hexToRgba(wm.gradientColor, strength * 0.96));
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.fillRect(0, top, boxW, gradientHeight);
      ctx.restore();

      const maxWidth = boxW - margin * 2;
      const ghostSize = fitFontSize(ctx, text, minDim * 0.18, maxWidth * 0.96);
      const size = fitFontSize(ctx, text, baseSize, maxWidth * 0.82);
      const signatureY = boxH - Math.max(size * 1.45, minDim * 0.075);
      const ghostY = signatureY - ghostSize * 0.28;
      drawText(ctx, text, boxW / 2, ghostY, ghostSize, 'center', 'middle', 0.17);
      ctx.save();
      ctx.shadowColor = hexToRgba(wm.gradientColor, 0.55);
      ctx.shadowBlur = minDim * 0.025;
      drawText(ctx, text, boxW / 2, signatureY, size, 'center', 'middle');
      ctx.restore();
    } else if (preset === 'band') {
      const bandH = Math.max(baseSize * 2.75, boxH * 0.085);
      const bandY = boxH - bandH;
      ctx.save();
      ctx.fillStyle = hexToRgba(wm.bandBackground, wm.bandOpacity / 100);
      ctx.fillRect(0, bandY, boxW, bandH);
      let size = fitFontSize(ctx, text || rightLabel, baseSize, boxW - margin * 2);
      ctx.font = `600 ${size}px ${FONT_STACKS[wm.font] || FONT_STACKS.sans}`;
      const rightWidth = rightLabel ? ctx.measureText(rightLabel).width : 0;
      if (text) {
        const maxTextWidth = boxW - margin * 2 - (rightLabel ? rightWidth + margin : 0);
        size = fitFontSize(ctx, text, baseSize, maxTextWidth);
        drawText(ctx, text, margin, bandY + bandH / 2, size * 0.92, 'left', 'middle');
      }
      if (rightLabel) {
        drawText(ctx, rightLabel, boxW - margin, bandY + bandH / 2, size * 0.92, 'right', 'middle', 0.9);
      }
      ctx.restore();
    } else {
      const maxWidth = boxW - margin * 2;
      const size = fitFontSize(ctx, text, baseSize, maxWidth);
      const pos = wm.position;
      let x = margin;
      let y = margin;
      let align = 'left';
      let baseline = 'top';
      if (pos === 'br') { x = boxW - margin; y = boxH - margin; align = 'right'; baseline = 'bottom'; }
      else if (pos === 'bl') { x = margin; y = boxH - margin; baseline = 'bottom'; }
      else if (pos === 'tr') { x = boxW - margin; y = margin; align = 'right'; }
      else if (pos === 'center') { x = boxW / 2; y = boxH / 2; align = 'center'; baseline = 'middle'; }
      drawText(ctx, text, x, y, size, align, baseline);
    }
    ctx.restore();
  }

  function drawContain(ctx, img, x, y, w, h) {
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function drawCover(ctx, img, x, y, w, h) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const sourceAspect = iw / ih;
    const targetAspect = w / h;
    let sx, sy, sw, sh;
    if (sourceAspect > targetAspect) {
      sh = ih;
      sw = ih * targetAspect;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      sw = iw;
      sh = iw / targetAspect;
      sx = 0;
      sy = (ih - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function drawTiledImage(ctx, img, x, y, w, h, opacity) {
    const tileW = Math.max(1, w * 0.28);
    const tileH = tileW * (img.naturalHeight / Math.max(1, img.naturalWidth));
    ctx.save();
    ctx.globalAlpha = opacity;
    for (let ty = y; ty < y + h; ty += tileH) {
      for (let tx = x; tx < x + w; tx += tileW) {
        ctx.drawImage(img, tx, ty, tileW, tileH);
      }
    }
    ctx.restore();
  }

  function drawFullscreenLayers(ctx, x, y, w, h, placement) {
    state.assets.fullscreen.forEach((layer) => {
      if (state.mode === 'collage' && placement && layer.placement !== placement) return;
      if (!layer.record?.image) return;
      const img = layer.record.image;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.globalAlpha = clamp(layer.opacity, 0, 100) / 100;
      ctx.globalCompositeOperation = BLEND_MODES[layer.blend] || 'source-over';
      if (layer.fit === 'contain') {
        drawContain(ctx, img, x, y, w, h);
      } else if (layer.fit === 'tile') {
        drawTiledImage(ctx, img, x, y, w, h, 1);
      } else {
        drawCover(ctx, img, x, y, w, h);
      }
      ctx.restore();
    });
  }

  function deriveForegroundAlpha(image, width, height) {
    const pixels = image.data;
    const total = width * height;
    let fullyTransparentPixels = 0;
    for (let i = 0; i < total; i++) {
      if (pixels[i * 4 + 3] < 12) fullyTransparentPixels++;
    }
    const alpha = new Uint8Array(total);
    if (fullyTransparentPixels > total * 0.03) {
      for (let i = 0; i < total; i++) alpha[i] = pixels[i * 4 + 3];
      return alpha;
    }

    const histogram = new Uint32Array(64);
    let modeBin = 0;
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const luminance = Math.round(0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]);
      const bin = clamp(Math.floor(luminance / 4), 0, 63);
      histogram[bin]++;
      if (histogram[bin] > histogram[modeBin]) modeBin = bin;
    }
    const backgroundLuminance = modeBin * 4 + 2;
    const contrastRange = Math.max(28, backgroundLuminance > 127 ? backgroundLuminance : 255 - backgroundLuminance);
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const luminance = 0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2];
      alpha[i] = Math.round(clamp((Math.abs(luminance - backgroundLuminance) - 4) / (contrastRange * 0.8), 0, 1) * 255);
    }
    return alpha;
  }

  const recolorCache = new WeakMap();
  function recoloredImage(img, color) {
    const cached = recolorCache.get(img);
    if (cached?.has(color)) return cached.get(color);
    const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const alpha = deriveForegroundAlpha(source, canvas.width, canvas.height);
    const rgb = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : 'ffffff';
    const red = parseInt(rgb.slice(0, 2), 16);
    const green = parseInt(rgb.slice(2, 4), 16);
    const blue = parseInt(rgb.slice(4, 6), 16);
    const output = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < alpha.length; i++) {
      const p = i * 4;
      output.data[p] = red;
      output.data[p + 1] = green;
      output.data[p + 2] = blue;
      output.data[p + 3] = alpha[i];
    }
    ctx.putImageData(output, 0, 0);
    const entries = cached || new Map();
    entries.set(color, canvas);
    if (!cached) recolorCache.set(img, entries);
    return canvas;
  }

  function drawCompositeAsset(ctx, img, boxW, boxH, settings, kind) {
    if (!img) return;
    const renderImg = (kind === 'frame' || kind === 'small') && settings.tintEnabled
      ? recoloredImage(img, settings.tintColor)
      : img;
    const sourceW = img.naturalWidth;
    const sourceH = img.naturalHeight;
    let dw;
    let dh;
    if (kind === 'frame') {
      const fit = Math.min(boxW / sourceW, boxH / sourceH) * (settings.scale / 100);
      dw = sourceW * fit;
      dh = sourceH * fit;
    } else {
      const fit = (Math.min(boxW, boxH) * (settings.scale / 100)) / Math.max(sourceW, sourceH);
      dw = sourceW * fit;
      dh = sourceH * fit;
    }

    const anchor = kind === 'frame' ? 'mc' : settings.anchor;
    const offsetX = boxW * (settings.x / 100);
    const offsetY = boxH * (settings.y / 100);
    let cx = boxW / 2 + offsetX;
    let cy = boxH / 2 + offsetY;
    if (anchor.includes('l')) cx = offsetX + dw / 2;
    if (anchor.includes('r')) cx = boxW - offsetX - dw / 2;
    if (anchor.startsWith('t')) cy = offsetY + dh / 2;
    if (anchor.startsWith('b')) cy = boxH - offsetY - dh / 2;

    const effectScale = clamp(Math.min(boxW, boxH) / 1200, 0.35, 5);
    ctx.save();
    ctx.translate(cx, cy);
    if (kind === 'small') ctx.rotate((settings.rotate || 0) * Math.PI / 180);

    ctx.save();
    ctx.globalAlpha = clamp(settings.opacity, 0, 100) / 100;
    ctx.globalCompositeOperation = BLEND_MODES[settings.blend] || 'source-over';
    if (settings.shadowEnabled) {
      ctx.shadowColor = hexToRgba(settings.shadowColor, settings.shadowOpacity / 100);
      ctx.shadowBlur = settings.shadowBlur * effectScale;
      ctx.shadowOffsetX = settings.shadowX * effectScale;
      ctx.shadowOffsetY = settings.shadowY * effectScale;
    }
    ctx.drawImage(renderImg, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    ctx.restore();
  }

  function drawImportedMarks(ctx, boxW, boxH) {
    state.assets.frame.forEach((layer) => {
      drawCompositeAsset(ctx, layer.record.image, boxW, boxH, layer.settings, 'frame');
    });
    state.assets.small.forEach((layer) => {
      drawCompositeAsset(ctx, layer.record.image, boxW, boxH, layer.settings, 'small');
    });
  }

  function watermarkLongEdge(img) {
    const scale = Math.min(1, PREVIEW_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    return {
      width: Math.max(1, Math.round(img.naturalWidth * scale)),
      height: Math.max(1, Math.round(img.naturalHeight * scale))
    };
  }

  async function renderWatermarkToCanvas(canvas, record, index, maxEdge) {
    if (state.watermark.preset === 'kaki-psd') await preloadKakiTemplate();
    const img = await loadImage(record.file);
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    drawContain(ctx, img, 0, 0, width, height);
    drawFullscreenPreset(ctx, width, height, index);
    drawFullscreenLayers(ctx, 0, 0, width, height);
    drawImportedMarks(ctx, width, height);
    drawWatermark(ctx, width, height, index);
    return { width, height };
  }

  function parseSoldNumbers(raw) {
    const sold = new Set();
    const normalized = String(raw || '').replace(/，|、|。|;/g, ',').replace(/[—–~～]/g, '-');
    normalized.split(',').forEach((part) => {
      const token = part.trim();
      if (!token) return;
      const range = token.split('-').map((v) => Number(v.trim()));
      if (range.length === 2 && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
        const a = Math.round(Math.min(range[0], range[1]));
        const b = Math.round(Math.max(range[0], range[1]));
        if (b - a <= 50000) for (let n = a; n <= b; n++) sold.add(n);
      } else {
        const n = Number(token);
        if (Number.isFinite(n)) sold.add(Math.round(n));
      }
    });
    return sold;
  }

  function isSold(itemNumber) {
    const raw = state.collage.soldNumbers.trim();
    if (!state.collage.soldEnabled || !raw) return false;
    const sold = parseSoldNumbers(raw);
    return state.collage.remainingMode ? !sold.has(itemNumber) : sold.has(itemNumber);
  }

  function soldOverlay(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(23,22,19,.73)';
    ctx.fillRect(x, y, w, h);
    const size = Math.min(w, h) * 0.23;
    ctx.font = `600 ${size}px ${FONT_STACKS.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.12;
    ctx.strokeStyle = 'rgba(0,0,0,.78)';
    ctx.fillStyle = 'rgba(250,248,240,.92)';
    ctx.strokeText('SOLD', x + w / 2, y + h / 2 - size * 0.62);
    ctx.fillText('SOLD', x + w / 2, y + h / 2 - size * 0.62);
    ctx.strokeText('OUT', x + w / 2, y + h / 2 + size * 0.62);
    ctx.fillText('OUT', x + w / 2, y + h / 2 + size * 0.62);
    ctx.restore();
  }

  function drawItemNumber(ctx, number, x, y, w, h) {
    const scale = Math.max(0.01, ctx.getTransform().a);
    const size = state.collage.numberSize / scale;
    const padding = 10 / scale;
    const pos = state.collage.numberPosition;
    const isRight = pos === 'tr' || pos === 'br';
    const isLeft = pos === 'tl' || pos === 'bl';
    const isTop = pos === 'tl' || pos === 'tr';
    const isBottom = pos === 'bl' || pos === 'br' || pos === 'bc';
    const align = isRight ? 'right' : isLeft ? 'left' : 'center';
    const baseline = isTop ? 'top' : isBottom ? 'bottom' : 'middle';
    const tx = isRight ? x + w - padding : isLeft ? x + padding : x + w / 2;
    const ty = isTop ? y + padding : isBottom ? y + h - padding : y + h / 2;
    const text = String(number);
    ctx.save();
    ctx.font = `600 ${size}px ${FONT_STACKS[state.collage.numberFont] || FONT_STACKS.sans}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.lineJoin = 'round';
    ctx.globalAlpha = state.collage.numberOpacity / 100;
    if (state.collage.numberShadowEnabled) {
      ctx.shadowColor = hexToRgba(state.collage.numberShadowColor, state.collage.numberShadowOpacity / 100);
      ctx.shadowBlur = state.collage.numberShadowBlur / scale;
      ctx.shadowOffsetX = state.collage.numberShadowX / scale;
      ctx.shadowOffsetY = state.collage.numberShadowY / scale;
    }
    if (state.collage.numberOutlineEnabled) {
      ctx.lineWidth = Math.max(1 / scale, state.collage.numberOutlineWidth / scale);
      ctx.strokeStyle = hexToRgba(state.collage.numberOutlineColor, state.collage.numberOutlineOpacity / 100);
      ctx.strokeText(text, tx, ty);
    }
    ctx.fillStyle = state.collage.numberColor;
    ctx.fillText(text, tx, ty);
    ctx.restore();
  }

  function collageBaseMetrics(cols, rows, ratio, maxEdge) {
    const cellW = 800;
    const cellH = cellW / Math.max(0.1, ratio);
    let scale = Math.min(1, maxEdge / Math.max(cols * cellW, rows * cellH));
    let gap = state.collage.gap / Math.max(0.01, scale);
    let width = cols * cellW + (cols + 1) * gap;
    let height = rows * cellH + (rows + 1) * gap;
    const correctedScale = Math.min(1, maxEdge / Math.max(width, height));
    if (correctedScale < scale) {
      scale = correctedScale;
      gap = state.collage.gap / Math.max(0.01, scale);
      width = cols * cellW + (cols + 1) * gap;
      height = rows * cellH + (rows + 1) * gap;
    }
    return {
      cols, rows, cellW, cellH, gap, scale, width, height
    };
  }

  async function renderCollagePage(canvas, pageIndex, maxEdge) {
    if (state.watermark.preset === 'kaki-psd') await preloadKakiTemplate();
    const page = collagePages()[pageIndex];
    if (!page) return { width: 1, height: 1 };
    const visible = page.records;
    const cols = page.layoutCols;
    const rows = page.layoutRows;
    const base = collageBaseMetrics(cols, rows, page.ratio, maxEdge);
    const width = Math.max(1, Math.round(base.width * base.scale));
    const height = Math.max(1, Math.round(base.height * base.scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(base.scale, base.scale);
    ctx.fillStyle = state.collage.background;
    ctx.fillRect(0, 0, base.width, base.height);
    for (let slot = 0; slot < visible.length; slot++) {
      const col = slot % base.cols;
      const row = Math.floor(slot / base.cols);
      const x = base.gap + col * (base.cellW + base.gap);
      const y = base.gap + row * (base.cellH + base.gap);
      const item = visible[slot];
      const record = item.record;
      const img = await loadImage(record.file);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, base.cellW, base.cellH);
      ctx.clip();
      drawCover(ctx, img, x, y, base.cellW, base.cellH);
      if (state.fullscreenPreset.placement === 'cell') {
        ctx.save();
        ctx.translate(x, y);
        drawFullscreenPreset(ctx, base.cellW, base.cellH, item.fileIndex);
        ctx.restore();
      }
      drawFullscreenLayers(ctx, x, y, base.cellW, base.cellH, 'before');
      state.assets.frame.forEach((layer) => {
        if (layer.settings.placement !== 'cell') return;
        ctx.save();
        ctx.translate(x, y);
        drawCompositeAsset(ctx, layer.record.image, base.cellW, base.cellH, layer.settings, 'frame');
        ctx.restore();
      });
      state.assets.small.forEach((layer) => {
        if (layer.settings.placement !== 'cell') return;
        ctx.save();
        ctx.translate(x, y);
        drawCompositeAsset(ctx, layer.record.image, base.cellW, base.cellH, layer.settings, 'small');
        ctx.restore();
      });
      if (state.watermark.preset !== 'none') {
        drawWatermark(ctx, base.cellW, base.cellH, item.fileIndex, {
          preset: state.watermark.preset,
          dims: { x, y, w: base.cellW, h: base.cellH },
          clip: true,
          radius: 0
        });
      }
      const number = state.collage.numberStart + item.fileIndex;
      const sold = isSold(number);
      if (sold) soldOverlay(ctx, x, y, base.cellW, base.cellH);
      if (state.collage.numberEnabled && (!sold || state.collage.numberShowOnSold)) {
        drawItemNumber(ctx, number, x, y, base.cellW, base.cellH);
      }
      ctx.restore();
    }
    if (state.fullscreenPreset.placement === 'sheet') {
      drawFullscreenPreset(ctx, base.width, base.height, visible[0]?.fileIndex || 0);
    }
    drawFullscreenLayers(ctx, 0, 0, base.width, base.height, 'after');
    state.assets.frame.forEach((layer) => {
      if (layer.settings.placement === 'sheet') {
        drawCompositeAsset(ctx, layer.record.image, base.width, base.height, layer.settings, 'frame');
      }
    });
    state.assets.small.forEach((layer) => {
      if (layer.settings.placement === 'sheet') {
        drawCompositeAsset(ctx, layer.record.image, base.width, base.height, layer.settings, 'small');
      }
    });
    ctx.restore();
    return { width, height };
  }

  async function renderPreview() {
    if (!state.files.length) {
      el.emptyState.hidden = false;
      el.previewCanvas.hidden = true;
      el.previewMeta.textContent = '等待图片';
      syncStageTitle();
      return;
    }
    const token = ++state.previewToken;
    const page = clamp(state.activePage, 0, Math.max(0, pageCount() - 1));
    if (state.mode === 'watermark') {
      const record = state.files[page];
      if (!record) return;
      const dims = await renderWatermarkToCanvas(el.previewCanvas, record, page, PREVIEW_EDGE);
      if (token !== state.previewToken) return;
      el.previewMeta.textContent = `${dims.width} × ${dims.height}`;
    } else {
      const dims = await renderCollagePage(el.previewCanvas, page, PREVIEW_EDGE);
      if (token !== state.previewToken) return;
      el.previewMeta.textContent = `第 ${page + 1} / ${pageCount()} 页 · ${dims.width} × ${dims.height}`;
    }
    el.emptyState.hidden = true;
    el.previewCanvas.hidden = false;
    fitPreviewDisplay();
    syncStageTitle();
    updatePager();
  }

  function fitPreviewDisplay() {
    if (el.previewCanvas.hidden || !el.previewCanvas.width) return;
    const surface = el.previewSurface;
    const style = getComputedStyle(surface);
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const availW = Math.max(80, surface.clientWidth - padX);
    const availHClass = surface.clientHeight - padY;
    const availH = Math.max(window.innerWidth <= 760 ? 220 : 260, availHClass);
    const aspect = el.previewCanvas.width / el.previewCanvas.height;
    let w = availW;
    let h = w / aspect;
    if (h > availH) {
      h = availH;
      w = h * aspect;
    }
    el.previewCanvas.style.width = `${Math.floor(w)}px`;
    el.previewCanvas.style.height = `${Math.floor(h)}px`;
  }

  function safePrefix() {
    const cleaned = String(state.export.prefix || 'kaki').trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
    return cleaned || 'kaki';
  }

  function outputFilename(pageIndex) {
    const prefix = safePrefix();
    const extension = state.export.format === 'png' ? 'png' : 'jpg';
    return state.mode === 'watermark'
      ? `${prefix}-${pad(pageIndex + 1, 3)}.${extension}`
      : `${prefix}-sheet-${pad(pageIndex + 1, 2)}.${extension}`;
  }

  async function createOutputCanvasForPage(pageIndex) {
    const canvas = document.createElement('canvas');
    const maxEdge = numberOr(state.export.edge, 2400);
    if (state.mode === 'watermark') {
      await renderWatermarkToCanvas(canvas, state.files[pageIndex], pageIndex, maxEdge);
    } else {
      await renderCollagePage(canvas, pageIndex, maxEdge);
    }
    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      const isPng = state.export.format === 'png';
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('浏览器无法导出该图片'));
      }, isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : state.export.quality / 100);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function setBusy(busy) {
    state.busy = busy;
    updateActionAvailability();
    el.dropZone.setAttribute('aria-busy', String(busy));
  }

  function showProgress(visible, text = '', percent = 0) {
    el.progressWrap.hidden = !visible;
    el.progressText.textContent = text;
    el.progressPercent.textContent = `${percent}%`;
    el.progressBar.style.width = `${percent}%`;
  }

  function clearResultGallery() {
    state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    state.previewUrls = [];
    el.resultGrid.innerHTML = '';
    el.resultGallery.hidden = true;
  }

  async function loadAllPreviews() {
    if (state.busy || !state.files.length) return;
    setBusy(true);
    clearResultGallery();
    showProgress(true, '正在生成全部成品…', 0);
    const total = pageCount();
    const columns = [document.createElement('div'), document.createElement('div')];
    columns.forEach((column) => {
      column.className = 'result-column';
      el.resultGrid.appendChild(column);
    });
    const columnHeights = [0, 0];
    try {
      for (let page = 0; page < total; page++) {
        const canvas = await createOutputCanvasForPage(page);
        const blob = await canvasToBlob(canvas);
        const url = URL.createObjectURL(blob);
        state.previewUrls.push(url);
        const filename = outputFilename(page);

        const figure = document.createElement('figure');
        figure.className = 'result-item';
        const image = document.createElement('img');
        image.src = url;
        image.alt = filename;
        image.loading = 'lazy';
        const caption = document.createElement('figcaption');
        const label = document.createElement('span');
        label.textContent = filename;
        const download = document.createElement('a');
        download.href = url;
        download.download = filename;
        download.textContent = '下载';
        caption.append(label, download);
        figure.append(image, caption);
        const targetColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1;
        columns[targetColumn].appendChild(figure);
        columnHeights[targetColumn] += canvas.height / Math.max(1, canvas.width);

        showProgress(true, `正在生成第 ${page + 1} / ${total} 张`, Math.round(((page + 1) / total) * 100));
      }
      el.resultGallery.hidden = false;
      el.resultGallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showProgress(true, '全部成品已生成', 100);
      toast(`已生成 ${total} 张成品，可长按图片保存`);
    } catch (error) {
      console.error(error);
      clearResultGallery();
      showProgress(false);
      toast(error.message || '成品预览生成失败', 'error');
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        if (!state.busy) showProgress(false);
      }, 2500);
    }
  }

  async function downloadCurrent() {
    if (state.busy || !state.files.length) return;
    setBusy(true);
    try {
      const page = clamp(state.activePage, 0, pageCount() - 1);
      const canvas = await createOutputCanvasForPage(page);
      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, outputFilename(page));
      toast('当前图片已下载');
    } catch (error) {
      console.error(error);
      toast(error.message || '下载失败', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function exportAllZip() {
    if (state.busy || !state.files.length) return;
    if (typeof window.JSZip !== 'function') {
      toast('ZIP 组件未加载，请刷新页面后重试', 'error');
      return;
    }
    setBusy(true);
    const total = pageCount();
    const zip = new JSZip();
    showProgress(true, '正在生成图片…', 0);
    try {
      for (let page = 0; page < total; page++) {
        const canvas = await createOutputCanvasForPage(page);
        const blob = await canvasToBlob(canvas);
        zip.file(outputFilename(page), blob);
        const percent = Math.round(((page + 1) / total) * 75);
        showProgress(true, `正在生成第 ${page + 1} / ${total} 张`, percent);
      }
      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'STORE', streamFiles: false },
        (meta) => {
          const percent = 75 + Math.round(meta.percent * 0.25);
          showProgress(true, '正在打包 ZIP…', percent);
        }
      );
      const zipName = `${safePrefix()}-${state.mode === 'watermark' ? 'marked' : 'collages'}-${state.export.format}.zip`;
      downloadBlob(zipBlob, zipName);
      showProgress(true, '打包完成', 100);
      toast(`已导出 ${total} 张图片`);
    } catch (error) {
      console.error(error);
      toast(error.message || '批量导出失败', 'error');
      showProgress(false);
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        if (!state.busy) showProgress(false);
      }, 3500);
    }
  }

  function readWatermarkControl(control) {
    const key = control.dataset.watermark;
    if (!key) return;
    if (state.watermark.preset === 'kaki-psd' && key !== 'text') return;
    if (control.type === 'checkbox') state.watermark[key] = control.checked;
    else if (control.type === 'range' || control.type === 'number') state.watermark[key] = numberOr(control.value, WATERMARK_DEFAULTS[key]);
    else {
      const value = key === 'bandPrice' ? control.value.replace(/[^\d.]/g, '') : control.value;
      if (key === 'bandPrice') control.value = value;
      state.watermark[key] = value;
    }
  }

  function readCollageControl(control) {
    const key = control.dataset.collage;
    if (!key) return;
    if (control.type === 'checkbox') state.collage[key] = control.checked;
    else if (control.type === 'number') state.collage[key] = numberOr(control.value, COLLAGE_DEFAULTS[key]);
    else state.collage[key] = control.value;
  }

  function readExportControl(control) {
    const key = control.dataset.export;
    if (!key) return;
    if (control.type === 'range' || control.type === 'number') state.export[key] = numberOr(control.value, EXPORT_DEFAULTS[key]);
    else state.export[key] = control.value;
  }

  function readMarkControl(control) {
    const path = control.dataset.mark;
    if (!path) return;
    let value;
    if (control.type === 'checkbox') value = control.checked;
    else if (control.type === 'range' || control.type === 'number') {
      const fallback = getPath(state.marks, path);
      value = numberOr(control.value, fallback);
    } else {
      value = control.value;
    }
    setPath(state.marks, path, value);
  }

  function readFullscreenPresetControl(control) {
    const key = control.dataset.fullscreenPreset;
    if (!key) return;
    if (control.type === 'range' || control.type === 'number') {
      state.fullscreenPreset[key] = numberOr(control.value, FULLSCREEN_PRESET_DEFAULTS[key]);
    } else {
      state.fullscreenPreset[key] = control.value;
    }
  }

  function showWelcome() {
    el.welcomeOverlay.hidden = false;
    el.welcomeOverlay.classList.remove('is-closing');
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => el.welcomeStartBtn.focus(), 60);
  }

  function hideWelcome(markSeen = true) {
    if (el.welcomeOverlay.hidden) return;
    if (markSeen) {
      try {
        localStorage.setItem(ONBOARDING_KEY, 'seen');
      } catch (_) { /* private mode can disable persistent storage */ }
    }
    el.welcomeOverlay.classList.add('is-closing');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      el.welcomeOverlay.hidden = true;
      el.welcomeOverlay.classList.remove('is-closing');
    }, 260);
  }

  function bindControls() {
    el.themeToggleBtn.addEventListener('click', toggleThemeMenu);
    el.themeOptions.forEach((option) => {
      option.addEventListener('click', () => chooseTheme(option.dataset.themeOption));
    });
    document.addEventListener('click', (event) => {
      if (el.themeMenu && !el.themeMenu.hidden && !el.themePicker.contains(event.target)) closeThemeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (!el.themeMenu || el.themeMenu.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeThemeMenu({ restoreFocus: true });
        return;
      }
      if (event.key === 'Tab') {
        closeThemeMenu();
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = Math.max(0, el.themeOptions.indexOf(document.activeElement));
      let nextIndex = currentIndex;
      if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = el.themeOptions.length - 1;
      else if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % el.themeOptions.length;
      else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + el.themeOptions.length) % el.themeOptions.length;
      el.themeOptions[nextIndex]?.focus();
    });
    el.resetSettingsBtn.addEventListener('click', resetSettings);
    el.clearImagesBtn.addEventListener('click', clearFiles);
    el.prevBtn.addEventListener('click', () => goPage(-1));
    el.nextBtn.addEventListener('click', () => goPage(1));
    el.downloadCurrentBtn.addEventListener('click', downloadCurrent);
    el.exportAllBtn.addEventListener('click', exportAllZip);
    el.previewAllBtn.addEventListener('click', loadAllPreviews);
    el.showWelcomeBtn.addEventListener('click', showWelcome);
    el.welcomeStartBtn.addEventListener('click', () => hideWelcome(true));
    el.welcomeOverlay.addEventListener('click', (event) => {
      if (event.target === el.welcomeOverlay) hideWelcome(true);
    });
    el.imagePreviewCloseBtn.addEventListener('click', closeImagePreview);
    el.imagePreviewOverlay.addEventListener('click', (event) => {
      if (event.target === el.imagePreviewOverlay) closeImagePreview();
    });
    el.frameChooseBtn.addEventListener('click', () => el.frameInput.click());
    el.smallChooseBtn.addEventListener('click', () => el.smallInput.click());
    el.addFullscreenBtn.addEventListener('click', () => el.fullscreenInput.click());
    el.fullscreenSaveBtn.addEventListener('click', () => saveWatermarkModule('fullscreen'));
    el.frameSaveBtn.addEventListener('click', () => saveWatermarkModule('frame'));
    el.smallSaveBtn.addEventListener('click', () => saveWatermarkModule('small'));

    el.fullscreenInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      await addFullscreenAssets(files);
    });
    el.frameInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      await addCompositeAssets('frame', files);
    });
    el.smallInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      await addCompositeAssets('small', files);
    });

    el.modeTabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
    el.signaturePresetCards.forEach((card) => {
      card.addEventListener('click', () => applySignaturePreset(card.dataset.signaturePresetOption));
    });
    el.fullscreenPresetCards.forEach((card) => {
      card.addEventListener('click', () => applyFullscreenPreset(card.dataset.fullscreenPresetOption));
    });

    el.fullscreenPresetControls.forEach((control) => {
      const eventName = control.tagName === 'SELECT' || control.type === 'color' ? 'change' : 'input';
      control.addEventListener(eventName, () => {
        readFullscreenPresetControl(control);
        if (control.type === 'range') {
          const outputs = {
            opacity: el.fullscreenPresetOpacityValue,
            size: el.fullscreenPresetSizeValue,
            rotate: el.fullscreenPresetRotateValue,
            gap: el.fullscreenPresetGapValue,
            stroke: el.fullscreenPresetStrokeValue
          };
          syncRange(control, outputs[control.dataset.fullscreenPreset], control.dataset.fullscreenPreset === 'rotate' ? '°' : (control.dataset.fullscreenPreset === 'gap' ? '' : '%'));
        }
        persistSettings();
        if (control.dataset.fullscreenPreset === 'font') schedulePreviewForFont(control.value);
        else schedulePreview();
      });
    });

    el.watermarkControls.forEach((control) => {
      const eventName = control.tagName === 'SELECT' || control.type === 'color' ? 'change' : 'input';
      control.addEventListener(eventName, () => {
        readWatermarkControl(control);
        updateBandUi();
        if (control.type === 'range') {
          const map = {
            size: el.watermarkSizeValue,
            opacity: el.watermarkOpacityValue,
            margin: el.watermarkMarginValue,
            stroke: el.watermarkStrokeValue,
            gradientStrength: el.gradientStrengthValue,
            gradientHeight: el.gradientHeightValue,
            bandOpacity: el.bandOpacityValue
          };
          syncRange(control, map[control.dataset.watermark], control.dataset.watermark === 'rotate' ? '°' : (control.dataset.watermark === 'gap' ? '' : '%'));
        }
        persistSettings();
        if (control.dataset.watermark === 'font') schedulePreviewForFont(control.value);
        else schedulePreview();
      });
    });

    el.markControls.forEach((control) => {
      const eventName = control.type === 'range' ? 'input' : 'change';
      control.addEventListener(eventName, () => {
        readMarkControl(control);
        if (control.type === 'range') {
          const output = document.querySelector(`[data-value-for="${control.dataset.mark}"]`);
          syncRange(control, output, output?.dataset.suffix || (control.dataset.mark.endsWith('.rotate') ? '°' : '%'));
        }
        updateEffectVisibility();
        persistSettings();
        schedulePreview();
      });
    });

    el.collageControls.forEach((control) => {
      const eventName = control.tagName === 'SELECT' || control.type === 'color' || control.type === 'checkbox' ? 'change' : 'input';
      control.addEventListener(eventName, () => {
        readCollageControl(control);
        sanitizeState();
        updateCollageUi();
        if (control.type === 'range') syncAllRanges();
        state.activePage = clamp(state.activePage, 0, Math.max(0, pageCount() - 1));
        syncStageTitle();
        renderQueue();
        updatePager();
        persistSettings();
        if (control.dataset.collage === 'numberFont') schedulePreviewForFont(control.value);
        else schedulePreview();
      });
    });

    el.exportControls.forEach((control) => {
      const eventName = control.type === 'range' ? 'input' : 'change';
      control.addEventListener(eventName, () => {
        readExportControl(control);
        if (control.type === 'range') syncRange(control, el.exportQualityValue);
        updateExportUi();
        clearResultGallery();
        persistSettings();
      });
    });
    el.exportEdgeLockBtn.addEventListener('click', () => {
      state.export.edgeLocked = !state.export.edgeLocked;
      updateExportUi();
      clearResultGallery();
      persistSettings();
    });

    const openPicker = () => {
      if (!state.busy) el.fileInput.click();
    };
    el.dropZone.addEventListener('click', openPicker);
    el.dropZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPicker();
      }
    });
    el.emptySelectBtn.addEventListener('click', openPicker);
    el.fileInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      await addFiles(files);
    });

    ['dragenter','dragover'].forEach((name) => {
      el.dropZone.addEventListener(name, (event) => {
        event.preventDefault();
        el.dropZone.classList.add('is-dragging');
      });
    });
    ['dragleave','drop'].forEach((name) => {
      el.dropZone.addEventListener(name, (event) => {
        event.preventDefault();
        el.dropZone.classList.remove('is-dragging');
      });
    });
    el.dropZone.addEventListener('drop', (event) => {
      addFiles(event.dataTransfer.files);
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !el.welcomeOverlay.hidden) {
        hideWelcome(true);
        return;
      }
      if (event.key === 'Escape' && !el.imagePreviewOverlay.hidden) {
        closeImagePreview();
        return;
      }
      const target = event.target;
      if (target && /INPUT|SELECT|TEXTAREA/.test(target.tagName)) return;
      if (event.key === 'ArrowLeft') goPage(-1);
      if (event.key === 'ArrowRight') goPage(1);
    });

    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        fitPreviewDisplay();
      }, 120);
    });
    window.addEventListener('beforeunload', () => {
      state.files.forEach((f) => f.thumbUrl && URL.revokeObjectURL(f.thumbUrl));
      state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
      releaseAllAssets();
    });
  }

  async function init() {
    cacheEls();
    restoreTheme();
    restoreSettings();
    const restoredCount = await restoreImportedFiles();
    const restoredWatermarks = await restoreWatermarkAssets();
    applyUiFromState();
    bindControls();
    renderQueue();
    updateActionAvailability();
    syncStageTitle();
    schedulePreview();
    warmCustomFonts();
    preloadKakiTemplate();
    if (restoredCount > 0) toast(`已恢复上次导入的 ${restoredCount} 张作品`);
    if (restoredWatermarks > 0) toast(`已恢复保存的 ${restoredWatermarks} 张水印素材`);
    let onboardingSeen = false;
    try {
      onboardingSeen = localStorage.getItem(ONBOARDING_KEY) === 'seen';
    } catch (_) { /* ignore storage restrictions */ }
    if (!onboardingSeen) window.setTimeout(showWelcome, 120);
  }

  window.KAKIStudioImageBridge = Object.freeze({
    applyLinkedSoldNumbers(numbers) {
      const clean = [...new Set((numbers || []).map(Number).filter((number) =>
        Number.isInteger(number) && number >= 0
      ))].sort((a, b) => a - b);
      state.collage.soldEnabled = true;
      state.collage.soldNumbers = clean.join(', ');
      state.collage.remainingMode = false;
      if (el.soldEnabled) el.soldEnabled.checked = true;
      if (el.soldNumbers) el.soldNumbers.value = state.collage.soldNumbers;
      if (el.remainingMode) el.remainingMode.checked = false;
      updateCollageUi();
      persistSettings();
      renderQueue();
      schedulePreview();
      return clean.length;
    },
    restoreManualSoldState(enabled, text, remainingMode) {
      state.collage.soldEnabled = Boolean(enabled);
      state.collage.soldNumbers = String(text || '');
      state.collage.remainingMode = Boolean(remainingMode);
      if (el.soldEnabled) el.soldEnabled.checked = state.collage.soldEnabled;
      if (el.soldNumbers) el.soldNumbers.value = state.collage.soldNumbers;
      if (el.remainingMode) el.remainingMode.checked = state.collage.remainingMode;
      updateCollageUi();
      persistSettings();
      renderQueue();
      schedulePreview();
    },
    getImageNumberSummary() {
      return state.files.map((record, index) => ({
        index,
        number: state.collage.numberStart + index,
        name: record.name
      }));
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
