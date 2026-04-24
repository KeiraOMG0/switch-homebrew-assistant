// State Management
let selectedDownloadDir = null;
let downloadItems = [];
let selectedDrive = null;
let logEntries = [];

// Component definitions for download - now includes Hekate and fusee.bin
const components = [
    { id: 'atmosphere', name: 'Atmosphère CFW', repo: 'Atmosphere-NX/Atmosphere', pattern: 'atmosphere', desc: 'Custom firmware core', sdPath: '/atmosphere/' },
    { id: 'hekate', name: 'Hekate Bootloader', repo: 'CTCaer/hekate', pattern: 'hekate_ctcaer', desc: 'Multifunctional bootloader (payload and SD tool)', sdPath: '/bootloader/' },
    { id: 'fusee', name: 'fusee.bin (Atmosphère payload)', repo: 'Atmosphere-NX/Atmosphere', pattern: 'fusee.bin', desc: 'Primary payload for booting Atmosphère directly', sdPath: '/bootloader/payloads/' },
    { id: 'hbmenu', name: 'Homebrew Menu', repo: 'switchbrew/nx-hbmenu', pattern: '.nro', desc: 'Homebrew launcher interface', sdPath: '/switch/' },
    { id: 'sigpatches', name: 'SigPatches (WARNING)', repo: 'ITotalJustice/patches', pattern: '.zip', desc: '⚠️ Allows unofficial software - use at own risk', sdPath: '/atmosphere/exefs_patches/' }
];

// Pre-Flight Acknowledgment
document.addEventListener('DOMContentLoaded', () => {
    const hasAcknowledged = localStorage.getItem('guide_acknowledged');
    if (hasAcknowledged === 'true') {
        document.getElementById('preflight-modal').style.display = 'none';
        document.querySelector('.app-container').style.display = 'flex';
        initializeApp();
    } else {
        document.getElementById('preflight-modal').style.display = 'flex';
        document.querySelector('.app-container').style.display = 'none';
        
        const checkbox = document.getElementById('guide-read-checkbox');
        const btn = document.getElementById('acknowledge-btn');
        checkbox.addEventListener('change', () => {
            btn.disabled = !checkbox.checked;
        });
        btn.addEventListener('click', () => {
            if (checkbox.checked) {
                localStorage.setItem('guide_acknowledged', 'true');
                document.getElementById('preflight-modal').style.display = 'none';
                document.querySelector('.app-container').style.display = 'flex';
                initializeApp();
            }
        });
    }
});

async function initializeApp() {
    addLog('info', 'Application initialized');
    setupNavigation();
    await loadSerialDB();
    setupDownloadTabs();
    renderBulkChecklist();
    renderManualList();
    setupSDCardHelper();
    setupLogExport();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.dataset.view + '-view';
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(viewId).classList.add('active');
        });
    });
}

async function loadSerialDB() {
    try {
        const db = await window.electronAPI.readSerialDB();
        window.serialDB = db;
        addLog('info', `Loaded compatibility database with ${db.serials.length} entries`);
    } catch (error) {
        addLog('error', `Failed to load serial database: ${error.message}`);
    }
}

function checkCompatibility() {
    const serialInput = document.getElementById('serial-input');
    const resultDiv = document.getElementById('compatibility-result');
    const resultContent = document.getElementById('result-content');
    const serial = serialInput.value.trim().toUpperCase();
    
    if (!serial || serial.length < 6) {
        resultContent.innerHTML = '<span class="error">Please enter at least 6 characters of your serial number.</span>';
        resultDiv.style.display = 'block';
        return;
    }
    
    let status = 'Unknown';
    let exploit = 'Unknown';
    let color = '#95a5a6';
    
    const prefix = serial.substring(0, 4);
    if (prefix === 'XAW1') {
        const num = parseInt(serial.substring(4, 8)) || 0;
        if (num < 7000) {
            status = 'Unpatched V1 (Hackable via RCM)';
            exploit = 'fusee-gelee / RCM jig';
            color = '#2ecc71';
        } else if (num < 9150) {
            status = 'Patched V1 (May be patched)';
            exploit = 'Check with payload tester';
            color = '#f39c12';
        } else {
            status = 'Patched V1 (Not hackable without modchip)';
            exploit = 'Hardware modchip required';
            color = '#e74c3c';
        }
    } else if (prefix === 'XAW7' || prefix === 'XAW9') {
        status = 'Switch V2 (Mariko)';
        exploit = 'Hardware modchip only';
        color = '#e74c3c';
    } else if (prefix === 'XKW1' || prefix === 'XKW2') {
        status = 'Switch Lite';
        exploit = 'Hardware modchip only (professional install)';
        color = '#e74c3c';
    } else if (prefix === 'XTE1') {
        status = 'Switch OLED';
        exploit = 'Hardware modchip only (professional install)';
        color = '#e74c3c';
    } else {
        status = 'Unknown serial format';
        exploit = 'Check official guide for verification';
        color = '#f39c12';
    }
    
    resultContent.innerHTML = `
        <div style="border-left: 4px solid ${color}; padding-left: 15px;">
            <p><strong>Serial:</strong> ${serial}</p>
            <p><strong>Status:</strong> <span style="color: ${color};">${status}</span></p>
            <p><strong>Recommended Exploit Path:</strong> ${exploit}</p>
            <p><small>For patched units, refer to professional modchip installers. This tool does not support software-only exploits for patched units.</small></p>
        </div>
    `;
    resultDiv.style.display = 'block';
}

document.getElementById('check-serial-btn')?.addEventListener('click', checkCompatibility);

function renderBulkChecklist() {
    const container = document.getElementById('bulk-checklist');
    container.innerHTML = components.map(comp => `
        <div class="checklist-item">
            <label>
                <input type="checkbox" value="${comp.id}" data-component="${comp.id}">
                <strong>${comp.name}</strong>
            </label>
            <div class="component-desc">${comp.desc}</div>
        </div>
    `).join('');
    
    const downloadBtn = document.getElementById('download-selected-btn');
    const selectDirBtn = document.getElementById('select-dir-btn');
    
    selectDirBtn.addEventListener('click', async () => {
        const dir = await window.electronAPI.selectDirectory();
        if (dir) {
            selectedDownloadDir = dir;
            document.getElementById('download-dir-display').innerHTML = `📁 Download directory: ${dir}`;
            downloadBtn.disabled = false;
            addLog('info', `Download directory set: ${dir}`);
        }
    });
    
    downloadBtn.addEventListener('click', async () => {
        if (!selectedDownloadDir) {
            addLog('warn', 'Please select a download directory first');
            return;
        }
        
        const selected = [];
        document.querySelectorAll('#bulk-checklist input:checked').forEach(cb => {
            const compId = cb.dataset.component;
            const comp = components.find(c => c.id === compId);
            if (comp) selected.push(comp);
        });
        
        if (selected.length === 0) {
            addLog('warn', 'No components selected for download');
            return;
        }
        
        await performBulkDownload(selected);
    });
}

async function performBulkDownload(components) {
    const progressDiv = document.getElementById('download-progress');
    const progressList = document.getElementById('progress-list');
    const summaryDiv = document.getElementById('download-summary');
    
    progressDiv.style.display = 'block';
    summaryDiv.style.display = 'none';
    progressList.innerHTML = '';
    
    const downloadItems = [];
    
    for (const comp of components) {
        addLog('info', `Fetching release info for ${comp.name}...`);
        const release = await window.electronAPI.getGithubRelease(comp.repo, comp.pattern);
        if (release) {
            downloadItems.push({
                id: comp.id,
                name: comp.name,
                url: release.url,
                version: release.version,
                sdPath: comp.sdPath
            });
            progressList.innerHTML += `
                <div class="progress-item" id="progress-${comp.id}">
                    <div>${comp.name} (${release.version})</div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="fill-${comp.id}" style="width: 0%">0%</div>
                    </div>
                </div>
            `;
        } else {
            addLog('error', `Could not fetch release for ${comp.name}`);
        }
    }
    
    if (downloadItems.length === 0) {
        addLog('error', 'No downloadable items found');
        progressDiv.style.display = 'none';
        return;
    }
    
    window.electronAPI.onDownloadProgress((data) => {
        const fill = document.getElementById(`fill-${data.id}`);
        if (fill) {
            fill.style.width = `${data.percent}%`;
            fill.textContent = `${data.percent}%`;
        }
    });
    
    addLog('info', `Starting download of ${downloadItems.length} items to ${selectedDownloadDir}`);
    const results = await window.electronAPI.downloadFiles(downloadItems, selectedDownloadDir);
    
    let summaryHtml = '<h4>Download Summary:</h4><ul>';
    for (const result of results) {
        if (result.success) {
            summaryHtml += `<li style="color: #2ecc71">✓ ${result.name}: ${result.path}<br>SHA-256: <code>${result.checksum}</code><br>SD Path: ${components.find(c => c.id === result.id)?.sdPath || '/'}</li>`;
            addLog('download', `Downloaded ${result.name} to ${result.path} | SHA-256: ${result.checksum}`);
        } else {
            summaryHtml += `<li style="color: #e74c3c">✗ ${result.name}: ${result.error}</li>`;
            addLog('error', `Failed to download ${result.name}: ${result.error}`);
        }
    }
    summaryHtml += '</ul><p><strong>Important:</strong> Always verify checksums against official sources before using.</p>';
    summaryDiv.innerHTML = summaryHtml;
    summaryDiv.style.display = 'block';
    progressDiv.style.display = 'none';
}

function renderManualList() {
    const container = document.getElementById('manual-list');
    container.innerHTML = components.map(comp => `
        <div class="manual-item">
            <div class="manual-header" data-id="${comp.id}">
                <strong>${comp.name}</strong>
                <span>▼</span>
            </div>
            <div class="manual-details" id="details-${comp.id}">
                <p><strong>Description:</strong> ${comp.desc}</p>
                <p><strong>Official Source:</strong> <a href="https://github.com/${comp.repo}" target="_blank">github.com/${comp.repo}</a></p>
                <p><strong>SD Card Installation Path:</strong> <code>${comp.sdPath}</code></p>
                <p><strong>Why do I need this?</strong><br>${getWhyExplanation(comp.id)}</p>
                <p><strong>Verification:</strong> Always verify downloaded files using SHA-256 checksums from official release pages.</p>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.manual-header').forEach(header => {
        header.addEventListener('click', () => {
            const id = header.dataset.id;
            const details = document.getElementById(`details-${id}`);
            details.classList.toggle('expanded');
        });
    });
}

function getWhyExplanation(compId) {
    const explanations = {
        'atmosphere': 'Atmosphère is the core custom firmware that enables homebrew execution and provides system patches.',
        'hekate': 'Hekate is a bootloader that allows you to launch different firmwares, create emuMMC, and perform NAND backups. Place the .bin file in /bootloader/ and launch it as a payload.',
        'fusee': 'fusee.bin is the primary payload for Atmosphère. You can inject it directly or place it in /bootloader/payloads/ to launch via Hekate.',
        'hbmenu': 'The Homebrew Menu provides a graphical interface for launching homebrew applications from your SD card.',
        'sigpatches': '⚠️ SigPatches bypass signature checks, allowing installation of unofficial software. Only install if you understand the security implications.'
    };
    return explanations[compId] || 'Essential component for Switch homebrew functionality.';
}

function setupDownloadTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const bulkMode = document.getElementById('bulk-mode');
    const manualMode = document.getElementById('manual-mode');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (mode === 'bulk') {
                bulkMode.style.display = 'block';
                manualMode.style.display = 'none';
            } else {
                bulkMode.style.display = 'none';
                manualMode.style.display = 'block';
            }
        });
    });
}

function setupSDCardHelper() {
    const scanBtn = document.getElementById('scan-drives-btn');
    const driveList = document.getElementById('drive-list');
    const dragZone = document.getElementById('drag-zone');
    
    scanBtn.addEventListener('click', async () => {
        addLog('info', 'Scanning for SD cards...');
        const drives = await window.electronAPI.getDrives();
        driveList.innerHTML = drives.map(drive => `
            <div class="drive-card" data-mount="${drive.mountpoint}">
                <strong>${drive.mountpoint}</strong><br>
                ${(drive.size / 1e9).toFixed(1)} GB - ${drive.description}
                ${drive.size < 128e9 ? '<span style="color:#f39c12"> (Warning: <128GB for emuMMC)</span>' : ''}
            </div>
        `).join('');
        
        document.querySelectorAll('.drive-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.drive-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedDrive = card.dataset.mount;
                addLog('info', `Selected SD card: ${selectedDrive}`);
            });
        });
    });
    
    dragZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragZone.classList.add('drag-over');
    });
    
    dragZone.addEventListener('dragleave', () => {
        dragZone.classList.remove('drag-over');
    });
    
    dragZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dragZone.classList.remove('drag-over');
        
        if (!selectedDrive) {
            addLog('warn', 'Please select an SD card drive first');
            return;
        }
        
        const files = Array.from(e.dataTransfer.files);
        for (const file of files) {
            let destPath = `${selectedDrive}/`;
            if (file.name.includes('hekate')) destPath += 'bootloader/';
            else if (file.name.includes('fusee')) destPath += 'bootloader/payloads/';
            else if (file.name.includes('atmosphere') || file.name.endsWith('.nsp')) destPath += 'atmosphere/';
            else if (file.name.endsWith('.nro')) destPath += 'switch/';
            else destPath += 'downloads/';
            
            destPath = destPath.replace('//', '/') + file.name;
            
            const result = await window.electronAPI.copyFileToSD(file.path, destPath);
            if (result.success) {
                addLog('info', `Copied ${file.name} to ${result.destPath}`);
                document.getElementById('copy-results').innerHTML += `<div style="color:#2ecc71">✓ Copied: ${file.name} → ${result.destPath}</div>`;
            } else {
                addLog('error', `Failed to copy ${file.name}: ${result.error}`);
                document.getElementById('copy-results').innerHTML += `<div style="color:#e74c3c">✗ Failed: ${file.name}</div>`;
            }
        }
    });
}

function setupLogExport() {
    const exportBtn = document.getElementById('export-logs-btn');
    const clearBtn = document.getElementById('clear-logs-btn');
    const logConsole = document.getElementById('log-console');
    
    exportBtn.addEventListener('click', async () => {
        const path = await window.electronAPI.exportLogs();
        if (path) {
            addLog('info', `Logs exported to ${path}`);
        }
    });
    
    clearBtn.addEventListener('click', () => {
        logConsole.innerHTML = '';
        logEntries = [];
    });
}

function addLog(type, message) {
    const logConsole = document.getElementById('log-console');
    const timestamp = new Date().toLocaleTimeString();
    const entry = { type, message, timestamp };
    logEntries.push(entry);
    
    const logDiv = document.createElement('div');
    logDiv.className = `log-entry log-${type}`;
    logDiv.textContent = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    logConsole.appendChild(logDiv);
    logConsole.scrollTop = logConsole.scrollHeight;
    
    window.electronAPI.logAction({ type, message }).catch(console.error);
}