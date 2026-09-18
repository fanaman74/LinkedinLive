# LinkedinLive

> Real-time LinkedIn job search web application with precision sub-24h time-window hacking (`f_TPR=r{seconds}`) and date-descending sort (`sortBy=DD`), styled with the dark terminal aesthetic of [Pinloop.ai](https://pinloop.ai/).

---

## Features

- **Precision Time Window Hacking (`f_TPR=r{seconds}`)**:
  - Filter postings down to the minute: `15m` (`r900`), `30m` (`r1800`), `1h` (`r3600`), `2h` (`r7200`), `4h` (`r14400`), `8h` (`r28800`), `12h` (`r43200`), `24h` (`r86400`), or custom exact seconds.
- **Forced Date Descending Sort (`sortBy=DD`)**:
  - Bypasses LinkedIn's relevance algorithm to surface true newest job drops first.
- **Pinloop Aesthetic & Hero Animation**:
  - Atmospheric 3D Simplex noise canvas animation with Pinloop's signature spectral color ramp (cobalt, azure, indigo, violet, purple, orchid) and blooming lamp cells.
  - Monospace CLI preview bar with live syntax generator and one-click copy.
  - Pinloop table rows with arrival slide-in animation (`dcEnterExact`) and highlight glow.
- **Interactive Watchlist Management**:
  - Save, edit, reconfigure, and delete search presets directly in the app.
  - 1-click **Export to JSON** and **Import from JSON** for backups and sharing.
- **Dual Execution**:
  - **In-App Live Stream**: Backend guest proxy that parses live job cards (company logo, title, location, relative freshness, direct apply link).
  - **Open in LinkedIn**: 1-click launchpad opening the exact hacked URL in your browser.
  - **Multi-Tab Blitz**: Opens 3 parallel searches (`15m`, `1h`, `4h`) simultaneously.
  - **Live Radar Polling**: Background 60s ticker for continuous monitoring.

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/fanaman74/LinkedinLive.git
cd LinkedinLive
npm install
```

### 2. Run the App
```bash
npm start
```

### 3. Open in Browser
Navigate to **[http://localhost:3000/](http://localhost:3000/)**

---

## Project Structure

```
LinkedinLive/
├── package.json           # Dependencies: Express, CORS
├── server/
│   └── server.js          # Backend proxy, LinkedIn guest scraper, and cache
└── public/
    ├── index.html         # HTML structure & layout
    ├── css/
    │   └── style.css      # Dark obsidian design system & animations
    └── js/
        ├── hero-field.js  # Pinloop dither canvas animation engine
        ├── url-builder.js # LinkedIn URL parameter builder & CLI formatter
        └── app.js         # State controller, search runner, watchlist CRUD
```

---

## License
MIT
