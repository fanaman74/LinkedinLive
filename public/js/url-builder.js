/**
 * LinkedIn URL Hacker & Query Builder
 * Formats precise URLs with f_TPR=r{seconds} time-hacking and sortBy=DD
 */
(function (global) {
  const URLBuilder = {
    // Human readable text to seconds mapping
    TIME_PRESETS: {
      '900': '15m',
      '1800': '30m',
      '3600': '1h',
      '7200': '2h',
      '14400': '4h',
      '28800': '8h',
      '43200': '12h',
      '86400': '24h'
    },

    /**
     * Build standard LinkedIn Web Search URL (for direct user navigation)
     */
    buildLinkedInWebUrl(state) {
      const baseUrl = 'https://www.linkedin.com/jobs/search/';
      const params = new URLSearchParams();

      if (state.keywords && state.keywords.trim()) {
        params.append('keywords', state.keywords.trim());
      }

      if (state.location && state.location.trim()) {
        params.append('location', state.location.trim());
      }

      // Sort Order (DD = Date Descending, R = Relevance)
      if (state.sortBy) {
        params.append('sortBy', state.sortBy);
      }

      // Time posted hack: f_TPR=r{seconds}
      if (state.seconds && Number(state.seconds) > 0) {
        params.append('f_TPR', `r${state.seconds}`);
      }

      // Workplace (1=On-site, 2=Remote, 3=Hybrid)
      if (state.workType) {
        params.append('f_WT', state.workType);
      }

      // Experience Level (1-6, can be comma separated)
      if (state.expLevels && state.expLevels.length > 0) {
        params.append('f_E', state.expLevels.join(','));
      }

      // Easy Apply
      if (state.easyApply) {
        params.append('f_AL', 'true');
      }

      return `${baseUrl}?${params.toString()}`;
    },

    /**
     * Build Internal API request URL
     */
    buildApiUrl(state) {
      const baseUrl = '/api/jobs/search';
      const params = new URLSearchParams();

      if (state.keywords && state.keywords.trim()) {
        params.append('keywords', state.keywords.trim());
      }
      if (state.location && state.location.trim()) {
        params.append('location', state.location.trim());
      }
      if (state.sortBy) params.append('sortBy', state.sortBy);
      if (state.seconds) params.append('seconds', state.seconds);
      if (state.workType) params.append('workType', state.workType);
      if (state.expLevels && state.expLevels.length > 0) {
        params.append('expLevel', state.expLevels.join(','));
      }
      if (state.easyApply) params.append('easyApply', 'true');
      if (state.start) params.append('start', String(state.start));

      return `${baseUrl}?${params.toString()}`;
    },

    /**
     * Format a sleek CLI command string inspired by Pinloop
     */
    formatCliCommand(state) {
      const parts = ['hunt'];
      const kw = (state.keywords || 'Software Engineer').trim();
      parts.push(`"${kw}"`);

      if (state.location && state.location.trim()) {
        parts.push(`--location "${state.location.trim()}"`);
      }

      const sec = Number(state.seconds);
      const presetLabel = this.TIME_PRESETS[String(sec)];
      if (presetLabel) {
        parts.push(`--within ${presetLabel}`);
      } else if (sec) {
        parts.push(`--within ${Math.round(sec / 60)}m`);
      }

      if (state.sortBy === 'DD') {
        parts.push('--recent');
      }

      if (state.workType === '2') {
        parts.push('--remote');
      } else if (state.workType === '3') {
        parts.push('--hybrid');
      } else if (state.workType === '1') {
        parts.push('--onsite');
      }

      if (state.easyApply) {
        parts.push('--easy-apply');
      }

      return parts.join(' ');
    },

    /**
     * Generate Blitz URLs (3 parallel search windows: 15m, 1h, 4h)
     */
    generateBlitzUrls(state) {
      return [
        {
          label: 'Ultra Fresh (< 15 mins)',
          url: this.buildLinkedInWebUrl({ ...state, seconds: 900, sortBy: 'DD' })
        },
        {
          label: 'Sweet Spot (< 1 hour)',
          url: this.buildLinkedInWebUrl({ ...state, seconds: 3600, sortBy: 'DD' })
        },
        {
          label: 'Extended Catch (< 4 hours)',
          url: this.buildLinkedInWebUrl({ ...state, seconds: 14400, sortBy: 'DD' })
        }
      ];
    }
  };

  global.URLBuilder = URLBuilder;
})(window);
