document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const urlInput = document.getElementById('target-url');
    const algoSelect = document.getElementById('algorithm-select');
    const minInput = document.getElementById('min-interval');
    const maxInput = document.getElementById('max-interval');
    
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const statusContainer = document.getElementById('status-container');
    const countdownEl = document.getElementById('countdown');
    const logText = document.getElementById('log-text');
    
    const iframe = document.getElementById('target-frame');
    const iframePlaceholder = document.getElementById('iframe-placeholder');
    const browserUrlDisplay = document.getElementById('browser-url-display');

    const presetNameInput = document.getElementById('preset-name');
    const savePresetBtn = document.getElementById('save-preset-btn');
    const presetList = document.getElementById('preset-list');

    // Engine State
    let isRunning = false;
    let countdownTimer = null;
    let refreshTimeout = null;
    let currentTarget = '';
    let refreshCount = 0;
    let burstCounter = 0;
    let waveDirection = 1;
    let currentWaveProgress = 0;

    // --- API & Database Logic ---
    
    async function loadPresets() {
        try {
            const res = await fetch('/api/presets');
            if (!res.ok) throw new Error('Failed to fetch');
            const presets = await res.json();
            renderPresets(presets);
        } catch (err) {
            presetList.innerHTML = '<li class="loading-text">Server not responding. Run the backend!</li>';
            console.error('API Error:', err);
        }
    }

    async function savePreset() {
        const name = presetNameInput.value.trim();
        if (!name) return alert("Please enter a name for the preset.");
        if (!urlInput.value.trim()) return alert("Target URL is required to save a preset.");

        const presetData = {
            name: name,
            url: urlInput.value.trim(),
            algorithm: algoSelect.value,
            min: parseInt(minInput.value) || 10,
            max: parseInt(maxInput.value) || 50
        };

        savePresetBtn.disabled = true;
        savePresetBtn.textContent = '...';

        try {
            const res = await fetch('/api/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(presetData)
            });
            if (res.ok) {
                presetNameInput.value = '';
                await loadPresets();
            }
        } catch (err) {
            alert("Failed to save preset. Is the backend running?");
        } finally {
            savePresetBtn.disabled = false;
            savePresetBtn.textContent = 'Save';
        }
    }

    async function deletePreset(id, e) {
        e.stopPropagation(); // Prevent loading the preset when clicking delete
        try {
            await fetch(`/api/presets/${id}`, { method: 'DELETE' });
            await loadPresets();
        } catch (err) {
            console.error(err);
        }
    }

    function renderPresets(presets) {
        if (presets.length === 0) {
            presetList.innerHTML = '<li class="loading-text">No saved presets yet.</li>';
            return;
        }

        presetList.innerHTML = '';
        presets.forEach(p => {
            const li = document.createElement('li');
            li.className = 'preset-item';
            li.innerHTML = `
                <div class="preset-info">
                    <h4>${p.name}</h4>
                    <span>${p.algorithm.toUpperCase()} | ${p.min}s - ${p.max}s</span>
                </div>
                <button class="delete-btn" title="Delete">×</button>
            `;
            
            // Load preset
            li.addEventListener('click', () => {
                if (isRunning) return alert("Stop the current run before loading a preset.");
                urlInput.value = p.url;
                algoSelect.value = p.algorithm;
                minInput.value = p.min;
                maxInput.value = p.max;
                
                // Highlight briefly
                li.style.borderColor = '#6366f1';
                setTimeout(() => li.style.borderColor = '', 300);
            });

            // Delete preset
            li.querySelector('.delete-btn').addEventListener('click', (e) => deletePreset(p.id, e));
            
            presetList.appendChild(li);
        });
    }

    savePresetBtn.addEventListener('click', savePreset);
    loadPresets(); // Initial load

    // --- Refresh Engine Logic ---

    function getNextInterval(min, max, algorithm) {
        let nextInterval = min;
        let specialMessage = null;

        switch (algorithm) {
            case 'casual':
                const r1 = Math.random(), r2 = Math.random(), r3 = Math.random();
                nextInterval = Math.floor(((r1 + r2 + r3) / 3) * (max - min + 1)) + min;
                if (Math.random() < 0.15) {
                    nextInterval += Math.floor(Math.random() * 60) + 30;
                    specialMessage = "Taking a casual coffee break...";
                }
                break;
            case 'aggressive':
                const aggRandom = Math.pow(Math.random(), 2);
                nextInterval = Math.floor(aggRandom * (max - min + 1)) + min;
                break;
            case 'burst':
                burstCounter++;
                if (burstCounter >= 5) {
                    burstCounter = 0;
                    nextInterval = max + Math.floor(Math.random() * 60) + 60;
                    specialMessage = "Burst complete. Taking a long rest...";
                } else {
                    nextInterval = min + Math.floor(Math.random() * 3);
                    specialMessage = `Rapid burst ${burstCounter}/5...`;
                }
                break;
            case 'wave':
                currentWaveProgress += (0.1 * waveDirection);
                if (currentWaveProgress >= 1) { currentWaveProgress = 1; waveDirection = -1; }
                else if (currentWaveProgress <= 0) { currentWaveProgress = 0; waveDirection = 1; }
                const easeProgress = currentWaveProgress < 0.5 ? 2 * currentWaveProgress * currentWaveProgress : -1 + (4 - 2 * currentWaveProgress) * currentWaveProgress;
                nextInterval = min + Math.floor(easeProgress * (max - min));
                specialMessage = waveDirection === 1 ? "Wave: Slowing down..." : "Wave: Speeding up...";
                break;

            case 'spike':
                // 20% chance of a very fast turbo spike
                if (Math.random() < 0.20) {
                    nextInterval = Math.max(1, min - Math.floor(Math.random() * Math.floor(min / 2)));
                    specialMessage = "⚡ Turbo spike!";
                } else {
                    const spikeR = (Math.random() + Math.random()) / 2;
                    nextInterval = Math.floor(spikeR * (max - min + 1)) + min;
                    specialMessage = "Normal paced";
                }
                break;
        }
        return { seconds: Math.max(1, nextInterval), message: specialMessage };
    }

    function updateLog(message) {
        logText.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    }

    function refreshFrame() {
        if (!isRunning) return;
        const token = Math.random().toString(36).substring(2, 15);
        const cacheBuster = currentTarget.includes('?') ? `&_cb=${Date.now()}&_rt=${token}` : `?_cb=${Date.now()}&_rt=${token}`;
        
        iframe.src = 'about:blank';
        setTimeout(() => {
            if (!isRunning) return;
            iframe.src = currentTarget + cacheBuster;
            refreshCount++;
            browserUrlDisplay.textContent = currentTarget;
            scheduleNextRefresh();
        }, 100);
    }

    function scheduleNextRefresh() {
        if (!isRunning) return;
        const min = parseInt(minInput.value) || 10;
        const max = parseInt(maxInput.value) || 50;
        const intervalData = getNextInterval(min, max, algoSelect.value);
        let secondsLeft = intervalData.seconds;
        
        countdownEl.textContent = secondsLeft;
        updateLog(intervalData.message ? `${intervalData.message} Next in ${secondsLeft}s. (Views: ${refreshCount})` : `Normal interval. Next in ${secondsLeft}s. (Views: ${refreshCount})`);

        clearInterval(countdownTimer);
        clearTimeout(refreshTimeout);

        countdownTimer = setInterval(() => {
            secondsLeft--;
            countdownEl.textContent = Math.max(0, secondsLeft);
            if (secondsLeft <= 0) clearInterval(countdownTimer);
        }, 1000);

        refreshTimeout = setTimeout(refreshFrame, intervalData.seconds * 1000);
    }

    startBtn.addEventListener('click', () => {
        let url = urlInput.value.trim();
        if (!url) return alert('Please enter a target URL.');
        if (!url.startsWith('http')) url = 'https://' + url;
        urlInput.value = url;

        if (parseInt(minInput.value) > parseInt(maxInput.value)) return alert('Min > Max error.');

        isRunning = true; currentTarget = url; refreshCount = 0; burstCounter = 0;
        
        startBtn.disabled = true; stopBtn.disabled = false;
        [urlInput, minInput, maxInput, algoSelect].forEach(el => el.disabled = true);

        statusContainer.classList.remove('hidden');
        iframe.classList.add('active');
        iframePlaceholder.style.display = 'none';

        updateLog(`Started [${algoSelect.options[algoSelect.selectedIndex].text}]`);
        refreshFrame();
    });

    stopBtn.addEventListener('click', () => {
        isRunning = false;
        clearInterval(countdownTimer); clearTimeout(refreshTimeout);
        
        startBtn.disabled = false; stopBtn.disabled = true;
        [urlInput, minInput, maxInput, algoSelect].forEach(el => el.disabled = false);

        countdownEl.textContent = '--';
        updateLog(`Stopped. Total successful refreshes: ${refreshCount}`);
        
        iframe.classList.remove('active');
        iframe.src = 'about:blank';
        iframePlaceholder.style.display = 'flex';
        browserUrlDisplay.textContent = 'Stopped';
    });
});
