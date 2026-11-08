    const STUDIO_STORAGE_SCOPE = location.pathname.includes('kaki-studio-test') ? 'test' : 'prod';
    const COUNT_DATA_KEY = `kaki-studio-${STUDIO_STORAGE_SCOPE}-counts-v1`;
    const COUNT_AI_KEY = `kaki-studio-${STUDIO_STORAGE_SCOPE}-count-ai-v1`;
    const STUDIO_THEME_KEY = `kaki-studio-${STUDIO_STORAGE_SCOPE}-theme-v1`;
    let batches = JSON.parse(localStorage.getItem(COUNT_DATA_KEY)) || [{ id: '默认档', customers: [], total: 50 }];
    let currentIdx = 0;
    let selectedNums = [];
    let aiImages = [];
    let aiResults = [];
    let aiConflicts = [];
    let aiModels = [];
    let aiRecords = [];
    let aiTrace = [];
    let editingCustomerIndex = null;
    let editingAiResultIndex = null;
    let viewingAiImageIndex = -1;
    let lastNameTapIndex = -1;
    let lastNameTapAt = 0;

    const defaultAiPrompt = `【代理归属提取 v7】
你是聊天记录截图的信息提取助手。括号里的名字是好友备注，必须忽略；只使用用户自己在群里显示的昵称。

你只处理【当前这一张截图】。不要按用户合并，不要做跨图累计；先读取每条消息右侧显示的时间，最后按网页要求输出。

严格按以下步骤处理：
1. 先从上到下扫描【整张截图里的所有用户消息行】，在内部建立行号：屏幕越靠上的消息，order 越小。每个用户发出的消息都算一行，即使这条消息没有编号；时间、日期栏、分隔线不算行。不要先按用户名归档或汇总。
2. 只提取用户明确发送或选择的 1 到 {total} 的整数编号。价格、表情、系统消息、撤回提示和其他无关文字全部忽略。
3. 只输出包含有效编号的消息，但 order 必须填写该消息在整张截图所有用户消息行中的绝对行号，不能只对含编号的消息重新从 1 编号。
4. 同一条消息里有多个编号时，每个编号单独输出一条记录，但它们的 order 必须相同。
5. 同一个用户重复发送同一个编号，也按出现顺序各输出一条，不要自行去重。
6. messageTime 必须逐条照抄该消息右侧的可见时间；能看到日期时输出 YYYY-MM-DD HH:MM:SS，看不到日期时输出 HH:MM:SS，完全看不清时输出空字符串。不要凭空补日期。
7. senderName 是截图里这条消息的发送人昵称；ownerName 是这个编号最终归给谁。普通直接发送时 ownerName=senderName。昵称只保留括号外文字，例如「Kaki（🍠全世界最爱我吧）」和「Kaki (跑图版)」都只保留「Kaki」。
8. 如果一条消息明确帮别人抢，例如「55,56,60,63帮Kaki抢」，senderName 是写消息的人，ownerName 是 Kaki，claimType=proxy，所有被这组文字覆盖的编号都归 Kaki。
9. 如果一条消息里有多个「名字 + 编号」组，例如「Kaki 1 33 46 55」换行「Kaki_ 73」，则 1、33、46、55 归 Kaki，73 归 Kaki_；发送人仍然是写这条消息的人，claimType=proxy。编号跟随它前面最近出现的名字，直到出现下一个名字。
10. 只能根据当前消息里明确的文字判断帮抢，不要根据前后其他消息猜测。无法确定归属时，ownerName 先等于 senderName，claimType=uncertain。
11. 如果发送人昵称完全空白，senderName 固定输出 "__BLANK__"；如果昵称有内容但特殊字符完全无法还原，senderName 固定输出 "__UNREADABLE__"。这两种情况必须输出 avatarHint，用 2 到 10 个字描述头像，例如「粉色小猪头像」「黑白猫耳头像」。仍要照常提取编号，不能跳过。
12. senderName 和 ownerName 必须逐字保留可读昵称，不要猜、不要翻译、不要缩写、不要补全；不要合并相似昵称，例如 Kaki 与 Kaki_ 必须当作不同用户。
13. 多个用户发送同一个编号时全部保留，不要删除或改写；程序会按 messageTime 递增、时间相同再按 order 判断谁更早。
14. 输出前逐条核对 order、messageTime、senderName、ownerName、claimType、number，并确保 entries 按 order 从小到大排列。
15. 只输出 JSON，不要 Markdown、解释或其他文字。格式：
{"entries":[{"order":3,"messageTime":"2026-10-16 11:05:02","senderName":"Kaki","ownerName":"Kaki_","claimType":"proxy","avatarHint":"","rawText":"Kaki 1 33 46 55 73","number":73}]}`;
    let aiCfg = JSON.parse(localStorage.getItem(COUNT_AI_KEY) || '{}');
    if(!aiCfg.presets) aiCfg.presets = [];
    const legacyAiPromptMarkers = ['【顺序提取 v3】', '【顺序提取 v4】', '【顺序提取 v5】', '【顺序提取 v6】', '买断图片编号', '请仔细识别聊天记录截图中顾客选择的买断图片编号', '请仔细识别聊天记录截图中每个用户发送的数字编号', '累计统计助手', '单图信息提取助手', '【已识别统计】'];
    if(!aiCfg.prompt || legacyAiPromptMarkers.some(marker => aiCfg.prompt.includes(marker))) aiCfg.prompt = defaultAiPrompt;

    function save() {
        localStorage.setItem(COUNT_DATA_KEY, JSON.stringify(batches));
        publishCountState();
    }

    function publishCountState() {
        const safeBatches = batches.map(batch => ({
            id: batch.id,
            total: batch.total,
            customers: batch.customers.map(customer => ({
                name: customer.name,
                nums: customer.nums.map(group => Array.isArray(group) ? group.slice() : [])
            }))
        }));
        window.dispatchEvent(new CustomEvent('kaki-studio:count-state', {
            detail: { batches: safeBatches, currentIdx }
        }));
    }

    function selectBatch(index) {
        if(!Number.isInteger(index) || !batches[index]) return;
        currentIdx = index;
        selectedNums = [];
        editingCustomerIndex = null;
        document.getElementById('searchBar').value = '';
        renderAll();
    }

    window.KAKIStudioCountBridge = Object.freeze({
        getSnapshot() {
            return {
                batches: batches.map(batch => ({
                    id: batch.id,
                    total: batch.total,
                    customers: batch.customers.map(customer => ({
                        name: customer.name,
                        nums: customer.nums.map(group => Array.isArray(group) ? group.slice() : [])
                    }))
                })),
                currentIdx
            };
        },
        selectBatch(index) {
            selectBatch(index);
        }
    });

    function openThemeModal() {
        document.getElementById('themeModalBg').classList.add('show');
        updateThemeOptions();
    }
    function closeThemeModal(event) {
        if(event && event.type === 'click' && event.target?.id !== 'themeModalBg' && !event.target?.classList?.contains('theme-close')) return;
        document.getElementById('themeModalBg').classList.remove('show');
    }
    function updateThemeOptions() {
        const current = document.documentElement.dataset.theme;
        document.getElementById('theme-cream').classList.toggle('active', current === 'cream');
        document.getElementById('theme-dark').classList.toggle('active', current === 'dark');
        document.getElementById('theme-pinkblue').classList.toggle('active', current === 'pinkblue');
        document.getElementById('theme-caramel').classList.toggle('active', current === 'caramel');
        document.getElementById('theme-brownie').classList.toggle('active', current === 'brownie');
        const themeIcons = { dark: '🖤', pinkblue: '🩵', caramel: '💛', brownie: '🤎' };
        document.getElementById('themeToggleBtn').textContent = themeIcons[current] || '🤍';
    }
    function changeTheme(theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('kaki_theme', theme);
        updateThemeOptions();
        closeThemeModal();
    }
    function syncStudioTheme() {
        let theme = 'original';
        try {
            if(window.parent && window.parent !== window) {
                theme = window.parent.document.documentElement.dataset.theme || theme;
            } else {
                theme = localStorage.getItem(STUDIO_THEME_KEY) || theme;
            }
        } catch(error) {}
        document.documentElement.dataset.theme = theme;
    }
    syncStudioTheme();

    function saveAiCfg() {
        aiCfg.endpoint = document.getElementById('aiEndpoint').value.trim();
        aiCfg.key = document.getElementById('aiKey').value.trim();
        aiCfg.model = document.getElementById('aiModel').value.trim();
        aiCfg.stripNameRemarks = document.getElementById('aiStripRemarks').checked;
        aiCfg.batchRequest = document.getElementById('aiBatchRequest').checked;
        localStorage.setItem(COUNT_AI_KEY, JSON.stringify(aiCfg));
    }

    function savePrompt() {
        aiCfg.prompt = document.getElementById('aiPrompt').value;
        localStorage.setItem(COUNT_AI_KEY, JSON.stringify(aiCfg));
        setAiStatus('提示词已保存到当前浏览器。');
    }

    function restoreDefaultPrompt() {
        if(!confirm('确定还原默认提示词吗？当前提示词内容会被覆盖。')) return;
        aiCfg.prompt = defaultAiPrompt;
        document.getElementById('aiPrompt').value = defaultAiPrompt;
        localStorage.setItem(COUNT_AI_KEY, JSON.stringify(aiCfg));
        setAiStatus('已还原并保存默认提示词。');
    }

    function updateStripRemarks(enabled) {
        aiCfg.stripNameRemarks = !!enabled;
        localStorage.setItem(COUNT_AI_KEY, JSON.stringify(aiCfg));
        if(aiResults.length) setAiStatus('括号备注设置已保存，将从下一次识图开始生效。');
    }

    function updateAiBatchRequest(enabled) {
        aiCfg.batchRequest = !!enabled;
        localStorage.setItem(COUNT_AI_KEY, JSON.stringify(aiCfg));
        setAiStatus(enabled
            ? '多图合并识别已开启：只减少接口请求次数，图片 token 计费通常不会减少。'
            : '已切换为逐张识别，准确率优先。');
    }

    function handleTabClick(idx) {
        if (currentIdx === idx) {
            if (batches.length <= 1) return alert("至少保留一个档位哦！");
            if (confirm(`确定要删除当前的【${batches[idx].id}】档位吗？`)) {
                batches.splice(idx, 1);
                currentIdx = 0;
                renderAll();
                save();
            }
        } else {
            currentIdx = idx;
            selectedNums = [];
            editingCustomerIndex = null;
            renderAll();
        }
    }

    function addNewBatch() {
        const name = prompt("请输入新档位名称", "新档位");
        if(!name) return;
        batches.push({ id: name, customers: [], total: 50 });
        currentIdx = batches.length - 1;
        renderAll();
        save();
    }

    function clearFilter() {
        document.getElementById('searchBar').value = '';
        renderCustomers();
    }

    function updateBatchTotal() {
        batches[currentIdx].total = parseInt(document.getElementById('totalNum').value) || 50;
        renderGrid();
        renderAiPreview();
        save();
    }

    function showOwnerTip(event, num) {
        const owner = batches[currentIdx].customers.find(c => c.nums.flat().includes(num));
        if(!owner) return;
        const oldTip = document.querySelector('.global-owner-tip');
        if(oldTip) oldTip.remove();
        const tip = document.createElement('div');
        tip.className = 'global-owner-tip';
        tip.textContent = `拥有者: ${owner.name}`;
        const rect = event.target.getBoundingClientRect();
        tip.style.left = (rect.left + rect.width / 2) + 'px';
        tip.style.top = rect.top + 'px';
        document.body.appendChild(tip);
        setTimeout(() => { if(tip) tip.remove(); }, 700); 
    }

    function copyText(text) {
        const t = document.createElement("textarea");
        t.value = text; document.body.appendChild(t);
        t.select(); document.execCommand("copy");
        document.body.removeChild(t);
        alert("已复制！");
    }

    function openResetBatchModal() {
        document.getElementById('shareModal').classList.remove('show');
        document.getElementById('resetBatchModal').classList.add('show');
    }

    function closeResetBatchModal(event) {
        if(event && event.target?.id !== 'resetBatchModal') return;
        document.getElementById('resetBatchModal').classList.remove('show');
    }

    function resetCurrentBatch(clearCustomers) {
        const current = batches[currentIdx];
        current.customers.forEach(customer => { customer.nums = []; });
        if(clearCustomers) current.customers = [];
        selectedNums = [];
        editingCustomerIndex = null;
        closeResetBatchModal();
        renderAll();
        save();
    }

    function bytesToBase64Url(bytes) {
        let binary = '';
        const chunkSize = 0x8000;
        for(let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function base64UrlToBytes(value) {
        const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    function encodePublicBatch(batch) {
        const customers = batch.customers.map(customer => {
            const nums = [...new Set(customer.nums.flat().map(Number).filter(num =>
                Number.isInteger(num) && num >= 1 && num <= batch.total
            ))].sort((a, b) => a - b);
            return nums.length ? [customer.name, nums] : null;
        }).filter(Boolean);
        const payload = { v: 1, n: batch.id, t: batch.total, c: customers };
        return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
    }

    function decodePublicBatch(value) {
        try {
            const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
            const total = Number(data.t);
            if(data.v !== 1 || !Number.isInteger(total) || total < 1 || total > 1000 || !Array.isArray(data.c)) return null;
            const customers = data.c.map(item => {
                if(!Array.isArray(item) || item.length !== 2) return null;
                const name = String(item[0] || '').trim().slice(0, 60);
                const nums = [...new Set((Array.isArray(item[1]) ? item[1] : []).map(Number).filter(num =>
                    Number.isInteger(num) && num >= 1 && num <= total
                ))].sort((a, b) => a - b);
                return name && nums.length ? { name, nums } : null;
            }).filter(Boolean);
            return { id: String(data.n || '未命名档位').trim().slice(0, 80), total, customers };
        } catch(error) {
            return null;
        }
    }

    function buildCustomerShareLink() {
        const shareUrl = new URL('view.html', location.href);
        const baseUrl = shareUrl.toString();
        return `${baseUrl}#customers=${encodePublicBatch(batches[currentIdx])}`;
    }

    function openShareModal() {
        const occupied = new Set(batches[currentIdx].customers.flatMap(customer => customer.nums.flat())).size;
        if(!occupied) {
            alert('当前档位还没有已占用的号码，暂时没有可分享的归属记录。');
            return;
        }
        document.getElementById('resetBatchModal').classList.remove('show');
        document.getElementById('shareLinkInput').value = buildCustomerShareLink();
        document.getElementById('shareModal').classList.add('show');
    }

    function closeShareModal(event) {
        if(event && event.target?.id !== 'shareModal') return;
        document.getElementById('shareModal').classList.remove('show');
    }

    function copyShareLink() {
        const link = document.getElementById('shareLinkInput').value;
        if(!link) return;
        copyText(link);
    }

    async function shareCustomerLink() {
        const link = document.getElementById('shareLinkInput').value;
        if(!link) return;
        if(navigator.share) {
            try {
                await navigator.share({
                    title: `${batches[currentIdx].id} · 号码归属查询`,
                    text: `查看【${batches[currentIdx].id}】的号码归属`,
                    url: link
                });
                return;
            } catch(error) {
                if(error?.name === 'AbortError') return;
            }
        }
        copyText(link);
    }

    function previewShareLink() {
        const link = document.getElementById('shareLinkInput').value;
        if(link) window.open(link, '_blank', 'noopener');
    }

    function filterPublicNumbers() {
        const query = document.getElementById('publicSearch').value.trim().toLowerCase();
        document.querySelectorAll('#publicNumberGrid .public-num-card').forEach(card => {
            const matches = !query || card.dataset.number.includes(query) || (card.dataset.owner || '').toLowerCase().includes(query);
            card.style.display = matches ? '' : 'none';
        });
        document.querySelectorAll('#publicCustomerList .public-customer-card').forEach(card => {
            const matches = !query || card.dataset.search.includes(query);
            card.style.display = matches ? '' : 'none';
        });
    }

    function clearPublicSearch() {
        document.getElementById('publicSearch').value = '';
        filterPublicNumbers();
    }

    function renderPublicView(data) {
        document.body.classList.add('public-view-active');
        document.getElementById('publicBatchTitle').textContent = data.id;
        document.getElementById('publicTotalCount').textContent = data.total;
        const ownerByNumber = new Map();
        data.customers.forEach(customer => customer.nums.forEach(num => ownerByNumber.set(num, customer.name)));
        document.getElementById('publicSoldCount').textContent = ownerByNumber.size;
        document.getElementById('publicRemainingCount').textContent = Math.max(0, data.total - ownerByNumber.size);

        const grid = document.getElementById('publicNumberGrid');
        const cards = [];
        for(let num = 1; num <= data.total; num++) {
            const owner = ownerByNumber.get(num);
            cards.push(`
                <div class="public-num-card ${owner ? 'occupied' : ''}" data-number="${num}" data-owner="${escapeAiHtml(owner || '')}">
                    <span class="public-num">${num}</span>
                    <span class="public-owner">${owner ? escapeAiHtml(owner) : '未占用'}</span>
                </div>
            `);
        }
        grid.innerHTML = cards.join('');
        const customerList = document.getElementById('publicCustomerList');
        const customers = data.customers.slice().sort((a, b) => Math.min(...a.nums) - Math.min(...b.nums));
        customerList.innerHTML = customers.length ? customers.map(customer => `
            <article class="public-customer-card" data-search="${escapeAiHtml(`${customer.name} ${customer.nums.join(' ')}`.toLowerCase())}">
                <div class="public-customer-name">${escapeAiHtml(customer.name)}</div>
                <div class="public-customer-nums">${customer.nums.map(num => `<span class="public-customer-num">${num}</span>`).join('')}</div>
            </article>
        `).join('') : '<div class="public-empty">当前没有顾客号码记录。</div>';

        const customerCount = document.querySelector('.public-customer-heading span');
        if(customerCount) customerCount.textContent = `${customers.length} 位顾客 · 仅显示已有号码`;
    }

    function renderPublicViewError() {
        document.body.classList.add('public-view-active');
        document.getElementById('publicBatchTitle').textContent = '链接无法读取';
        document.querySelector('.public-subtitle').textContent = '分享链接可能不完整，请让商家重新发送。';
        document.getElementById('publicNumberGrid').innerHTML = '<div class="public-empty">没有可显示的号码数据。</div>';
        document.getElementById('publicCustomerList').innerHTML = '<div class="public-empty">没有可显示的顾客数据。</div>';
        document.getElementById('publicSearch').disabled = true;
    }

    function copyRemaining() {
        const b = batches[currentIdx];
        const sold = b.customers.flatMap(c => c.nums.flat());
        let rem = [];
        for(let i=1; i<=b.total; i++) if(!sold.includes(i)) rem.push(i);
        copyText(`【${b.id}】余号[${rem.length}]:\n${rem.join(', ')}`);
    }

    function copyCustomerNums(cIdx) {
        const c = batches[currentIdx].customers[cIdx];
        const res = c.nums.map(batch => batch.join(' ')).join(' | ');
        copyText(`${c.name}的成绩单(  •̀ω•́  )ｷﾘｯ\n${res}`);
    }

    function addCustomer() {
        const input = document.getElementById('custInput');
        if(!input.value.trim()) return;
        batches[currentIdx].customers.unshift({ name: input.value.trim(), nums: [] });
        input.value = '';
        renderAll();
        save();
    }

    function handleCustomerNameTap(event, idx) {
        event.stopPropagation();
        const now = Date.now();
        if(lastNameTapIndex === idx && now - lastNameTapAt <= 450) {
            lastNameTapIndex = -1;
            lastNameTapAt = 0;
            startEditCustomerName(idx);
            return;
        }
        lastNameTapIndex = idx;
        lastNameTapAt = now;
    }

    function startEditCustomerName(idx) {
        if(!batches[currentIdx].customers[idx]) return;
        editingCustomerIndex = idx;
        renderCustomers();
        requestAnimationFrame(() => {
            const input = document.getElementById('customerNameEditor');
            if(input) {
                input.focus();
                input.select();
            }
        });
    }

    function handleCustomerNameKey(event, idx) {
        if(event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
        } else if(event.key === 'Escape') {
            event.preventDefault();
            editingCustomerIndex = null;
            renderCustomers();
        }
    }

    function finishCustomerNameEdit(idx, commit) {
        if(editingCustomerIndex !== idx) return;
        const input = document.getElementById('customerNameEditor');
        if(!input) {
            editingCustomerIndex = null;
            renderCustomers();
            return;
        }
        if(commit) {
            const name = cleanAiName(input.value);
            if(!name) {
                alert('用户名不能为空。');
                editingCustomerIndex = null;
                renderCustomers();
                return;
            }
            batches[currentIdx].customers[idx].name = name;
            save();
        }
        editingCustomerIndex = null;
        renderCustomers();
    }

    function selectNumber(num) {
        const idx = selectedNums.indexOf(num);
        if (idx > -1) selectedNums.splice(idx, 1);
        else selectedNums.push(num);
        renderAll();
    }

    function bindToCustomer(index) {
        if(selectedNums.length === 0) return;
        batches[currentIdx].customers[index].nums.push([...selectedNums].sort((a,b) => a-b));
        selectedNums = [];
        renderAll();
        save();
    }

    function unbindNumber(cIdx, bIdx, num) {
        if(confirm(`确定删除数字 ${num} 吗？`)) {
            batches[currentIdx].customers[cIdx].nums[bIdx] = batches[currentIdx].customers[cIdx].nums[bIdx].filter(n => n !== num);
            if(batches[currentIdx].customers[cIdx].nums[bIdx].length === 0) batches[currentIdx].customers[cIdx].nums.splice(bIdx, 1);
            renderAll();
            save();
        }
    }

    function sortCustomerNums(cIdx) {
        const c = batches[currentIdx].customers[cIdx];
        if(!c.nums.length) return;
        c.nums = [c.nums.flat().sort((a, b) => a - b)];
        renderAll();
        save();
    }

    function sortAllCustomerNums() {
        const count = batches[currentIdx].customers.length;
        if(!count) return alert("当前档位还没有顾客数据。");
        if(confirm(`将当前档位【${batches[currentIdx].id}】中所有顾客的编号统一按从小到大排序整理吗？`)) {
            batches[currentIdx].customers.forEach(c => {
                if(c.nums.length) c.nums = [c.nums.flat().sort((a, b) => a - b)];
            });
            renderAll();
            save();
        }
    }

    function deleteCustomer(idx) { if(confirm(`彻底删除顾客 ${batches[currentIdx].customers[idx].name}？`)) { batches[currentIdx].customers.splice(idx, 1); renderAll(); save(); } }

    function initSystem() { if(confirm("警告：这将清空所有档位的所有数据！")) { batches = [{ id: '默认档', customers: [], total: 50 }]; currentIdx = 0; renderAll(); save(); } }

    function renderAll() {
        document.getElementById('totalNum').value = batches[currentIdx].total;
        const tabs = document.getElementById('batchTabsList');
        tabs.innerHTML = batches.map((b, i) => `<div class="tab ${i === currentIdx ? 'active' : ''}" onclick="handleTabClick(${i})">${b.id}</div>`).join('');
        renderGrid();
        renderCustomers();
        document.getElementById('aiTargetBatch').innerText = batches[currentIdx].id;
        const msg = document.getElementById('statusMsg');
        msg.style.display = selectedNums.length > 0 ? 'flex' : 'none';
        msg.innerHTML = `<span class="selection-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 12.5 10 16l8-9"/></svg></span><span>已选中 ${selectedNums.join(', ')} 号，点击顾客完成绑定</span>`;
        const occupied = new Set(batches[currentIdx].customers.flatMap(customer => customer.nums.flat())).size;
        const customersWithNumbers = batches[currentIdx].customers.filter(customer => customer.nums.flat().length > 0).length;
        const summary = {
            countTotalStat: batches[currentIdx].total,
            countSoldStat: occupied,
            countRemainingStat: Math.max(0, batches[currentIdx].total - occupied),
            countCustomerStat: customersWithNumbers
        };
        Object.entries(summary).forEach(([id, value]) => {
            const node = document.getElementById(id);
            if(node) node.textContent = value;
        });
        publishCountState();
    }

    function renderGrid() {
        const grid = document.getElementById('numberGrid');
        const soldNums = batches[currentIdx].customers.flatMap(c => c.nums.flat());
        grid.innerHTML = '';
        for(let i=1; i<=batches[currentIdx].total; i++) {
            const div = document.createElement('div');
            const isSold = soldNums.includes(i);
            div.className = `num-card ${isSold ? 'sold' : ''} ${selectedNums.includes(i) ? 'selected' : ''}`;
            div.innerText = i;
            div.onclick = isSold ? (e) => showOwnerTip(e, i) : () => selectNumber(i);
            grid.appendChild(div);
        }
    }

    function renderCustomers() {
        const list = document.getElementById('customerList');
        const search = document.getElementById('searchBar').value.toLowerCase();
        list.innerHTML = '';
        batches[currentIdx].customers.forEach((c, cIdx) => {
            if(search && !c.name.toLowerCase().includes(search)) return;
            const card = document.createElement('div');
            card.className = `customer-card ${selectedNums.length > 0 ? 'can-receive' : ''}`;
            if(selectedNums.length > 0) card.onclick = () => bindToCustomer(cIdx);
            const tags = c.nums.map((batch, bIdx) => 
                batch.map(n => `<span class="tag" onclick="event.stopPropagation(); unbindNumber(${cIdx}, ${bIdx}, ${n})">${n}</span>`).join('')
            ).join('<span class="tag-separator">|</span>');
            const customerInitial = Array.from(c.name.trim())[0] || '客';
            const nameEditor = editingCustomerIndex === cIdx
                ? `<input type="text" id="customerNameEditor" class="cust-name-input" maxlength="60" value="${escapeAiHtml(c.name)}" placeholder="输入用户名" onclick="event.stopPropagation()" onkeydown="handleCustomerNameKey(event, ${cIdx})" onblur="finishCustomerNameEdit(${cIdx}, true)">`
                : `<button type="button" class="cust-name-btn" onclick="handleCustomerNameTap(event, ${cIdx})" title="双击修改用户名"><span class="customer-mark" aria-hidden="true">${escapeAiHtml(customerInitial)}</span><span class="cust-name-text">${escapeAiHtml(c.name)}</span></button>`;

            card.innerHTML = `
                <div class="cust-header">
                    <div class="cust-title">
                        ${nameEditor}
                        <span class="cust-count-badge">${c.nums.flat().length} 张</span>
                    </div>
                    <div class="cust-actions">
                        <button class="copy-btn" onclick="event.stopPropagation(); copyCustomerNums(${cIdx})">复制成绩单</button>
                        <button class="sort-btn" onclick="event.stopPropagation(); sortCustomerNums(${cIdx})">排序</button>
                        <button class="cust-delete" onclick="event.stopPropagation(); deleteCustomer(${cIdx})">删除</button>
                    </div>
                </div>
                <div class="tag-box">${tags || '<small class="tag-empty">点击绑定号码...</small>'}</div>
            `;
            list.appendChild(card);
        });
    }

    function toggleAiPanel() {
        const panel = document.getElementById('aiPanel');
        const show = panel.style.display === 'none';
        panel.style.display = show ? 'block' : 'none';
        if(show) renderAiConfig();
    }

    function toggleApiConfig() {
        document.getElementById('apiConfigPanel').classList.toggle('show');
    }

    function renderPresetSelect() {
        const select = document.getElementById('aiPresetSelect');
        select.innerHTML = '<option value="">— 未选择预设 —</option>' + aiCfg.presets.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
    }

    function renderAiConfig() {
        document.getElementById('aiEndpoint').value = aiCfg.endpoint || '';
        document.getElementById('aiKey').value = aiCfg.key || '';
        document.getElementById('aiModel').value = aiCfg.model || '';
        document.getElementById('aiPrompt').value = aiCfg.prompt || defaultAiPrompt;
        document.getElementById('aiStripRemarks').checked = aiCfg.stripNameRemarks !== false;
        document.getElementById('aiBatchRequest').checked = aiCfg.batchRequest === true;
        renderPresetSelect();
        renderModelPicker();
        renderAiImages();
        renderAiPreview();
    }

    function saveCurrentPreset() {
        saveAiCfg();
        if(!aiCfg.endpoint) return alert('请先填写接口地址再保存预设。');
        const nameInput = document.getElementById('aiPresetName');
        let name = nameInput.value.trim();
        if(!name) {
            try { name = new URL(aiCfg.endpoint).hostname; } catch(e) { name = `预设${aiCfg.presets.length + 1}`; }
        }
        const existing = aiCfg.presets.findIndex(p => p.name === name);
        const preset = { name, endpoint: aiCfg.endpoint, key: aiCfg.key, model: aiCfg.model };
        if(existing >= 0) {
            if(!confirm(`预设「${name}」已存在，要覆盖它吗？`)) return;
            aiCfg.presets[existing] = preset;
        } else aiCfg.presets.push(preset);
        nameInput.value = '';
        localStorage.setItem(COUNT_AI_KEY, JSON.stringify(aiCfg));
        renderPresetSelect();
        document.getElementById('aiPresetSelect').value = String(aiCfg.presets.findIndex(p => p.name === name));
        alert('预设已保存。');
    }

    function applySelectedPreset() {
        const idx = document.getElementById('aiPresetSelect').value;
        if(idx === '') return;
        const preset = aiCfg.presets[Number(idx)];
        if(!preset) return;
        document.getElementById('aiEndpoint').value = preset.endpoint || '';
        document.getElementById('aiKey').value = preset.key || '';
        document.getElementById('aiModel').value = preset.model || '';
        saveAiCfg();
        setAiStatus(`✅ 已应用预设：${preset.name}`);
    }

    function deleteSelectedPreset() {
        const idx = document.getElementById('aiPresetSelect').value;
        if(idx === '') return alert('请先选择一个要删除的预设。');
        const preset = aiCfg.presets[Number(idx)];
        if(!preset || !confirm(`确定删除预设「${preset.name}」吗？`)) return;
        aiCfg.presets.splice(Number(idx), 1);
        localStorage.setItem(COUNT_AI_KEY, JSON.stringify(aiCfg));
        renderPresetSelect();
        setAiStatus(`🗑️ 已删除预设：${preset.name}`);
    }

    function setAiStatus(text, show=true) {
        const box = document.getElementById('aiStatus');
        box.innerText = text;
        box.className = 'ai-status' + (show ? ' show' : '');
    }

    async function runAiImport() {
        try {
            saveAiCfg();
            if(!aiImages.length) throw new Error('请先上传或粘贴聊天记录截图。');
            if(!document.getElementById('aiEndpoint').value.trim()) throw new Error('请先在 API 设置里填写接口地址。');
            if(!document.getElementById('aiModel').value.trim()) throw new Error('请填写或拉取模型名称。');

            const total = batches[currentIdx].total;
            const occupiedBefore = new Set(batches[currentIdx].customers.flatMap(c => c.nums.flat())).size;
            const rawEntries = [];
            aiImages.sort((a, b) => a.seq - b.seq);
            aiResults = [];
            aiConflicts = [];
            aiRecords = [];
            aiTrace = [];
            editingAiResultIndex = null;
            renderAiTrace();
            renderAiPreview();

            const jobs = [];
            for(let i = 0; i < aiImages.length; i++) {
                const image = aiImages[i];
                const sources = image.segmented && image.segments?.length
                    ? image.segments.map((segment, index) => ({ dataUrl: segment.dataUrl, part: index + 1, parts: image.segments.length }))
                    : [{ dataUrl: image.dataUrl, part: 1, parts: 1 }];
                for(const source of sources) {
                    jobs.push({
                        dataUrl: source.dataUrl,
                        imageIndex: i,
                        part: source.part,
                        partIndex: source.part - 1,
                        partCount: source.parts
                    });
                }
            }

            const hasSegmentedImages = aiImages.some(image => image.segmented);
            const useBatch = aiCfg.batchRequest === true && jobs.length > 1 && !hasSegmentedImages;
            if(aiCfg.batchRequest === true && hasSegmentedImages) {
                pushAiTrace('检测到长截图分段：为保证顺序，本次自动改回逐段识别。', 'warn');
            }
            pushAiTrace(`准备处理 ${aiImages.length} 张截图，共 ${jobs.length} 个识图片段；模式：${useBatch ? '多图合并请求' : '逐张请求'}。`);

            const jobGroups = useBatch ? chunkArray(jobs, 4) : jobs.map(job => [job]);
            let requestCount = 0;

            for(let groupIndex = 0; groupIndex < jobGroups.length; groupIndex++) {
                const group = jobGroups[groupIndex];
                const firstJob = group[0];
                const partText = group.length === 1 && firstJob.partCount > 1 ? `，分段 ${firstJob.part}/${firstJob.partCount}` : '';
                const groupLabel = group.length > 1
                    ? `第 ${groupIndex + 1}/${jobGroups.length} 组（${group.length} 张）`
                    : `截图 #${firstJob.imageIndex + 1}${partText}`;
                setAiStatus(`正在识别${groupLabel}...`);
                pushAiTrace(`开始识别${groupLabel}。`);
                const entries = await callAiForImages(
                    group.map(job => ({ dataUrl: job.dataUrl })),
                    group.length === 1 ? { partIndex: firstJob.partIndex, partCount: firstJob.partCount } : {}
                );
                requestCount++;
                const groupRaw = [];
                entries.forEach((entry, localIndex) => {
                    let job = firstJob;
                    if(group.length > 1) {
                        if(!Number.isInteger(entry.aiImageIndex) || entry.aiImageIndex < 0 || entry.aiImageIndex >= group.length) {
                            throw new Error('合并识图结果缺少正确的 image 字段，请关闭“多图合并识别”后重试。');
                        }
                        job = group[entry.aiImageIndex];
                    }
                    groupRaw.push({
                        ...entry,
                        imageIndex: job.imageIndex,
                        partIndex: job.partIndex,
                        localIndex
                    });
                });
                rawEntries.push(...groupRaw);
                const timeText = aiTimeRange(groupRaw);
                pushAiTrace(`${groupLabel}：提取 ${groupRaw.length} 条编号记录，时间范围 ${timeText}。`, 'ok');
            }

            resolveProxyOwnersAgainstSenders(rawEntries);
            const entryOrder = entry => Number.isFinite(entry.order) ? entry.order : Number.MAX_SAFE_INTEGER;
            const ordered = rawEntries
                .map((entry, fallbackOrder) => ({ ...entry, fallbackOrder }))
                .sort((a, b) => a.imageIndex - b.imageIndex
                    || a.partIndex - b.partIndex
                    || (Number.isFinite(a.timeSeconds) && Number.isFinite(b.timeSeconds) && a.timeSeconds !== b.timeSeconds
                        ? a.timeSeconds - b.timeSeconds
                        : entryOrder(a) - entryOrder(b))
                    || a.fallbackOrder - b.fallbackOrder);

            const timedCount = ordered.filter(entry => Number.isFinite(entry.timeSeconds)).length;
            pushAiTrace(`排序完成：${timedCount}/${ordered.length} 条记录读取到时间。按截图顺序、分段顺序、消息时间递增排序；时间相同再按截图内行号。`, timedCount === ordered.length ? 'ok' : 'warn');

            const claimOwner = new Map();
            const claimInfo = new Map();
            const nameOrder = [];
            const nameNums = new Map();
            const conflicts = [];
            const conflictSeen = new Set();

            const addClaim = (rawName, rawNum, record) => {
                const sender = aiIdentity(record.senderRawName ?? rawName, record.avatarHint, record.imageIndex);
                const owner = aiIdentity(record.ownerRawName || rawName, record.avatarHint, record.imageIndex);
                const name = owner.display;
                const claimType = sender.key !== owner.key
                    ? 'proxy'
                    : (record.claimType === 'uncertain' ? 'uncertain' : 'direct');
                const n = Math.trunc(Number(rawNum));
                const valid = !!name && Number.isFinite(n) && n >= 1 && n <= total;
                const row = {
                    id: `${record.imageIndex}_${record.partIndex}_${record.fallbackOrder}`,
                    imageIndex: record.imageIndex,
                    partIndex: record.partIndex,
                    order: record.order,
                    messageTime: record.messageTime,
                    timeLabel: record.timeLabel,
                    timeSeconds: record.timeSeconds,
                    name,
                    rawName: cleanAiName(rawName),
                    senderDisplay: sender.display,
                    ownerDisplay: owner.display,
                    claimType,
                    avatarHint: record.avatarHint || '',
                    rawText: record.rawText || '',
                    number: Number.isFinite(n) ? n : null,
                    rawNumber: rawNum,
                    status: 'skip',
                    winner: ''
                };
                aiRecords.push(row);
                if(!valid) return;
                const key = owner.key;
                if(claimOwner.has(n)) {
                    const winner = claimOwner.get(n);
                    const winnerInfo = claimInfo.get(n) || { name: winner, existing: true };
                    const winnerKey = winnerInfo.key || aiNameKey(winner);
                    row.status = winnerKey === key ? 'duplicate' : 'conflict';
                    row.winner = winner;
                    row.winnerSource = claimSourceLabel(winnerInfo);
                    row.claimSource = claimSourceLabel({ ...record, senderDisplay: sender.display, claimType });
                    if(winnerKey !== key) {
                        const ck = key + '#' + n;
                        if(!conflictSeen.has(ck)) {
                            conflictSeen.add(ck);
                            conflicts.push({
                                number: n,
                                name,
                                winner,
                                claimSource: claimSourceLabel({ ...record, senderDisplay: sender.display, claimType }),
                                winnerSource: claimSourceLabel(winnerInfo)
                            });
                        }
                    }
                    return;
                }
                row.status = 'accept';
                claimOwner.set(n, name);
                claimInfo.set(n, {
                    name,
                    key,
                    imageIndex: record.imageIndex,
                    partIndex: record.partIndex,
                    order: record.order,
                    messageTime: record.messageTime,
                    timeLabel: record.timeLabel,
                    timeSeconds: record.timeSeconds,
                    senderDisplay: sender.display,
                    claimType,
                    existing: false
                });
                if(!nameNums.has(key)) {
                    nameNums.set(key, { name, numbers: new Set(), senders: new Map(), proxyCount: 0 });
                    nameOrder.push(key);
                }
                const ownerRecord = nameNums.get(key);
                ownerRecord.numbers.add(n);
                if(sender.key !== owner.key) {
                    ownerRecord.proxyCount++;
                    ownerRecord.senders.set(sender.display, (ownerRecord.senders.get(sender.display) || 0) + 1);
                }
            };

            batches[currentIdx].customers.forEach(c => c.nums.flat().forEach(n => {
                if(claimOwner.has(n)) return;
                claimOwner.set(n, c.name);
                claimInfo.set(n, { name: c.name, existing: true });
            }));

            ordered.forEach(entry => addClaim(entry.name, entry.number, entry));
            aiResults = nameOrder.map(key => {
                const rec = nameNums.get(key);
                return {
                    name: rec.name,
                    numbers: [...rec.numbers].sort((a,b) => a - b),
                    senders: [...rec.senders.entries()],
                    proxyCount: rec.proxyCount,
                    needsReview: isPlaceholderName(rec.name)
                };
            });
            aiConflicts = conflicts.slice();
            const proxyTotal = aiRecords.filter(record => record.status === 'accept' && record.claimType === 'proxy').length;
            const pendingNameCount = aiResults.filter(item => item.needsReview || isPlaceholderName(item.name)).length;
            pushAiTrace(`归属处理完成：${proxyTotal} 个编号来自帮抢，${pendingNameCount} 位用户等待命名。`, pendingNameCount ? 'warn' : 'ok');
            pushAiTrace(`重复编号判定完成：${conflicts.length} 个编号存在多人重复，已按时间更早者优先；时间相同再按行号。`, conflicts.length ? 'warn' : 'ok');
            pushAiTrace(`本次共调用接口 ${requestCount} 次，最终保留 ${aiResults.length} 位用户、${aiResults.reduce((sum, item) => sum + item.numbers.length, 0)} 个编号。`, 'ok');
            renderAiPreview();

            const count = aiResults.reduce((s, item) => s + item.numbers.length, 0);
            if(!count) {
                pushAiTrace('没有生成可新增的编号，请展开识别记录校对或检查当前档位是否已有数据。', 'warn');
                setAiStatus(occupiedBefore
                    ? `识别完成，但本次没有可新增的编号。当前档位原有 ${occupiedBefore} 个编号已优先保留；如果只是重复测试，请先点“重置本档”并选择“仅重置本档数字”再识图。`
                    : '识别完成，但没有提取到有效编号。请展开“识别记录校对”检查昵称与编号，或检查截图清晰度。');
                return;
            }
            setAiStatus(`识别完成：${aiResults.length} 个用户、共 ${count} 个编号，已按消息时间递增整理。` + (proxyTotal ? `其中 ${proxyTotal} 个编号已识别为帮抢。` : '') + (pendingNameCount ? `有 ${pendingNameCount} 位空白名或未识别用户名需要先命名。` : '') + (aiConflicts.length ? `有 ${aiConflicts.length} 个编号被多人重复发送，已按时间更早者优先。` : '') + (occupiedBefore ? `当前档位原有 ${occupiedBefore} 个编号会继续优先保留；如果只是重复测试，请先点“重置本档”并选择“仅重置本档数字”。` : '') + '请先展开校对表核对，再点击导入。');
        } catch(err) {
            pushAiTrace(`识别失败：${err.message}`, 'warn');
            setAiStatus(`识别失败：${err.message}`);
        }
    }

    function addAiImageFiles(files) {
        const list = Array.from(files || []).filter(file => file.type.startsWith('image/'));
        if(!list.length) return;
        const firstSeq = aiImages.reduce((max, item) => Math.max(max, item.seq || 0), 0) + 1;
        const jobs = list.map((file, index) => ({
            file,
            seq: firstSeq + index,
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`
        }));
        Promise.all(jobs.map(job => compressImage(job.file).then(processed => ({ ...processed, id: job.id, seq: job.seq, name: job.file.name || '粘贴截图' }))))
            .then(items => {
                aiImages.push(...items);
                aiImages.sort((a, b) => a.seq - b.seq);
                renderAiImages();
            })
            .catch(() => alert('有图片读取失败，请重新上传。'));
        document.getElementById('aiImageInput').value = '';
    }

    function removeAiImage(id) {
        aiImages = aiImages.filter(item => item.id !== id);
        renderAiImages();
    }

    function clearAiImages() {
        if(!aiImages.length) return;
        if(!confirm('确定清空所有导入图片吗？识别预览也会一起清空。')) return;
        aiImages = [];
        closeAiImageViewer();
        clearAiPreview();
        renderAiImages();
        setAiStatus('已清空所有导入图片。');
    }

    function moveAiImage(id, delta) {
        const index = aiImages.findIndex(item => item.id === id);
        const target = index + delta;
        if(index < 0 || target < 0 || target >= aiImages.length) return;
        [aiImages[index], aiImages[target]] = [aiImages[target], aiImages[index]];
        aiImages.forEach((item, i) => { item.seq = i + 1; });
        renderAiImages();
    }

    function getAiImageMeta(item) {
        return {
            kb: item.size ? `${Math.round(item.size / 1024)} KB` : '',
            size: item.width && item.height ? `${item.width}×${item.height}` : '',
            quality: item.segmented ? `分段 ${item.segments?.length || 1}` : (item.reencoded ? '已缩放' : '原图'),
            lowQuality: !!(item.width && item.width < 600)
        };
    }

    function renderAiImages() {
        const box = document.getElementById('aiImageList');
        box.innerHTML = aiImages.map((item, index) => {
            const meta = getAiImageMeta(item);
            const qualityText = meta.quality === '原图' ? '' : meta.quality;
            const tooltip = [meta.size, meta.kb, qualityText].filter(Boolean).join(' · ');
            return `
            <div class="ai-image-item">
                <div class="ai-image-top-tags">
                    <span class="ai-image-seq">#${index + 1}</span>
                    ${meta.lowQuality ? '<span class="ai-image-size-warning">尺寸偏小</span>' : ''}
                </div>
                <img src="${item.dataUrl}" alt="${escapeAiHtml(item.name)}" title="点击放大查看" onclick="openAiImageViewer('${item.id}')">
                <button class="ai-image-remove" onclick="removeAiImage('${item.id}')" aria-label="移除这张截图">✕</button>
                ${!meta.lowQuality && qualityText ? `<span class="ai-image-quality">${qualityText}</span>` : ''}
                <div class="ai-image-meta" title="${escapeAiHtml(tooltip)}">
                    ${meta.size ? `<span class="${meta.lowQuality ? 'low-quality' : ''}">${meta.size}</span>` : ''}
                    ${meta.kb ? `<span>${meta.kb}</span>` : ''}
                </div>
                <div class="ai-image-move">
                    <button onclick="moveAiImage('${item.id}', -1)" title="前移">‹</button>
                    <button onclick="moveAiImage('${item.id}', 1)" title="后移">›</button>
                </div>
            </div>`;
        }).join('');
        const toolbar = document.getElementById('aiImageToolbar');
        if(toolbar) toolbar.style.display = aiImages.length ? 'flex' : 'none';
        if(viewingAiImageIndex >= aiImages.length) closeAiImageViewer();
    }

    function openAiImageViewer(id) {
        const index = aiImages.findIndex(item => item.id === id);
        if(index < 0) return;
        viewingAiImageIndex = index;
        renderAiImageViewer();
        document.getElementById('aiImageViewer').classList.add('show');
    }

    function renderAiImageViewer() {
        const item = aiImages[viewingAiImageIndex];
        if(!item) {
            closeAiImageViewer();
            return;
        }
        const meta = getAiImageMeta(item);
        const qualityText = meta.quality === '原图' ? '' : meta.quality;
        document.getElementById('aiImageViewerTitle').textContent = `截图 #${viewingAiImageIndex + 1} / ${aiImages.length}`;
        document.getElementById('aiImageViewerImg').src = item.dataUrl;
        document.getElementById('aiImageViewerMeta').textContent = [meta.size, meta.kb, qualityText].filter(Boolean).join(' · ') + (meta.lowQuality ? ' · 建议换清晰原图' : '');
        document.getElementById('aiImageViewerCounter').textContent = `${viewingAiImageIndex + 1} / ${aiImages.length}`;
        document.getElementById('aiImageViewerPrev').disabled = viewingAiImageIndex <= 0;
        document.getElementById('aiImageViewerNext').disabled = viewingAiImageIndex >= aiImages.length - 1;
    }

    function moveAiImageViewer(delta) {
        const next = viewingAiImageIndex + delta;
        if(next < 0 || next >= aiImages.length) return;
        viewingAiImageIndex = next;
        renderAiImageViewer();
    }

    function closeAiImageViewer(event) {
        if(event && event.target !== event.currentTarget) return;
        viewingAiImageIndex = -1;
        document.getElementById('aiImageViewer').classList.remove('show');
        document.getElementById('aiImageViewerImg').removeAttribute('src');
    }

    document.addEventListener('keydown', function(event) {
        if(!document.getElementById('aiImageViewer').classList.contains('show')) return;
        if(event.key === 'Escape') closeAiImageViewer();
        else if(event.key === 'ArrowLeft') moveAiImageViewer(-1);
        else if(event.key === 'ArrowRight') moveAiImageViewer(1);
    });

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function loadImageFromDataUrl(dataUrl) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = dataUrl;
        });
    }

    function canvasToJpeg(canvas, quality) {
        return canvas.toDataURL('image/jpeg', quality);
    }

    function createImageSegment(img, sourceY, sourceHeight, targetWidth) {
        const scale = targetWidth ? targetWidth / img.naturalWidth : 1;
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth || img.naturalWidth;
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, sourceY, img.naturalWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    async function compressImage(file) {
        const dataUrl = await readFileAsDataURL(file);
        const img = await loadImageFromDataUrl(dataUrl);
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        // 普通截图不缩放、不二次转码；超过 1800px 的宽图才缩到 1800px。
        // 很长的聊天截图不整张缩小，而是每 3000px 切成一段，避免字体被压成一团。
        const normalMaxWidth = 1800;
        const normalMaxHeight = 4000;
        const segmentHeight = 3000;
        if(height <= normalMaxHeight && width <= normalMaxWidth && file.size < 5 * 1024 * 1024) {
            return { dataUrl, width, height, size: file.size, segmented: false, reencoded: false };
        }
        if(height <= segmentHeight) {
            const targetWidth = width > normalMaxWidth ? normalMaxWidth : width;
            const canvas = createImageSegment(img, 0, height, targetWidth);
            const processed = canvasToJpeg(canvas, 0.92);
            return { dataUrl: processed, width: canvas.width, height: canvas.height, size: Math.round(processed.length * 0.75), segmented: false, reencoded: true };
        }
        const segments = [];
        const overlap = 160;
        for(let y = 0; y < height; y += segmentHeight) {
            const sourceBottom = Math.min(height, y + segmentHeight + (y + segmentHeight < height ? overlap : 0));
            const sourceHeight = sourceBottom - y;
            const canvas = createImageSegment(img, y, sourceHeight, width > normalMaxWidth ? normalMaxWidth : 0);
            const processed = canvasToJpeg(canvas, 0.92);
            segments.push({ dataUrl: processed, width: canvas.width, height: canvas.height });
            if(sourceBottom >= height) break;
        }
        return { dataUrl, width, height, size: file.size, segmented: true, segments };
    }

    function normalizeEndpoint(url) {
        let clean = (url || '').trim().replace(/\/+$/, '');
        if(!clean) throw new Error('请填写接口地址。');
        if(!/\/chat\/completions$/.test(clean)) clean += '/chat/completions';
        return clean;
    }

    function getModelsUrl(url) {
        let clean = (url || '').trim().replace(/\/+$/, '');
        if(!clean) throw new Error('请先填写接口地址。');
        if(clean.endsWith('/chat/completions')) clean = clean.slice(0, -'/chat/completions'.length);
        return clean + '/models';
    }

    

    function buildPrompt() {
        const total = batches[currentIdx].total;
        return (document.getElementById('aiPrompt').value || defaultAiPrompt).replaceAll('{total}', String(total));
    }

    async function fetchAiModels() {
        try {
            saveAiCfg();
            const url = getModelsUrl(document.getElementById('aiEndpoint').value);
            const key = document.getElementById('aiKey').value.trim();
            const headers = {};
            if(key) headers.Authorization = `Bearer ${key}`;
            setAiStatus('正在拉取可用模型...');
            const response = await fetch(url, { headers });
            const text = await response.text();
            if(!response.ok) {
                let msg = text;
                try { msg = JSON.parse(text).error?.message || text; } catch(e) {}
                throw new Error(`接口返回 ${response.status}：${msg}`);
            }
            const json = JSON.parse(text);
            const models = (json.data || []).map(m => m.id).filter(Boolean).sort();
            if(!models.length) throw new Error('接口没有返回可用模型列表。');
            aiModels = models;
            renderModelPicker();
            const currentModel = document.getElementById('aiModel').value.trim();
            if(!models.includes(currentModel)) {
                document.getElementById('aiModel').value = models[0];
                saveAiCfg();
                renderModelPicker();
            }
            setAiStatus(`拉取成功，共 ${models.length} 个模型。请在下方模型列表里点击选择。`);
        } catch(err) {
            setAiStatus(`接口错误：${err.message}`);
        }
    }

    function renderModelPicker() {
        const picker = document.getElementById('aiModelPicker');
        if(!aiModels.length) { picker.classList.remove('show'); return; }
        const currentModel = document.getElementById('aiModel').value.trim();
        picker.innerHTML = aiModels.map(m => `<div class="model-picker-item ${m === currentModel ? 'active' : ''}" onclick="selectAiModel('${m.replace(/'/g, "\\'")}')">${m}</div>`).join('');
        picker.classList.add('show');

        // 点击列表外时自动收起模型选择框
        if(!window.__modelPickerOutsideBound) {
            window.__modelPickerOutsideBound = true;
            document.addEventListener('click', function(event) {
                const picker = document.getElementById('aiModelPicker');
                if(!picker) return;
                if(!picker.contains(event.target) && event.target.id !== 'aiModel') {
                    picker.classList.remove('show');
                }
            });
        }
    }

    function selectAiModel(model) {
        document.getElementById('aiModel').value = model;
        saveAiCfg();
        renderModelPicker();
        document.getElementById('aiModelPicker').classList.remove('show');
    }

    function escapeAiHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function pushAiTrace(text, tone = '') {
        aiTrace.push({ text, tone });
        renderAiTrace();
    }

    function renderAiTrace() {
        const box = document.getElementById('aiTrace');
        if(!box) return;
        if(!aiTrace.length) {
            box.innerHTML = '';
            return;
        }
        box.innerHTML = `
            <details class="ai-trace-box" open>
                <summary>识别过程记录（${aiTrace.length} 步）— 这是程序处理记录，不是模型内部思维链</summary>
                <div class="ai-trace-list">
                    ${aiTrace.map(item => `<div class="ai-trace-row ${escapeAiHtml(item.tone)}">${escapeAiHtml(item.text)}</div>`).join('')}
                </div>
            </details>
        `;
    }

    function normalizeAiTime(value) {
        const text = String(value == null ? '' : value).trim();
        const timeMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if(!timeMatch) return { label: '', seconds: NaN, hasDate: false, raw: text };

        let hour = Number(timeMatch[1]);
        const minute = Number(timeMatch[2]);
        const second = Number(timeMatch[3] || 0);
        if(hour > 23 || minute > 59 || second > 59) return { label: '', seconds: NaN, hasDate: false, raw: text };

        const isPm = /오후|下午|晚上|\bpm\b/i.test(text);
        const isAm = /오전|上午|早上|\bam\b/i.test(text);
        if(isPm && hour < 12) hour += 12;
        if(isAm && hour === 12) hour = 0;

        const dateMatch = text.match(/(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?/);
        const dateParts = dateMatch ? [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])] : null;
        const pad = n => String(n).padStart(2, '0');
        const timeLabel = `${pad(hour)}:${pad(minute)}:${pad(second)}`;
        if(dateParts && dateParts[1] >= 1 && dateParts[1] <= 12 && dateParts[2] >= 1 && dateParts[2] <= 31) {
            const [year, month, day] = dateParts;
            return {
                label: `${year}-${pad(month)}-${pad(day)} ${timeLabel}`,
                seconds: Date.UTC(year, month - 1, day, hour, minute, second),
                hasDate: true,
                raw: text
            };
        }
        return {
            label: timeLabel,
            seconds: hour * 3600 + minute * 60 + second,
            hasDate: false,
            raw: text
        };
    }

    function aiTimeRange(entries) {
        const valid = entries.filter(entry => Number.isFinite(entry.timeSeconds));
        if(!valid.length) return '未读到时间';
        valid.sort((a, b) => a.timeSeconds - b.timeSeconds);
        const first = valid[0].timeLabel || valid[0].messageTime || '—';
        const last = valid[valid.length - 1].timeLabel || valid[valid.length - 1].messageTime || '—';
        return first === last ? first : `${first} → ${last}`;
    }

    function cleanAiName(value) {
        return String(value == null ? '' : value).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    }

    function stripNameRemarks(value) {
        let name = cleanAiName(value);
        let previous = '';
        while(name !== previous) {
            previous = name;
            name = name.replace(/[（(][^（）()]*[）)]/g, '');
        }
        return name.replace(/\s{2,}/g, ' ').trim();
    }

    function aiDisplayName(value) {
        const name = cleanAiName(value);
        return aiCfg.stripNameRemarks === false ? name : stripNameRemarks(name);
    }

    function normalizeAiMarker(value) {
        return cleanAiName(value).replace(/^[\s"'`]+|[\s"'`]+$/g, '').toUpperCase();
    }

    function aiIdentity(rawName, avatarHint, imageIndex) {
        const raw = cleanAiName(rawName);
        const marker = normalizeAiMarker(raw);
        let type = '';
        if(marker === '__BLANK__' || marker === 'BLANK' || marker === '空白名') type = 'blank';
        else if(marker === '__UNREADABLE__' || marker === 'UNREADABLE' || marker === '未识别') type = 'unreadable';
        else if(!raw) type = 'blank';

        if(type) {
            const hint = cleanAiName(avatarHint).slice(0, 20) || '未知头像';
            const label = type === 'blank' ? '空白名' : '未识别用户名';
            const display = `${label}·${hint}·截图${Number.isInteger(imageIndex) ? imageIndex + 1 : '?'}`;
            return {
                display,
                key: `__PLACEHOLDER__|${type}|${imageIndex}|${hint.replace(/\s+/g, '').toLowerCase()}`,
                needsReview: true
            };
        }

        const display = aiDisplayName(raw);
        return { display, key: aiNameKey(display), needsReview: false };
    }

    function isPlaceholderName(value) {
        const text = cleanAiName(value);
        return /^(空白名|未识别用户名)·/.test(text) || /^__(BLANK|UNREADABLE)__$/i.test(text);
    }

    function inferProxyTargetFromText(rawText) {
        const text = String(rawText == null ? '' : rawText).replace(/\s+/g, ' ').trim();
        if(!text) return '';
        let match = text.match(/帮\s*@?\s*(.+?)\s*抢/);
        if(!match) match = text.match(/(?:代抢|给|帮)\s*@?\s*([^\s,，。;；:：、]+)/);
        return match ? aiDisplayName(match[1].replace(/^@/, '').trim()) : '';
    }

    function inferTextOwnerForNumber(rawText, number) {
        const text = String(rawText == null ? '' : rawText).replace(/\r/g, '');
        if(!text) return '';
        const numberRe = /\d{1,3}/g;
        let currentOwner = '';
        let previousEnd = 0;
        let match;
        while((match = numberRe.exec(text))) {
            const gap = text.slice(previousEnd, match.index)
                .replace(/^[\s,，、;；:：.。()（）[\]【】]+|[\s,，、;；:：.。()（）[\]【】]+$/g, '')
                .trim();
            if(gap && /[A-Za-z\u3400-\u9FFF\u3040-\u30FF\uAC00-\uD7AF_]/.test(gap) && !/^(帮|给|代抢|买|要|抢|扣|留|图|张|号|共|第)/.test(gap)) {
                currentOwner = aiDisplayName(gap);
            }
            if(Number(match[0]) === Number(number) && currentOwner) return currentOwner;
            previousEnd = match.index + match[0].length;
        }
        return '';
    }

    function resolveProxyOwnersAgainstSenders(entries) {
        const byImage = new Map();
        entries.forEach(entry => {
            const sender = aiDisplayName(entry.senderRawName);
            if(!sender || isPlaceholderName(sender)) return;
            const key = sender.replace(/[、,，.。;；:：]+$/g, '').replace(/\s+/g, '').toLowerCase();
            if(!key) return;
            if(!byImage.has(entry.imageIndex)) byImage.set(entry.imageIndex, new Map());
            const nameMap = byImage.get(entry.imageIndex);
            if(!nameMap.has(key)) nameMap.set(key, new Set());
            nameMap.get(key).add(sender);
        });
        entries.forEach(entry => {
            if(entry.claimType !== 'proxy' || !entry.ownerRawName || isPlaceholderName(entry.ownerRawName)) return;
            const ownerKey = aiDisplayName(entry.ownerRawName).replace(/[、,，.。;；:：]+$/g, '').replace(/\s+/g, '').toLowerCase();
            const matches = byImage.get(entry.imageIndex)?.get(ownerKey);
            if(matches && matches.size === 1) {
                const exactName = [...matches][0];
                entry.ownerRawName = exactName;
                entry.name = exactName;
            }
        });
    }

    function claimSourceLabel(info) {
        if(!info) return '顺序未知';
        if(info.existing) return '当前档已有记录';
        const image = Number.isInteger(info.imageIndex) ? `截图 #${info.imageIndex + 1}` : '截图';
        const part = Number.isInteger(info.partIndex) && info.partIndex > 0 ? `第 ${info.partIndex + 1} 段` : '';
        const time = info.timeLabel || info.messageTime || '';
        const order = Number.isFinite(info.order) ? `第 ${info.order} 行` : '行号未识别';
        const sender = info.senderDisplay ? `${info.claimType === 'proxy' ? '帮抢' : '发送'}：${info.senderDisplay}` : '';
        return [image, part, time, order, sender].filter(Boolean).join(' · ');
    }

    function aiNameKey(value) {
        const cleaned = cleanAiName(value).replace(/[（(][^（）()]*[）)]/g, '').replace(/\s+/g, '');
        return (cleaned || cleanAiName(value)).toLowerCase();
    }

    function parseAiJson(raw) {
        let text = (raw || '').trim();
        text = text.replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
        let data = null;
        try {
            data = JSON.parse(text);
        } catch(e) {
            const starts = [text.indexOf('{'), text.indexOf('[')].filter(i => i >= 0);
            const start = starts.length ? Math.min(...starts) : -1;
            const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
            if(!Number.isFinite(start) || start < 0 || end <= start) throw new Error('识图结果里没有找到 JSON 内容。');
            data = JSON.parse(text.slice(start, end + 1));
        }
        const list = Array.isArray(data) ? data : [data.entries, data.customers, data.data, data.results].find(Array.isArray) || [data];
        const entries = [];
        const toNumber = value => {
            if(typeof value === 'number') return value;
            if(typeof value === 'string') { const m = value.match(/\d+/); return m ? Number(m[0]) : NaN; }
            return NaN;
        };
        const toOrder = value => {
            const n = Number(value);
            return Number.isFinite(n) && n > 0 ? n : NaN;
        };
        list.forEach(item => {
            if(!item) return;
            const legacyName = String(item.name || item.user || item.userName || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            const senderRawName = String(item.senderName ?? item.sender ?? item.from ?? legacyName).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            const ownerRawName = String(item.ownerName ?? item.owner ?? item.targetName ?? legacyName).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            const avatarHint = String(item.avatarHint ?? item.avatar ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            const rawText = String(item.rawText ?? item.messageText ?? item.text ?? '').trim();
            const claimTypeRaw = String(item.claimType ?? item.claim ?? '').trim().toLowerCase();
            const order = toOrder(item.order ?? item.seq ?? item.position);
            const messageTime = String(item.messageTime ?? item.datetime ?? item.timestamp ?? item.time ?? '').trim();
            const parsedTime = normalizeAiTime(messageTime);
            const rawImageIndex = Number(item.image ?? item.imageIndex ?? item.screenshot ?? item.imageNo ?? NaN);
            const aiImageIndex = Number.isFinite(rawImageIndex) && rawImageIndex > 0 ? Math.trunc(rawImageIndex) - 1 : NaN;
            const proxyTarget = inferProxyTargetFromText(rawText);
            const nums = Array.isArray(item.numbers) ? item.numbers
                : (Array.isArray(item.num) ? item.num
                : (item.num !== undefined && item.num !== null ? [item.num] : []));
            const addEntry = number => {
                const inferredOwner = proxyTarget || inferTextOwnerForNumber(rawText, number);
                const owner = inferredOwner || ownerRawName || senderRawName;
                let claimType = claimTypeRaw === 'proxy' || claimTypeRaw.includes('帮')
                    ? 'proxy'
                    : (claimTypeRaw === 'uncertain' || claimTypeRaw.includes('待') ? 'uncertain' : 'direct');
                if(inferredOwner && aiNameKey(inferredOwner) !== aiNameKey(senderRawName)) claimType = 'proxy';
                entries.push({
                    order,
                    name: owner,
                    senderRawName,
                    ownerRawName: owner,
                    number,
                    messageTime,
                    rawText,
                    avatarHint,
                    claimType,
                    timeLabel: parsedTime.label,
                    timeSeconds: parsedTime.seconds,
                    timeHasDate: parsedTime.hasDate,
                    aiImageIndex
                });
            };
            nums.forEach(v => addEntry(toNumber(v)));
            if(item.number !== undefined && item.number !== null) addEntry(toNumber(item.number));
        });
        return entries.map((entry, index) => ({ ...entry, localIndex: index }));
    }

    function chunkArray(items, size) {
        const chunks = [];
        for(let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
        return chunks;
    }

    async function callAiForImages(sources, context = {}) {
        const endpoint = normalizeEndpoint(document.getElementById('aiEndpoint').value);
        const model = document.getElementById('aiModel').value.trim();
        const key = document.getElementById('aiKey').value.trim();
        if(!model) throw new Error('请填写模型名称。');
        if(!sources.length) throw new Error('没有可识别的图片。');

        const headers = { 'Content-Type': 'application/json' };
        if(key) headers.Authorization = `Bearer ${key}`;

        let prompt = buildPrompt();
        if(sources.length > 1) {
            prompt += `\n\n【本次请求包含 ${sources.length} 张图片】\n按它们在请求中出现的顺序编号为 image=1、2、3……。每一条 entry 必须增加 image 字段，填写该编号所属的图片序号。不同图片要独立处理，不要跨图片合并用户名或编号。`;
        }
        if(context.partCount > 1) {
            prompt += `\n\n【当前是同一张长截图的第 ${context.partIndex + 1}/${context.partCount} 段】\n请只识别这一段里的发言。order 仍然从本段最上方第一条有效发言开始，按 1、2、3 依次编号；不要猜测上一段或下一段的内容。`;
        }

        const requestContent = [{ type: 'text', text: prompt }];
        sources.forEach(source => requestContent.push({ type: 'image_url', image_url: { url: source.dataUrl } }));
        const body = {
            model,
            temperature: 0,
            messages: [{
                role: 'user',
                content: requestContent
            }]
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        const text = await response.text();
        if(!response.ok) {
            let msg = text;
            try { msg = JSON.parse(text).error?.message || text; } catch(e) {}
            throw new Error(`接口返回 ${response.status}：${msg}`);
        }
        let json;
        try { json = JSON.parse(text); } catch(e) { throw new Error('接口返回内容不是有效 JSON。'); }
        const content = json?.choices?.[0]?.message?.content;
        if(!content) throw new Error('接口没有返回识图内容。');
        const result = parseAiJson(content);
        if(!Array.isArray(result)) throw new Error('识图结果格式不正确。');
        return result;
    }

    function startEditAiResultName(idx) {
        if(!aiResults[idx]) return;
        editingAiResultIndex = idx;
        renderAiPreview();
        requestAnimationFrame(() => {
            const input = document.getElementById('aiResultNameEditor');
            if(input) {
                input.focus();
                input.select();
            }
        });
    }

    function handleAiResultNameKey(event, idx) {
        if(event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
        } else if(event.key === 'Escape') {
            event.preventDefault();
            editingAiResultIndex = null;
            renderAiPreview();
        }
    }

    function finishAiResultNameEdit(idx, commit) {
        if(editingAiResultIndex !== idx) return;
        const input = document.getElementById('aiResultNameEditor');
        if(!input) {
            editingAiResultIndex = null;
            renderAiPreview();
            return;
        }
        if(commit) {
            const name = cleanAiName(input.value);
            if(!name) {
                alert('用户名不能为空。');
                editingAiResultIndex = null;
                renderAiPreview();
                return;
            }
            aiResults[idx].name = name;
            aiResults[idx].needsReview = isPlaceholderName(name);
        }
        editingAiResultIndex = null;
        renderAiPreview();
    }

    function renderAiPreview() {
        const box = document.getElementById('aiPreview');
        if(!aiResults.length && !aiConflicts.length && !aiRecords.length) { box.innerHTML = ''; return; }
        const current = batches[currentIdx];
        const sold = current.customers.flatMap(c => c.nums.flat());

        const cards = aiResults.map((item, index) => {
            const name = escapeAiHtml(item.name || '未识别用户');
            const exists = current.customers.some(c => aiNameKey(c.name) === aiNameKey(item.name));
            const senderText = (item.senders || []).map(([sender, count]) => `${sender}${count > 1 ? ` ×${count}` : ''}`).join('、');
            const sourceLine = item.proxyCount
                ? `<div class="ai-preview-source">帮抢来源：<strong>${escapeAiHtml(senderText)}</strong>，共 ${item.proxyCount} 个编号</div>`
                : '';
            const badgeText = item.needsReview ? '待命名' : (exists ? '已有用户' : '新用户');
            const badgeClass = item.needsReview ? ' review' : (exists ? ' exists' : '');
            const chips = item.numbers.map(n => {
                const taken = sold.includes(n);
                return `<span class="ai-num${taken ? ' warn' : ''}">${n}${taken ? ' 已占用' : ''}</span>`;
            }).join('') || '<span class="ai-note">无有效编号</span>';
            const nameEditor = editingAiResultIndex === index
                ? `<input type="text" id="aiResultNameEditor" class="ai-result-name-input" maxlength="60" value="${escapeAiHtml(item.name)}" placeholder="输入用户名" onkeydown="handleAiResultNameKey(event, ${index})" onblur="finishAiResultNameEdit(${index}, true)">`
                : `<button type="button" class="ai-name-btn" onclick="startEditAiResultName(${index})" title="点击修改用户名">${name}</button>`;
            return `
                <div class="ai-preview-card">
                    <div class="ai-preview-head">${nameEditor}<span class="ai-badge${badgeClass}">${badgeText}</span></div>
                    ${sourceLine}
                    <div class="ai-num-list">${chips}</div>
                </div>
            `;
        }).join('');

        const conflictBox = aiConflicts.length ? `
            <details class="ai-conflict-box">
                <summary>${aiConflicts.length} 个编号被重复认领，已按消息时间递增排序并保留最早记录，点击查看</summary>
                <div class="ai-conflict-list">
                    ${aiConflicts.map(c => `<div class="ai-conflict-row">${c.number} 号：${escapeAiHtml(c.name)}（${escapeAiHtml(c.claimSource)}）与 ${escapeAiHtml(c.winner)}（${escapeAiHtml(c.winnerSource)}）重复，已算给 ${escapeAiHtml(c.winner)}</div>`).join('')}
                </div>
            </details>
        ` : '';

        const statusText = { accept: '采用', conflict: '冲突，已忽略', duplicate: '同人重复，已忽略', skip: '无效或已占用' };
        const recordRows = aiRecords.map(record => {
            const image = aiImages[record.imageIndex];
            const imageLabel = `#${record.imageIndex + 1}${image?.segmented ? ` · 段${record.partIndex + 1}` : ''}`;
            const sender = record.senderDisplay ? escapeAiHtml(record.senderDisplay) : '<span class="ai-record-status skip">空昵称</span>';
            const owner = record.ownerDisplay ? escapeAiHtml(record.ownerDisplay) : '<span class="ai-record-status skip">空昵称</span>';
            const claimText = record.claimType === 'proxy' ? '帮抢' : (record.claimType === 'uncertain' ? '待确认' : '直接');
            const number = record.number === null ? escapeAiHtml(record.rawNumber) : record.number;
            const winner = record.winner ? `（${escapeAiHtml(record.winner)}${record.winnerSource ? ` · ${escapeAiHtml(record.winnerSource)}` : ''}）` : '';
            const time = record.timeLabel || escapeAiHtml(record.messageTime) || '—';
            return `<tr><td>${imageLabel}</td><td>${time}</td><td>${Number.isFinite(record.order) ? record.order : '—'}</td><td>${sender}</td><td>${owner}</td><td>${claimText}</td><td>${number}</td><td class="ai-record-status ${record.status}">${statusText[record.status]}${winner}</td></tr>`;
        }).join('');
        const recordBox = aiRecords.length ? `
            <details class="ai-record-box">
                <summary>识别记录校对（${aiRecords.length} 条）— 顺序有疑问时展开检查</summary>
                <div class="ai-note" style="margin-top:5px;">排序依据：先按截图 #1 → #2 → #3，再按每张截图内读取到的消息时间递增；时间相同或读不到时间时，再按从上到下的绝对行号。昵称识别错时，可以直接点击上方预览里的用户名修改。</div>
                <div style="overflow-x:auto;"><table class="ai-record-table">
                    <thead><tr><th>截图</th><th>消息时间</th><th>行号</th><th>发送人</th><th>归属人</th><th>类型</th><th>编号</th><th>结果</th></tr></thead>
                    <tbody>${recordRows}</tbody>
                </table></div>
            </details>
        ` : '';

        const actions = aiResults.length ? `
            <div class="ai-actions">
                <button class="btn-action" onclick="confirmImportAiResults()">确认导入</button>
                <button class="btn-clear" onclick="clearAiPreview()">取消</button>
            </div>
        ` : '';
        box.innerHTML = (cards || '<div class="ai-note">没有可导入的编号。</div>') + conflictBox + recordBox + actions;
    }

    function confirmImportAiResults() {
        if(!aiResults.length) return;
        const pendingNames = aiResults.filter(item => item.needsReview || isPlaceholderName(item.name));
        if(pendingNames.length) {
            alert(`还有 ${pendingNames.length} 个空白名或未识别用户名未命名，请先点击预览里的名字修改后再导入。`);
            return;
        }
        let imported = 0, skipped = 0;
        const total = batches[currentIdx].total;

        aiResults.forEach(item => {
            const name = cleanAiName(item.name);
            if(!name) return;
            const key = aiNameKey(name);
            const nums = [...new Set((item.numbers || []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= total))];

            const existing = batches[currentIdx].customers.find(c => aiNameKey(c.name) === key);
            const ownedElsewhere = new Set(batches[currentIdx].customers.filter(c => aiNameKey(c.name) !== key).flatMap(c => c.nums.flat()));
            const fresh = nums.filter(n => !ownedElsewhere.has(n));

            if(existing) {
                const owned = new Set(existing.nums.flat());
                const add = fresh.filter(n => !owned.has(n));
                if(add.length) { existing.nums.push(add.sort((a, b) => a - b)); imported += add.length; }
                skipped += nums.length - add.length;
            } else {
                if(fresh.length) {
                    batches[currentIdx].customers.unshift({ name, nums: [fresh.sort((a, b) => a - b)] });
                    imported += fresh.length;
                    skipped += nums.length - fresh.length;
                } else skipped += nums.length;
            }
        });

        aiResults = [];
        aiConflicts = [];
        editingAiResultIndex = null;
        renderAiImages();
        renderAiPreview();
        renderAll();
        save();
        setAiStatus(`导入完成：新增编号 ${imported} 个，跳过重复 ${skipped} 个。`);
    }

    function clearAiPreview() {
        aiResults = [];
        aiConflicts = [];
        aiRecords = [];
        aiTrace = [];
        editingAiResultIndex = null;
        renderAiTrace();
        renderAiPreview();
        setAiStatus('', false);
    }

    document.addEventListener('paste', function(event) {
        const panel = document.getElementById('aiPanel');
        if(panel.style.display === 'none' || !event.clipboardData?.files?.length) return;
        const hasImage = Array.from(event.clipboardData.files).some(file => file.type.startsWith('image/'));
        if(hasImage) {
            event.preventDefault();
            addAiImageFiles(event.clipboardData.files);
        }
    });

    document.addEventListener('dragover', function(event) {
        const upload = event.target.closest('.ai-upload');
        if(upload) event.preventDefault();
    });
    document.addEventListener('drop', function(event) {
        const upload = event.target.closest('.ai-upload');
        if(!upload || !event.dataTransfer?.files?.length) return;
        event.preventDefault();
        addAiImageFiles(event.dataTransfer.files);
    });

    window.addEventListener('storage', function(event) {
        if(event.key === COUNT_DATA_KEY && event.newValue) {
            try {
                batches = JSON.parse(event.newValue);
                currentIdx = Math.min(currentIdx, Math.max(0, batches.length - 1));
                renderAll();
            } catch(error) {}
        } else if(event.key === STUDIO_THEME_KEY) {
            syncStudioTheme();
        }
    });

    renderAll();
