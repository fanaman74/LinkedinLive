/**
 * LinkedIn Radar — Frontend Controller & State Machine (v2.5)
 * Includes Watchlist Modification (CRUD, Import, Export) & Pinloop Hero Canvas
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Pinloop Hero Canvas Animation
  if (typeof window.initHeroField === 'function') {
    window.initHeroField();
  }

  // Application State
  const state = {
    keywords: 'IT Manager, Digital Transformation',
    location: 'Belgium',
    seconds: 3600, // 1 hour default
    sortBy: 'DD',  // Date Descending default
    workType: '',  // Any workplace
    expLevels: [],
    easyApply: false,
    autoPoll: false,
    autoPollIntervalId: null,
    pollCountdown: 60,
    pollTimerId: null,
    savedSearches: []
  };

  // DOM Elements Cache
  const el = {
    searchForm: document.getElementById('searchForm'),
    keywordsInput: document.getElementById('keywordsInput'),
    locationInput: document.getElementById('locationInput'),
    booleanHelperBtn: document.getElementById('booleanHelperBtn'),
    booleanHelperPanel: document.getElementById('booleanHelperPanel'),
    closeBooleanBtn: document.getElementById('closeBooleanBtn'),
    timePresetsContainer: document.getElementById('timePresetsContainer'),
    customTimeBtn: document.getElementById('customTimeBtn'),
    customTimeRow: document.getElementById('customTimeRow'),
    customSecondsSlider: document.getElementById('customSecondsSlider'),
    customSecondsDisplay: document.getElementById('customSecondsDisplay'),
    customHumanDisplay: document.getElementById('customHumanDisplay'),
    workplaceContainer: document.getElementById('workplaceContainer'),
    sortContainer: document.getElementById('sortContainer'),
    experienceContainer: document.getElementById('experienceContainer'),
    easyApplyToggle: document.getElementById('easyApplyToggle'),
    autoPollToggle: document.getElementById('autoPollToggle'),
    searchBtn: document.getElementById('searchBtn'),
    openLinkedInBtn: document.getElementById('openLinkedInBtn'),
    copyUrlBtn: document.getElementById('copyUrlBtn'),
    copyUrlText: document.getElementById('copyUrlText'),
    blitzBtn: document.getElementById('blitzBtn'),
    saveSearchBtn: document.getElementById('saveSearchBtn'),
    savedSearchesBtn: document.getElementById('savedSearchesBtn'),
    savedCount: document.getElementById('savedCount'),
    savedDrawer: document.getElementById('savedDrawer'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    savedListContainer: document.getElementById('savedListContainer'),
    newPresetBtn: document.getElementById('newPresetBtn'),
    exportWatchlistBtn: document.getElementById('exportWatchlistBtn'),
    importWatchlistBtn: document.getElementById('importWatchlistBtn'),
    importFileInput: document.getElementById('importFileInput'),
    // Edit Modal Elements
    editPresetModal: document.getElementById('editPresetModal'),
    editModalTitle: document.getElementById('editModalTitle'),
    closeEditModalBtn: document.getElementById('closeEditModalBtn'),
    cancelEditModalBtn: document.getElementById('cancelEditModalBtn'),
    editPresetForm: document.getElementById('editPresetForm'),
    editPresetId: document.getElementById('editPresetId'),
    editPresetName: document.getElementById('editPresetName'),
    editPresetKeywords: document.getElementById('editPresetKeywords'),
    editPresetLocation: document.getElementById('editPresetLocation'),
    editTimeContainer: document.getElementById('editTimeContainer'),
    editPresetSeconds: document.getElementById('editPresetSeconds'),
    editPresetWorkType: document.getElementById('editPresetWorkType'),
    editPresetSortBy: document.getElementById('editPresetSortBy'),
    editExpContainer: document.getElementById('editExpContainer'),
    editPresetEasyApply: document.getElementById('editPresetEasyApply'),
    // Preview & Board
    copyCliBtn: document.getElementById('copyCliBtn'),
    cliCommandText: document.getElementById('cliCommandText'),
    liveGeneratedUrl: document.getElementById('liveGeneratedUrl'),
    boardCountBadge: document.getElementById('boardCountBadge'),
    metaTimeWindow: document.getElementById('metaTimeWindow'),
    metaSort: document.getElementById('metaSort'),
    metaAutoRefresh: document.getElementById('metaAutoRefresh'),
    jobRowsContainer: document.getElementById('jobRowsContainer'),
    loadingState: document.getElementById('loadingState'),
    loadingTimeParam: document.getElementById('loadingTimeParam'),
    initialState: document.getElementById('initialState'),
    toastNotification: document.getElementById('toastNotification'),
    toastMessage: document.getElementById('toastMessage')
  };

  // Initialize
  loadSavedSearches();
  updateUrlAndCliPreviews();

  // =========================================================================
  // Event Listeners: Inputs & Filters
  // =========================================================================

  el.keywordsInput.addEventListener('input', (e) => {
    state.keywords = e.target.value;
    updateUrlAndCliPreviews();
  });

  el.locationInput.addEventListener('input', (e) => {
    state.location = e.target.value;
    updateUrlAndCliPreviews();
  });

  [el.keywordsInput, el.locationInput].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
      }
    });
  });

  // Time preset buttons
  el.timePresetsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.time-pill');
    if (!btn) return;

    el.timePresetsContainer.querySelectorAll('.time-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const secVal = btn.dataset.seconds;
    if (secVal === 'custom') {
      el.customTimeRow.classList.remove('hidden');
      state.seconds = Number(el.customSecondsSlider.value);
    } else {
      el.customTimeRow.classList.add('hidden');
      state.seconds = Number(secVal);
    }

    updateUrlAndCliPreviews();
  });

  // Custom Seconds Slider
  el.customSecondsSlider.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    state.seconds = val;
    el.customSecondsDisplay.textContent = val;
    const hrs = (val / 3600).toFixed(1);
    el.customHumanDisplay.textContent = `${hrs} hr${hrs === '1.0' ? '' : 's'}`;
    updateUrlAndCliPreviews();
  });

  // Workplace pills
  el.workplaceContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;

    el.workplaceContainer.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.workType = btn.dataset.wt || '';
    updateUrlAndCliPreviews();
  });

  // Sort Order pills
  el.sortContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;

    el.sortContainer.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.sortBy = btn.dataset.sort || 'DD';
    updateUrlAndCliPreviews();
  });

  // Experience Level pills (Multi-select)
  el.experienceContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;

    const expId = btn.dataset.exp;
    if (state.expLevels.includes(expId)) {
      state.expLevels = state.expLevels.filter(x => x !== expId);
      btn.classList.remove('active');
    } else {
      state.expLevels.push(expId);
      btn.classList.add('active');
    }
    updateUrlAndCliPreviews();
  });

  // Easy Apply Toggle
  el.easyApplyToggle.addEventListener('change', (e) => {
    state.easyApply = e.target.checked;
    updateUrlAndCliPreviews();
  });

  // Auto Poll Toggle
  el.autoPollToggle.addEventListener('change', (e) => {
    state.autoPoll = e.target.checked;
    if (state.autoPoll) {
      startAutoPoll();
      showToast('Live Radar Polling activated (60s)');
    } else {
      stopAutoPoll();
      showToast('Live Radar Polling paused');
    }
  });

  // Boolean helper modal
  el.booleanHelperBtn.addEventListener('click', () => {
    el.booleanHelperPanel.classList.toggle('hidden');
  });

  el.closeBooleanBtn.addEventListener('click', () => {
    el.booleanHelperPanel.classList.add('hidden');
  });

  document.querySelectorAll('.bool-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const insertText = chip.dataset.insert;
      if (insertText) {
        el.keywordsInput.value = (el.keywordsInput.value + ' ' + insertText).trim();
        state.keywords = el.keywordsInput.value;
        updateUrlAndCliPreviews();
        el.keywordsInput.focus();
      }
    });
  });

  // =========================================================================
  // Primary Actions: Search, Direct LinkedIn, Copy, Blitz
  // =========================================================================

  el.searchBtn.addEventListener('click', () => {
    performSearch();
  });

  el.openLinkedInBtn.addEventListener('click', () => {
    const webUrl = window.URLBuilder.buildLinkedInWebUrl(state);
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  });

  el.copyUrlBtn.addEventListener('click', () => {
    const webUrl = window.URLBuilder.buildLinkedInWebUrl(state);
    navigator.clipboard.writeText(webUrl).then(() => {
      el.copyUrlText.textContent = 'Copied!';
      showToast('Hacked LinkedIn URL copied to clipboard');
      setTimeout(() => {
        el.copyUrlText.textContent = 'Copy URL';
      }, 2000);
    });
  });

  el.copyCliBtn.addEventListener('click', () => {
    const cmd = el.cliCommandText.textContent;
    navigator.clipboard.writeText(cmd).then(() => {
      showToast('CLI command copied');
    });
  });

  el.blitzBtn.addEventListener('click', () => {
    const blitz = window.URLBuilder.generateBlitzUrls(state);
    let opened = 0;
    blitz.forEach((item, index) => {
      setTimeout(() => {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }, index * 250);
      opened++;
    });
    showToast(`Launching ${opened} parallel search windows (15m, 1h, 4h)...`);
  });

  el.saveSearchBtn.addEventListener('click', () => {
    openEditModal(null);
  });

  // Watchlist drawer toggle
  el.savedSearchesBtn.addEventListener('click', () => {
    renderSavedDrawer();
    el.savedDrawer.classList.remove('hidden');
  });

  el.closeDrawerBtn.addEventListener('click', () => {
    el.savedDrawer.classList.add('hidden');
  });

  // Drawer panel stop propagation & robust overlay dismiss
  const drawerPanel = el.savedDrawer.querySelector('.drawer-panel');
  if (drawerPanel) {
    drawerPanel.addEventListener('click', (e) => e.stopPropagation());
    drawerPanel.addEventListener('mousedown', (e) => e.stopPropagation());
  }

  let drawerMouseDownTarget = null;
  el.savedDrawer.addEventListener('mousedown', (e) => {
    drawerMouseDownTarget = e.target;
  });
  el.savedDrawer.addEventListener('mouseup', (e) => {
    if (drawerMouseDownTarget === el.savedDrawer && e.target === el.savedDrawer) {
      el.savedDrawer.classList.add('hidden');
    }
    drawerMouseDownTarget = null;
  });

  // =========================================================================
  // Watchlist Toolbar Actions (New, Export, Import)
  // =========================================================================

  el.newPresetBtn.addEventListener('click', () => {
    openEditModal(null);
  });

  el.exportWatchlistBtn.addEventListener('click', () => {
    exportWatchlist();
  });

  el.importWatchlistBtn.addEventListener('click', () => {
    el.importFileInput.click();
  });

  el.importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          state.savedSearches = imported;
          saveSearchesToStorage();
          renderSavedDrawer();
          updateSavedBadge();
          showToast(`Successfully imported ${imported.length} watchlist presets`);
        } else {
          showToast('Invalid watchlist JSON format');
        }
      } catch (err) {
        showToast('Error parsing JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // =========================================================================
  // Watchlist Edit Modal Controller
  // =========================================================================

  let modalSelectedExpLevels = [];

  function openEditModal(preset = null) {
    // Hide drawer to avoid double-overlay conflicts
    el.savedDrawer.classList.add('hidden');

    if (preset) {
      el.editModalTitle.textContent = 'EDIT SEARCH PRESET';
      el.editPresetId.value = preset.id;
      el.editPresetName.value = preset.name || '';
      el.editPresetKeywords.value = preset.keywords || '';
      el.editPresetLocation.value = preset.location || '';
      el.editPresetSeconds.value = preset.seconds || 3600;
      el.editPresetWorkType.value = preset.workType || '';
      el.editPresetSortBy.value = preset.sortBy || 'DD';
      el.editPresetEasyApply.checked = Boolean(preset.easyApply);
      modalSelectedExpLevels = Array.isArray(preset.expLevels) ? [...preset.expLevels] : [];
    } else {
      el.editModalTitle.textContent = 'SAVE TO WATCHLIST';
      el.editPresetId.value = '';
      el.editPresetName.value = `${state.keywords} (< ${Math.round(state.seconds / 60)}m)`;
      el.editPresetKeywords.value = state.keywords;
      el.editPresetLocation.value = state.location;
      el.editPresetSeconds.value = state.seconds;
      el.editPresetWorkType.value = state.workType;
      el.editPresetSortBy.value = state.sortBy;
      el.editPresetEasyApply.checked = state.easyApply;
      modalSelectedExpLevels = [...state.expLevels];
    }

    // Update modal time pills
    const currentSec = String(el.editPresetSeconds.value);
    el.editTimeContainer.querySelectorAll('.time-pill').forEach(b => {
      b.classList.toggle('active', b.dataset.sec === currentSec);
    });

    // Update modal exp pills
    el.editExpContainer.querySelectorAll('.filter-pill').forEach(b => {
      b.classList.toggle('active', modalSelectedExpLevels.includes(b.dataset.exp));
    });

    el.editPresetModal.classList.remove('hidden');

    // Auto-focus and select all text in the name field so user can type immediately
    setTimeout(() => {
      el.editPresetName.focus();
      el.editPresetName.select();
    }, 60);
  }

  el.closeEditModalBtn.addEventListener('click', () => {
    el.editPresetModal.classList.add('hidden');
  });

  el.cancelEditModalBtn.addEventListener('click', () => {
    el.editPresetModal.classList.add('hidden');
  });

  // Prevent clicks inside modal-panel from bubbling to the overlay backdrop
  const modalPanel = el.editPresetModal.querySelector('.modal-panel');
  if (modalPanel) {
    modalPanel.addEventListener('click', (e) => e.stopPropagation());
    modalPanel.addEventListener('mousedown', (e) => e.stopPropagation());
  }

  // Backdrop overlay click tracking: only close if mousedown and mouseup both hit the backdrop
  let modalMouseDownTarget = null;
  el.editPresetModal.addEventListener('mousedown', (e) => {
    modalMouseDownTarget = e.target;
  });
  el.editPresetModal.addEventListener('mouseup', (e) => {
    if (modalMouseDownTarget === el.editPresetModal && e.target === el.editPresetModal) {
      el.editPresetModal.classList.add('hidden');
    }
    modalMouseDownTarget = null;
  });

  // Global Escape key listener to close active overlays
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!el.editPresetModal.classList.contains('hidden')) {
        el.editPresetModal.classList.add('hidden');
      } else if (!el.savedDrawer.classList.contains('hidden')) {
        el.savedDrawer.classList.add('hidden');
      } else if (!el.booleanHelperPanel.classList.contains('hidden')) {
        el.booleanHelperPanel.classList.add('hidden');
      }
    }
  });

  // Modal time pill selection
  el.editTimeContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.time-pill');
    if (!btn) return;
    el.editTimeContainer.querySelectorAll('.time-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    el.editPresetSeconds.value = btn.dataset.sec;
  });

  // Modal exp pills
  el.editExpContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;
    const exp = btn.dataset.exp;
    if (modalSelectedExpLevels.includes(exp)) {
      modalSelectedExpLevels = modalSelectedExpLevels.filter(x => x !== exp);
      btn.classList.remove('active');
    } else {
      modalSelectedExpLevels.push(exp);
      btn.classList.add('active');
    }
  });

  // Save Modal Form
  el.editPresetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const presetId = el.editPresetId.value;
    const presetName = el.editPresetName.value.trim() || 'Custom Search';

    const presetData = {
      name: presetName,
      keywords: el.editPresetKeywords.value.trim(),
      location: el.editPresetLocation.value.trim(),
      seconds: Number(el.editPresetSeconds.value) || 3600,
      workType: el.editPresetWorkType.value,
      sortBy: el.editPresetSortBy.value,
      expLevels: [...modalSelectedExpLevels],
      easyApply: el.editPresetEasyApply.checked
    };

    if (presetId) {
      // Update existing
      const index = state.savedSearches.findIndex(s => s.id === presetId);
      if (index !== -1) {
        state.savedSearches[index] = { ...state.savedSearches[index], ...presetData };
        showToast(`Updated preset "${presetName}"`);
      }
    } else {
      // Create new
      const newPreset = {
        id: String(Date.now()),
        ...presetData
      };
      state.savedSearches.unshift(newPreset);
      showToast(`Created preset "${presetName}"`);
    }

    saveSearchesToStorage();
    renderSavedDrawer();
    updateSavedBadge();
    el.editPresetModal.classList.add('hidden');
  });

  // =========================================================================
  // Core Functions: Previews, Search Execution, and Rendering
  // =========================================================================

  function updateUrlAndCliPreviews() {
    const webUrl = window.URLBuilder.buildLinkedInWebUrl(state);
    const cliCmd = window.URLBuilder.formatCliCommand(state);

    el.liveGeneratedUrl.textContent = webUrl;
    el.cliCommandText.textContent = cliCmd;

    const sec = Number(state.seconds);
    const presetLabel = window.URLBuilder.TIME_PRESETS[String(sec)];
    if (presetLabel) {
      el.metaTimeWindow.textContent = `WINDOW: < ${presetLabel.toUpperCase()}`;
    } else {
      el.metaTimeWindow.textContent = `WINDOW: < ${Math.round(sec / 60)}M`;
    }

    el.metaSort.textContent = `SORT: ${state.sortBy === 'DD' ? 'DD (DATE DESC)' : 'RELEVANCE'}`;
    el.loadingTimeParam.textContent = `r${state.seconds}`;
  }

  async function performSearch(isAutoPoll = false) {
    if (!isAutoPoll) {
      el.loadingState.classList.remove('hidden');
    }

    const apiUrl = window.URLBuilder.buildApiUrl(state);

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      el.loadingState.classList.add('hidden');

      if (!response.ok || !data.success) {
        handleSearchError(data.error || 'Unable to stream jobs from LinkedIn endpoint.', data.directUrl);
        return;
      }

      renderJobs(data.jobs, data.directUrl);
      el.boardCountBadge.textContent = `${data.jobs.length} FOUND`;

      if (isAutoPoll && data.jobs.length > 0) {
        showToast(`Radar update: ${data.jobs.length} jobs in window < ${state.seconds / 60}m`);
      }

    } catch (err) {
      console.error('Fetch error:', err);
      el.loadingState.classList.add('hidden');
      handleSearchError('Network error connecting to scraper service.', window.URLBuilder.buildLinkedInWebUrl(state));
    }
  }

  function renderJobs(jobs, directUrl) {
    el.jobRowsContainer.innerHTML = '';

    if (!jobs || jobs.length === 0) {
      el.jobRowsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-glyph">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <h3 class="empty-title">Zero Postings in Window (${el.metaTimeWindow.textContent})</h3>
          <p class="empty-text">No listings were dropped in the last ${Math.round(state.seconds / 60)} minutes for this query. Expand your time window to 2h or 4h, or view broader results on LinkedIn:</p>
          <a href="${directUrl}" target="_blank" rel="noopener" class="cta-btn secondary-cta" style="margin-top: 14px;">
            Open on LinkedIn (Browser Search)
          </a>
        </div>
      `;
      return;
    }

    jobs.forEach((job, index) => {
      const row = document.createElement('div');
      row.className = 'job-row arrival';
      row.style.animationDelay = `${index * 50}ms`;

      const initial = (job.company || 'C').charAt(0).toUpperCase();

      const logoHtml = job.logo
        ? `<img src="${job.logo}" alt="${escapeHtml(job.company)}" onerror="this.parentElement.innerHTML='<span class=\\'company-logo-fallback\\'>${initial}</span>'" />`
        : `<span class="company-logo-fallback">${initial}</span>`;

      const freshnessHtml = job.isUltraRecent
        ? `<span class="ultra-fresh-badge">${job.time}</span>`
        : `<span>${job.time}</span>`;

      row.innerHTML = `
        <div class="col-company">
          <div class="company-logo">
            ${logoHtml}
          </div>
          <div class="company-name" title="${escapeHtml(job.company)}">${escapeHtml(job.company)}</div>
        </div>

        <div class="col-role-details">
          <a href="${job.link}" target="_blank" rel="noopener" class="job-title-link" title="${escapeHtml(job.title)}">
            ${escapeHtml(job.title)}
          </a>
          <div class="job-location">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${escapeHtml(job.location)}</span>
          </div>
        </div>

        <div class="col-time">
          ${freshnessHtml}
        </div>

        <div class="col-actions">
          <a href="${job.link}" target="_blank" rel="noopener" class="apply-btn" title="View & Apply on LinkedIn">
            <span>Apply</span>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      `;

      el.jobRowsContainer.appendChild(row);
    });
  }

  function handleSearchError(errorMsg, directUrl) {
    el.boardCountBadge.textContent = 'RESTRICTED';
    el.jobRowsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-glyph" style="color: #f59e0b;">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 class="empty-title">LinkedIn Rate-Limit Guard</h3>
        <p class="empty-text">${escapeHtml(errorMsg)}</p>
        <p class="empty-text" style="margin-top: 6px;">Your precision-hacked URL is ready. Click below to view the latest jobs directly in your browser:</p>
        <a href="${directUrl}" target="_blank" rel="noopener" class="cta-btn primary-cta" style="margin-top: 14px;">
          Open In-Browser LinkedIn Results
        </a>
      </div>
    `;
  }

  // =========================================================================
  // Background Polling (Live Radar)
  // =========================================================================

  function startAutoPoll() {
    stopAutoPoll();
    state.pollCountdown = 60;
    updatePollStatusText();

    state.pollTimerId = setInterval(() => {
      state.pollCountdown--;
      if (state.pollCountdown <= 0) {
        state.pollCountdown = 60;
        performSearch(true);
      }
      updatePollStatusText();
    }, 1000);
  }

  function stopAutoPoll() {
    if (state.pollTimerId) {
      clearInterval(state.pollTimerId);
      state.pollTimerId = null;
    }
    el.metaAutoRefresh.textContent = 'POLL: IDLE';
  }

  function updatePollStatusText() {
    el.metaAutoRefresh.textContent = `POLL: ${state.pollCountdown}S`;
  }

  // =========================================================================
  // Saved Searches & Watchlist Management
  // =========================================================================

  function loadSavedSearches() {
    try {
      const stored = localStorage.getItem('li_hunter_saved_searches');
      state.savedSearches = stored ? JSON.parse(stored) : getDefaultPresets();
      updateSavedBadge();
    } catch (e) {
      state.savedSearches = getDefaultPresets();
    }
  }

  function saveSearchesToStorage() {
    try {
      localStorage.setItem('li_hunter_saved_searches', JSON.stringify(state.savedSearches));
    } catch (e) {}
  }

  function getDefaultPresets() {
    return [
      {
        id: '1',
        name: 'IT Manager Belgium < 1h',
        keywords: 'IT Manager, Digital Transformation',
        location: 'Belgium',
        seconds: 3600,
        workType: '',
        sortBy: 'DD',
        expLevels: ['4', '5'],
        easyApply: false
      },
      {
        id: '2',
        name: 'Digital Transformation Lead < 2h',
        keywords: 'Digital Transformation Lead OR Manager',
        location: 'Belgium',
        seconds: 7200,
        workType: '',
        sortBy: 'DD',
        expLevels: [],
        easyApply: false
      },
      {
        id: '3',
        name: 'Remote IT Director < 4h',
        keywords: 'IT Director OR Head of IT',
        location: 'Belgium',
        seconds: 14400,
        workType: '2',
        sortBy: 'DD',
        expLevels: ['5', '6'],
        easyApply: false
      }
    ];
  }

  function saveCurrentSearch() {
    const newPreset = {
      id: String(Date.now()),
      name: `${state.keywords} (< ${Math.round(state.seconds / 60)}m)`,
      keywords: state.keywords,
      location: state.location,
      seconds: state.seconds,
      workType: state.workType,
      sortBy: state.sortBy,
      expLevels: [...state.expLevels],
      easyApply: state.easyApply
    };

    state.savedSearches.unshift(newPreset);
    saveSearchesToStorage();
    updateSavedBadge();
    showToast(`Saved search "${newPreset.name}" to watchlist`);
  }

  function updateSavedBadge() {
    el.savedCount.textContent = state.savedSearches.length;
  }

  function renderSavedDrawer() {
    el.savedListContainer.innerHTML = '';
    if (state.savedSearches.length === 0) {
      el.savedListContainer.innerHTML = '<p style="color: var(--dim); font-size: 13px; text-align: center; padding: 20px 0;">No saved searches in your watchlist. Click "+ New Preset" to create one.</p>';
      return;
    }

    state.savedSearches.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'saved-item-card';

      const sec = Number(item.seconds);
      const timeTag = window.URLBuilder.TIME_PRESETS[String(sec)] || `${Math.round(sec / 60)}m`;

      const wtLabel = item.workType === '2' ? 'Remote' : item.workType === '3' ? 'Hybrid' : item.workType === '1' ? 'On-site' : 'Any Workplace';

      card.innerHTML = `
        <div class="saved-card-top">
          <div class="saved-item-title">${escapeHtml(item.name)}</div>
          <span class="saved-badge-time">&lt; ${timeTag}</span>
        </div>
        <div class="saved-item-meta">
          <span>${escapeHtml(item.keywords || 'Any Role')}</span> •
          <span>${escapeHtml(item.location || 'Any Region')}</span> •
          <span>${wtLabel}</span> •
          <span>Sort: ${item.sortBy || 'DD'}</span>
          ${item.easyApply ? ' • <span style="color: #34d399;">Easy Apply</span>' : ''}
        </div>
        <div class="saved-item-actions">
          <button type="button" class="saved-btn primary load-preset-btn">Load &amp; Hunt</button>
          <button type="button" class="saved-btn edit edit-preset-btn">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>Edit</span>
          </button>
          <button type="button" class="saved-btn direct-linkedin-btn">LinkedIn</button>
          <button type="button" class="saved-btn delete-preset-btn" style="color: #ef4444;">Delete</button>
        </div>
      `;

      card.querySelector('.load-preset-btn').addEventListener('click', () => {
        applyPreset(item);
        el.savedDrawer.classList.add('hidden');
        performSearch();
      });

      card.querySelector('.edit-preset-btn').addEventListener('click', () => {
        openEditModal(item);
      });

      card.querySelector('.direct-linkedin-btn').addEventListener('click', () => {
        const webUrl = window.URLBuilder.buildLinkedInWebUrl(item);
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      });

      card.querySelector('.delete-preset-btn').addEventListener('click', () => {
        state.savedSearches = state.savedSearches.filter(s => s.id !== item.id);
        saveSearchesToStorage();
        updateSavedBadge();
        renderSavedDrawer();
        showToast(`Removed "${item.name}" from watchlist`);
      });

      el.savedListContainer.appendChild(card);
    });
  }

  function exportWatchlist() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.savedSearches, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `linkedin-watchlist-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Watchlist exported as JSON file');
  }

  function applyPreset(item) {
    state.keywords = item.keywords || '';
    state.location = item.location || '';
    state.seconds = Number(item.seconds) || 3600;
    state.workType = item.workType || '';
    state.sortBy = item.sortBy || 'DD';
    state.expLevels = Array.isArray(item.expLevels) ? [...item.expLevels] : [];
    state.easyApply = Boolean(item.easyApply);

    // Sync UI elements
    el.keywordsInput.value = state.keywords;
    el.locationInput.value = state.location;
    el.easyApplyToggle.checked = state.easyApply;

    el.timePresetsContainer.querySelectorAll('.time-pill').forEach(b => {
      b.classList.toggle('active', b.dataset.seconds === String(state.seconds));
    });

    el.workplaceContainer.querySelectorAll('.filter-pill').forEach(b => {
      b.classList.toggle('active', (b.dataset.wt || '') === state.workType);
    });

    el.sortContainer.querySelectorAll('.filter-pill').forEach(b => {
      b.classList.toggle('active', (b.dataset.sort || '') === state.sortBy);
    });

    el.experienceContainer.querySelectorAll('.filter-pill').forEach(b => {
      b.classList.toggle('active', state.expLevels.includes(b.dataset.exp));
    });

    updateUrlAndCliPreviews();
  }

  // =========================================================================
  // Utilities: Toast & HTML escaping
  // =========================================================================

  function showToast(msg) {
    el.toastMessage.textContent = msg;
    el.toastNotification.classList.remove('hidden');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      el.toastNotification.classList.add('hidden');
    }, 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
