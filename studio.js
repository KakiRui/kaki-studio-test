(() => {
  'use strict';

  const STORAGE_SCOPE = location.pathname.includes('kaki-studio-test') ? 'test' : 'prod';
  const LINK_STORAGE_KEY = `kaki-studio-${STORAGE_SCOPE}-count-link-v1`;
  const imageButton = document.getElementById('imageWorkspaceBtn');
  const countButton = document.getElementById('countWorkspaceBtn');
  const imageApp = document.getElementById('imageApp');
  const countApp = document.getElementById('countApp');
  const countFrame = document.getElementById('countFrame');
  const openCountButton = document.getElementById('openCountWorkspaceBtn');
  const batchSelect = document.getElementById('linkedCountBatch');
  const linkToggle = document.getElementById('linkedCountEnabled');
  const linkStatus = document.getElementById('linkedCountStatus');

  let countBatches = [];
  let currentCountIndex = 0;
  let manualSoldSnapshot = null;

  function savedLinkSettings() {
    try {
      return JSON.parse(localStorage.getItem(LINK_STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function persistLinkSettings() {
    try {
      localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify({
        batchId: batchSelect.value,
        enabled: linkToggle.checked
      }));
    } catch (_) {}
  }

  function switchWorkspace(view) {
    const isImages = view === 'images';
    imageApp.hidden = !isImages;
    countApp.hidden = isImages;
    imageButton.classList.toggle('active', isImages);
    countButton.classList.toggle('active', !isImages);
    imageButton.setAttribute('aria-selected', String(isImages));
    countButton.setAttribute('aria-selected', String(!isImages));
    if(!isImages) {
      countFrame.contentWindow?.postMessage({ type: 'kaki-studio:request-count-state' }, location.origin);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function allNumbers(batch) {
    return [...new Set((batch?.customers || []).flatMap((customer) =>
      (customer.nums || []).flat()
    ).map(Number).filter((number) => Number.isInteger(number) && number >= 0))].sort((a, b) => a - b);
  }

  function selectedBatch() {
    return countBatches.find((batch) => batch.id === batchSelect.value) || null;
  }

  function updateLinkedStatus() {
    const batch = selectedBatch();
    if(!batch) {
      linkStatus.textContent = '未关联。现有手动遮挡功能保持不变。';
      return;
    }
    const occupied = allNumbers(batch);
    const images = window.KAKIStudioImageBridge?.getImageNumberSummary?.() || [];
    const outOfRange = images.filter((image) => image.number > Number(batch.total)).length;
    const modeText = linkToggle.checked ? '已启用自动遮挡' : '已选择档位，尚未启用联动';
    linkStatus.textContent = `${modeText} · 已占 ${occupied.length} 个号码 · 当前图片 ${images.length} 张${outOfRange ? ` · ${outOfRange} 张超出本档范围` : ''}`;
  }

  function applyLinkedBatch() {
    if(!linkToggle.checked) {
      updateLinkedStatus();
      return;
    }
    const batch = selectedBatch();
    if(!batch) {
      linkToggle.checked = false;
      updateLinkedStatus();
      return;
    }
    if(!manualSoldSnapshot) {
      manualSoldSnapshot = {
        enabled: document.getElementById('soldEnabled')?.checked || false,
        text: document.getElementById('soldNumbers')?.value || '',
        remainingMode: document.getElementById('remainingMode')?.checked || false
      };
    }
    window.KAKIStudioImageBridge?.applyLinkedSoldNumbers(allNumbers(batch));
    updateLinkedStatus();
    persistLinkSettings();
  }

  function restoreManualSold() {
    const snapshot = manualSoldSnapshot || { enabled: false, text: '', remainingMode: false };
    window.KAKIStudioImageBridge?.restoreManualSoldState(
      snapshot.enabled,
      snapshot.text,
      snapshot.remainingMode
    );
    manualSoldSnapshot = null;
    updateLinkedStatus();
    persistLinkSettings();
  }

  function renderCountBatches(batches, currentIdx) {
    countBatches = Array.isArray(batches) ? batches : [];
    currentCountIndex = Number.isInteger(currentIdx) ? currentIdx : 0;
    const saved = savedLinkSettings();
    const fallback = countBatches[currentCountIndex]?.id || countBatches[0]?.id || '';
    const selectedId = countBatches.some((batch) => batch.id === saved.batchId) ? saved.batchId : fallback;
    batchSelect.innerHTML = '<option value="">独立编辑遮挡，不读取号码中心</option>' + countBatches.map((batch) =>
      `<option value="${String(batch.id).replace(/"/g, '&quot;')}">${String(batch.id).replace(/[&<>]/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;'
      }[char]))} · ${batch.customers.length} 位顾客</option>`
    ).join('');
    batchSelect.value = selectedId;
    if(saved.enabled && selectedId) linkToggle.checked = true;
    if(linkToggle.checked && selectedId) applyLinkedBatch();
    else updateLinkedStatus();
  }

  imageButton.addEventListener('click', () => switchWorkspace('images'));
  countButton.addEventListener('click', () => switchWorkspace('counts'));
  openCountButton.addEventListener('click', () => switchWorkspace('counts'));

  batchSelect.addEventListener('change', () => {
    if(linkToggle.checked) {
      applyLinkedBatch();
    } else {
      updateLinkedStatus();
      persistLinkSettings();
    }
  });

  linkToggle.addEventListener('change', () => {
    if(linkToggle.checked) applyLinkedBatch();
    else restoreManualSold();
  });

  countFrame.addEventListener('load', () => {
    countFrame.contentWindow?.postMessage({ type: 'kaki-studio:request-count-state' }, location.origin);
    const theme = document.documentElement.dataset.theme || 'original';
    countFrame.contentWindow?.postMessage({ type: 'kaki-studio:theme-changed', theme }, location.origin);
  });

  window.addEventListener('message', (event) => {
    if(event.origin !== location.origin || !event.data) return;
    if(event.data.type === 'kaki-studio:count-state') {
      renderCountBatches(event.data.batches, event.data.currentIdx);
    } else if(event.data.type === 'kaki-studio:count-height') {
      const height = Math.max(760, Math.min(20000, Number(event.data.height) || 900));
      countFrame.style.height = `${height}px`;
    }
  });

  window.addEventListener('kaki-studio:images-changed', () => {
    updateLinkedStatus();
  });

  function syncFrameTheme() {
    countFrame.contentWindow?.postMessage({
      type: 'kaki-studio:theme-changed',
      theme: document.documentElement.dataset.theme || 'original'
    }, location.origin);
  }

  document.addEventListener('click', () => requestAnimationFrame(syncFrameTheme));

  const saved = savedLinkSettings();
  if(saved.enabled) linkToggle.checked = true;
})();
