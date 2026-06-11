document.addEventListener('DOMContentLoaded', () => {

    // ── DOM Elements ──────────────────────────────────────────────────────────
    const urlInput       = document.getElementById('target-url');
    const algoSelect     = document.getElementById('algorithm-select');
    const minInput       = document.getElementById('min-interval');
    const maxInput       = document.getElementById('max-interval');
    const startBtn       = document.getElementById('start-btn');
    const stopBtn        = document.getElementById('stop-btn');
    const statusBox      = document.getElementById('status-box');
    const countdownEl    = document.getElementById('countdown');
    const logText        = document.getElementById('log-text');
    const viewCount      = document.getElementById('view-count');
    const algoDisplay    = document.getElementById('algo-display');
    const iframe         = document.getElementById('target-frame');
    const framePlaceholder = document.getElementById('frame-placeholder');
    const browserUrlEl   = document.getElementById('browser-url-display');
    const urlTypeBadge   = document.getElementById('url-type-badge');
    const urlHint        = document.getElementById('url-hint');
    const presetNameInput = document.getElementById('preset-name');
    const savePresetBtn  = document.getElementById('save-preset-btn');
    const presetList     = document.getElementById('preset-list');

    // ── Engine State ──────────────────────────────────────────────────────────
    let isRunning       = false;
    let countdownTimer  = null;
    let refreshTimeout  = null;
    let currentEmbedUrl = '';
    let currentRawUrl   = '';
    let refreshCount    = 0;

    // Per-algorithm state
    let burstCounter      = 0;
    let waveDirection     = 1;
    let waveProgress      = 0;

    // ── YouTube URL Parser ────────────────────────────────────────────────────
    /**
     * Returns { type: 'video'|'playlist'|'other', embedUrl: string, label: string }
     */
    function parseUrl(raw) {
        const url = raw.trim();

        // --- YouTube standard watch URL: youtube.com/watch?v=ID ---
        const videoMatch = url.match(
            /(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
        );
        if (videoMatch) {
            const id = videoMatch[1];
            return {
                type: 'video',
                embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
                label: `YouTube Video: ${id}`
            };
        }

        // --- YouTube Shorts: youtube.com/shorts/ID ---
        const shortsMatch = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
        if (shortsMatch) {
            const id = shortsMatch[1];
            return {
                type: 'video',
                embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
                label: `YouTube Short: ${id}`
            };
        }

        // --- YouTube Playlist: youtube.com/playlist?list=ID ---
        const playlistMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
        if (playlistMatch && url.includes('youtube.com')) {
            const id = playlistMatch[1];
            return {
                type: 'playlist',
                embedUrl: `https://www.youtube.com/embed/videoseries?list=${id}&autoplay=1&rel=0`,
                label: `YouTube Playlist: ${id}`
            };
        }

        // --- YouTube embed URL already (user pasted embed link directly) ---
        if (url.includes('youtube.com/embed/')) {
            return { type: 'video', embedUrl: url, label: 'YouTube Embed' };
        }

        // --- Normal URL ---
        return { type: 'other', embedUrl: url, label: url };
    }

    // Show/hide the hint and badge as the user types
    urlInput.addEventListener('input', () => {
        const raw = urlInput.value.trim();
        if (!raw) {
            urlHint.className = 'url-hint hidden';
            urlTypeBadge.className = 'url-type-badge hidden';
            return;
        }
        const parsed = parseUrl(raw);
        if (parsed.type === 'video') {
            urlHint.textContent = `✅ YouTube video detected — will embed automatically.`;
            urlHint.className = 'url-hint youtube';
            urlTypeBadge.textContent = '▶ YouTube';
            urlTypeBadge.className = 'url-type-badge';
        } else if (parsed.type === 'playlist') {
            urlHint.textContent = `✅ YouTube playlist detected — will embed automatically.`;
            urlHint.className = 'url-hint playlist';
            urlTypeBadge.textContent = '▶ Playlist';
            urlTypeBadge.className = 'url-type-badge';
        } else {
            urlHint.textContent = `🔗 Standard URL — will load in preview frame.`;
            urlHint.className = 'url-hint normal';
            urlTypeBadge.className = 'url-type-badge hidden';
        }
    });

    // ── Algorithms ────────────────────────────────────────────────────────────
    function getNextInterval(min, max, algorithm) {
        let interval, msg;
        switch (algorithm) {
            case 'casual': {
                const avg = (Math.random() + Math.random() + Math.random()) / 3;
                interval = Math.floor(avg * (max - min + 1)) + min;
                if (Math.random() < 0.15) {
                    const extra = Math.floor(Math.random() * 60) + 30;
                    interval += extra;
                    msg = `☕ Coffee break (+${extra}s extra)`;
                } else {
                    msg = 'Normal casual interval';
                }
                break;
            }
            case 'aggressive': {
                interval = Math.floor(Math.pow(Math.random(), 2) * (max - min + 1)) + min;
                msg = 'Aggressive — leaning fast';
                break;
            }
            case 'burst': {
                burstCounter++;
                if (burstCounter >= 5) {
                    burstCounter = 0;
                    interval = max + Math.floor(Math.random() * 60) + 60;
                    msg = `💥 Burst done — long rest (${interval}s)`;
                } else {
                    interval = min + Math.floor(Math.random() * 3);
                    msg = `⚡ Rapid burst ${burstCounter}/5`;
                }
                break;
            }
            case 'wave': {
                waveProgress += 0.1 * waveDirection;
                if (waveProgress >= 1) { waveProgress = 1; waveDirection = -1; }
                else if (waveProgress <= 0) { waveProgress = 0; waveDirection = 1; }
                const eased = waveProgress < 0.5
                    ? 2 * waveProgress * waveProgress
                    : -1 + (4 - 2 * waveProgress) * waveProgress;
                interval = min + Math.floor(eased * (max - min));
                msg = waveDirection === 1 ? '🌊 Wave slowing down…' : '🌊 Wave speeding up…';
                break;
            }
            case 'spike': {
                if (Math.random() < 0.20) {
                    interval = Math.max(1, min - Math.floor(Math.random() * Math.floor(min / 2)));
                    msg = '🚀 Turbo spike!';
                } else {
                    interval = Math.floor(((Math.random() + Math.random()) / 2) * (max - min + 1)) + min;
                    msg = 'Normal paced';
                }
                break;
            }
            default:
                interval = min;
                msg = 'Default';
        }
        return { seconds: Math.max(1, interval), msg };
    }

    // ── Refresh Logic ─────────────────────────────────────────────────────────
    function doRefresh() {
        if (!isRunning) return;

        // For cache-busting on normal URLs, append a token
        let src;
        if (currentEmbedUrl.includes('youtube.com/embed')) {
            // YouTube embed — append autoplay + unique ts so it restarts
            const sep = currentEmbedUrl.includes('?') ? '&' : '?';
            src = `${currentEmbedUrl}${sep}_ts=${Date.now()}`;
        } else {
            const token = Math.random().toString(36).substring(2);
            const sep = currentEmbedUrl.includes('?') ? '&' : '?';
            src = `${currentEmbedUrl}${sep}_cb=${Date.now()}&_t=${token}`;
        }

        // Unload first, then reload after 100ms (forces true refresh)
        iframe.src = 'about:blank';
        setTimeout(() => {
            if (!isRunning) return;
            iframe.src = src;
            refreshCount++;
            viewCount.textContent = refreshCount;
            browserUrlEl.textContent = currentRawUrl;
            scheduleNext();
        }, 150);
    }

    function scheduleNext() {
        if (!isRunning) return;
        clearInterval(countdownTimer);
        clearTimeout(refreshTimeout);

        const min = parseInt(minInput.value) || 10;
        const max = parseInt(maxInput.value) || 50;
        const { seconds, msg } = getNextInterval(min, max, algoSelect.value);

        let left = seconds;
        countdownEl.textContent = left;
        log(`${msg} — next in ${seconds}s`);

        countdownTimer = setInterval(() => {
            left--;
            countdownEl.textContent = Math.max(0, left);
            if (left <= 0) clearInterval(countdownTimer);
        }, 1000);

        refreshTimeout = setTimeout(doRefresh, seconds * 1000);
    }

    function log(msg) {
        const ts = new Date().toLocaleTimeString();
        logText.textContent = `[${ts}] ${msg}`;
    }

    // ── Start / Stop ──────────────────────────────────────────────────────────
    startBtn.addEventListener('click', () => {
        let raw = urlInput.value.trim();
        if (!raw) return alert('Please enter a URL.');
        if (!raw.startsWith('http')) raw = 'https://' + raw;
        urlInput.value = raw;

        const min = parseInt(minInput.value);
        const max = parseInt(maxInput.value);
        if (min > max) return alert('Min interval must be ≤ Max interval.');

        const parsed = parseUrl(raw);
        currentRawUrl   = raw;
        currentEmbedUrl = parsed.embedUrl;

        // Reset state
        isRunning     = true;
        refreshCount  = 0;
        burstCounter  = 0;
        waveProgress  = 0;
        waveDirection = 1;

        startBtn.disabled = true;
        stopBtn.disabled  = false;
        [urlInput, minInput, maxInput, algoSelect].forEach(el => el.disabled = true);

        statusBox.classList.remove('hidden');
        framePlaceholder.style.display = 'none';
        viewCount.textContent  = 0;
        algoDisplay.textContent = algoSelect.options[algoSelect.selectedIndex].text.split(' ').slice(1, 3).join(' ');

        log(`Started [${parsed.label}]`);
        doRefresh();
    });

    stopBtn.addEventListener('click', () => {
        isRunning = false;
        clearInterval(countdownTimer);
        clearTimeout(refreshTimeout);

        startBtn.disabled = false;
        stopBtn.disabled  = true;
        [urlInput, minInput, maxInput, algoSelect].forEach(el => el.disabled = false);

        iframe.src = 'about:blank';
        framePlaceholder.style.display = 'flex';
        browserUrlEl.textContent = 'Stopped';
        countdownEl.textContent = '--';
        log(`Stopped after ${refreshCount} refreshes.`);
    });

    // ── Preset API ────────────────────────────────────────────────────────────
    async function loadPresets() {
        try {
            const res = await fetch('/api/presets');
            const presets = await res.json();
            renderPresets(presets);
        } catch {
            presetList.innerHTML = '<li class="hint-text" style="color:#f87171">⚠ Could not reach server.</li>';
        }
    }

    function renderPresets(presets) {
        if (!presets.length) {
            presetList.innerHTML = '<li class="hint-text">No presets saved yet.</li>';
            return;
        }
        presetList.innerHTML = '';
        presets.forEach(p => {
            const li = document.createElement('li');
            li.className = 'preset-item';
            const algoLabel = p.algorithm.charAt(0).toUpperCase() + p.algorithm.slice(1);
            li.innerHTML = `
                <div class="preset-info">
                    <h4>${p.name}</h4>
                    <span>${algoLabel} | ${p.min}s–${p.max}s</span>
                </div>
                <button class="del-btn" title="Delete preset">×</button>`;
            li.addEventListener('click', () => {
                if (isRunning) return alert('Stop the current run before loading a preset.');
                urlInput.value       = p.url;
                algoSelect.value     = p.algorithm;
                minInput.value       = p.min;
                maxInput.value       = p.max;
                // Trigger URL hint
                urlInput.dispatchEvent(new Event('input'));
                li.style.borderColor = '#6366f1';
                setTimeout(() => li.style.borderColor = '', 500);
            });
            li.querySelector('.del-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                await fetch(`/api/presets/${p.id}`, { method: 'DELETE' });
                loadPresets();
            });
            presetList.appendChild(li);
        });
    }

    savePresetBtn.addEventListener('click', async () => {
        const name = presetNameInput.value.trim();
        const url  = urlInput.value.trim();
        if (!name) return alert('Give your preset a name first.');
        if (!url)  return alert('Enter a URL first.');

        savePresetBtn.disabled = true;
        savePresetBtn.textContent = '…';
        try {
            const res = await fetch('/api/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, url,
                    algorithm: algoSelect.value,
                    min: parseInt(minInput.value) || 10,
                    max: parseInt(maxInput.value) || 50
                })
            });
            if (res.ok) {
                presetNameInput.value = '';
                loadPresets();
            }
        } catch {
            alert('Failed to save — is the server running?');
        } finally {
            savePresetBtn.disabled = false;
            savePresetBtn.textContent = 'Save';
        }
    });

    // Initial preset load
    loadPresets();
});
