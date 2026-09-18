const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory cache for search requests (key -> { data, timestamp })
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Helper to construct LinkedIn guest API URL
function buildLinkedInGuestUrl({ keywords, location, seconds, sortBy, workType, expLevel, jobType, easyApply, start }) {
  const baseUrl = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
  const params = new URLSearchParams();

  if (keywords) params.append('keywords', keywords);
  if (location) params.append('location', location);
  if (sortBy) params.append('sortBy', sortBy);
  if (start) params.append('start', String(start));

  // Time posted hack: f_TPR=r{seconds}
  if (seconds && Number(seconds) > 0) {
    params.append('f_TPR', `r${seconds}`);
  }

  // Work type (1=Onsite, 2=Remote, 3=Hybrid)
  if (workType) {
    params.append('f_WT', workType);
  }

  // Experience level (1=Internship, 2=Entry, 3=Associate, 4=Mid-Senior, 5=Director, 6=Executive)
  if (expLevel) {
    params.append('f_E', expLevel);
  }

  // Job type (F=Full-time, C=Contract, P=Part-time, etc.)
  if (jobType) {
    params.append('f_JT', jobType);
  }

  // Easy Apply
  if (easyApply === 'true' || easyApply === true) {
    params.append('f_AL', 'true');
  }

  return `${baseUrl}?${params.toString()}`;
}

// Helper to construct normal LinkedIn search URL for direct user browser navigation
function buildLinkedInWebUrl({ keywords, location, seconds, sortBy, workType, expLevel, jobType, easyApply }) {
  const baseUrl = 'https://www.linkedin.com/jobs/search/';
  const params = new URLSearchParams();

  if (keywords) params.append('keywords', keywords);
  if (location) params.append('location', location);
  if (sortBy) params.append('sortBy', sortBy);

  if (seconds && Number(seconds) > 0) {
    params.append('f_TPR', `r${seconds}`);
  }
  if (workType) params.append('f_WT', workType);
  if (expLevel) params.append('f_E', expLevel);
  if (jobType) params.append('f_JT', jobType);
  if (easyApply === 'true' || easyApply === true) params.append('f_AL', 'true');

  return `${baseUrl}?${params.toString()}`;
}

// Parse HTML job cards from LinkedIn Guest API
function parseJobCards(html) {
  const jobs = [];
  const items = html.split('<li');

  for (let i = 1; i < items.length; i++) {
    const item = items[i];

    const titleMatch = item.match(/class="[^"]*base-search-card__title[^"]*">\s*([\s\S]*?)\s*<\/h3>/);
    if (!titleMatch) continue;

    const companyMatch = item.match(/class="[^"]*base-search-card__subtitle[^"]*">\s*([\s\S]*?)\s*<\/h4>/);
    const locationMatch = item.match(/class="[^"]*job-search-card__location[^"]*">\s*([\s\S]*?)\s*<\/span>/);
    const timeMatch = item.match(/class="[^"]*job-search-card__listdate[^"]*" datetime="([^"]*)">\s*([\s\S]*?)\s*<\/time>/);
    const linkMatch = item.match(/href="([^"]*(?:job-posting|jobs\/view)[^"]*)"/);
    const imgMatch = item.match(/(?:data-delayed-url|src)="([^"]*company-logo[^"]*)"/);
    const urnMatch = item.match(/data-entity-urn="urn:li:jobPosting:([0-9]+)"/);

    const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').trim() : 'Unknown Position';
    let company = companyMatch ? companyMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim() : 'Confidential';
    const jobLocation = locationMatch ? locationMatch[1].replace(/&amp;/g, '&').trim() : 'Not Specified';
    const relativeTime = timeMatch ? timeMatch[2].trim() : 'Recently';
    const datetime = timeMatch ? timeMatch[1] : '';
    let link = linkMatch ? linkMatch[1] : '';

    // Strip unnecessary query trackers from link for clean sharing
    if (link) {
      try {
        const u = new URL(link);
        link = `${u.origin}${u.pathname}`;
      } catch (e) {}
    }

    const jobId = urnMatch ? urnMatch[1] : `job-${i}-${Date.now()}`;
    const logo = imgMatch ? imgMatch[1].replace(/&amp;/g, '&') : '';

    // Calculate urgency flag (e.g. posted minutes or 1-2 hours ago)
    const isUltraRecent = /(?:minute|min|1 hour|2 hour)/i.test(relativeTime);

    jobs.push({
      id: jobId,
      title,
      company,
      location: jobLocation,
      time: relativeTime,
      datetime,
      link,
      logo,
      isUltraRecent
    });
  }

  return jobs;
}

// API endpoint: /api/jobs/search
app.get('/api/jobs/search', async (req, res) => {
  try {
    const {
      keywords = 'IT Manager, Digital Transformation',
      location = 'Belgium',
      seconds = '3600',
      sortBy = 'DD',
      workType = '',
      expLevel = '',
      jobType = '',
      easyApply = 'false',
      start = '0',
      limit = '25'
    } = req.query;

    const baseStart = Math.max(0, parseInt(start, 10) || 0);
    const targetLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 10), 60);
    const numPages = Math.ceil(targetLimit / 10);
    const pageOffsets = Array.from({ length: numPages }, (_, i) => baseStart + i * 10);

    const cacheKey = JSON.stringify({ keywords, location, seconds, sortBy, workType, expLevel, jobType, easyApply, baseStart, targetLimit });
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({
        success: true,
        cached: true,
        source: 'cache',
        count: cached.data.length,
        jobs: cached.data,
        directUrl: cached.directUrl,
        hasMore: cached.data.length >= 10
      });
    }

    const directUrl = buildLinkedInWebUrl({ keywords, location, seconds, sortBy, workType, expLevel, jobType, easyApply });

    console.log(`[LinkedIn Proxy] Batch fetching ${numPages} page(s) (start: ${baseStart}, limit: ${targetLimit}) for: "${keywords}" in "${location}"`);

    // Fetch pages concurrently
    const pagePromises = pageOffsets.map(async (st) => {
      const guestUrl = buildLinkedInGuestUrl({ keywords, location, seconds, sortBy, workType, expLevel, jobType, easyApply, start: st });
      try {
        const response = await fetch(guestUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          }
        });
        if (!response.ok) {
          console.warn(`[LinkedIn Proxy] Offset ${st} returned status ${response.status}`);
          return '';
        }
        return await response.text();
      } catch (err) {
        console.warn(`[LinkedIn Proxy] Offset ${st} network error:`, err.message);
        return '';
      }
    });

    const htmlPages = await Promise.all(pagePromises);
    const seenIds = new Set();
    const combinedJobs = [];

    for (const html of htmlPages) {
      if (!html) continue;
      const jobs = parseJobCards(html);
      for (const j of jobs) {
        if (!seenIds.has(j.id)) {
          seenIds.add(j.id);
          combinedJobs.push(j);
        }
      }
    }

    const finalJobs = combinedJobs.slice(0, targetLimit);
    const hasMore = combinedJobs.length >= 10;

    // Cache results
    cache.set(cacheKey, { data: finalJobs, directUrl, timestamp: Date.now() });
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return res.json({
      success: true,
      cached: false,
      source: 'live',
      count: finalJobs.length,
      jobs: finalJobs,
      directUrl,
      hasMore,
      query: { keywords, location, seconds, sortBy, workType, expLevel, jobType, easyApply, start: baseStart, limit: targetLimit }
    });

  } catch (error) {
    console.error('[LinkedIn Proxy Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
      directUrl: buildLinkedInWebUrl(req.query)
    });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`[LinkedIn Hunter] Server running at http://localhost:${PORT}`);
});
