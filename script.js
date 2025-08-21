// TOC sidebar handle toggle
(function(){
  const body = document.body;
  const mql = window.matchMedia('(max-width: 700px)');
  const handle = document.querySelector('#toc .toc-handle');
  const overlay = document.getElementById('toc-overlay');
  if (!handle) return;

  const updateAria = () => {
    const expanded = !body.classList.contains('toc-collapsed');
    handle.setAttribute('aria-expanded', String(expanded));
  };

  // Default: collapse on small screens, expand otherwise
  const applyDefault = () => {
    if (mql.matches) body.classList.add('toc-collapsed');
    else body.classList.remove('toc-collapsed');
    updateAria();
  };
  applyDefault();
  mql.addEventListener('change', applyDefault);

  handle.addEventListener('click', () => {
    body.classList.toggle('toc-collapsed');
    updateAria();
  });

  // Close when clicking the overlay (acts as a backdrop)
  if (overlay) {
    overlay.addEventListener('click', () => {
      body.classList.add('toc-collapsed');
      updateAria();
    });
  }

  // Auto-close when clicking a TOC link on small screens
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const isTocLink = target.closest('#toc a');
    if (isTocLink && window.matchMedia('(max-width: 900px)').matches) {
      body.classList.add('toc-collapsed');
      updateAria();
    }
  });
})();

// Smooth scrolling for navigation links
document.querySelectorAll('.nav a').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Add click-to-copy functionality for coordinates
document.querySelectorAll('.coordinates').forEach(coord => {
  coord.style.cursor = 'pointer';
  coord.title = 'Click to copy coordinates';
  
  coord.addEventListener('click', function() {
    navigator.clipboard.writeText(this.textContent).then(() => {
      const original = this.style.backgroundColor;
      this.style.backgroundColor = '#2ecc71';
      this.style.color = 'white';
      
      setTimeout(() => {
        this.style.backgroundColor = original;
        this.style.color = '#222';
      }, 1000);
    });
  });
});

// Tag filter for Issues and Suggestions
(function() {
  const buttons = document.querySelectorAll('#tag-filter-bar .filter-btn');
  if (!buttons.length) return;

  const applyFilter = (tag) => {
    const showAll = tag === 'all';
    const items = document.querySelectorAll('.issue, .suggestion');
    items.forEach(item => {
      if (showAll) {
        item.style.display = '';
        return;
      }
      const hasTag = Array.from(item.querySelectorAll('.tag')).some(span => {
        return Array.from(span.classList).includes(`tag-${tag}`);
      });
      item.style.display = hasTag ? '' : 'none';
    });
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.tag);
    });
  });

  // Make tags clickable to trigger the same filter behavior
  const tagSpans = document.querySelectorAll('#issues .tag, #suggestions .tag');
  tagSpans.forEach(span => {
    // Improve UX
    span.style.cursor = 'pointer';
    if (!span.title) span.title = 'Filter by this tag';

    span.addEventListener('click', () => {
      const tagClass = Array.from(span.classList).find(c => c.startsWith('tag-') && c !== 'tag');
      if (!tagClass) return;
      const tag = tagClass.replace('tag-', '');

      // Mirror filter button active state
      buttons.forEach(b => b.classList.remove('active'));
      const targetBtn = document.querySelector(`#tag-filter-bar .filter-btn[data-tag="${tag}"]`);
      if (targetBtn) {
        targetBtn.classList.add('active');
      }

      applyFilter(tag);
    });
  });
})();

// Collapsible headings (h1, h2, h3)
// Groups subsequent siblings until the next heading of same or higher level, and toggles that group's visibility.
(function(){
  const levels = { H1: 1, H2: 2, H3: 3 };
  const main = document.querySelector('main');
  if (!main) return;

  // Do not collapse the main page title h1 in the header
  const headings = Array.from(main.querySelectorAll('h1, h2, h3'));

  headings.forEach(h => {
    // Exclude any heading inside the <header> element
    if (h.closest('header')) return;
    const level = levels[h.tagName];
    if (!level) return;

    // Do not add collapsible arrow/behavior for the Table of Contents heading
    if (h.closest('#toc')) return;

    // Create a container for the content that belongs to this heading
    const content = document.createElement('div');
    // Start expanded for all headings to avoid surprising users
    const defaultExpanded = true;
    content.classList.toggle('is-hidden', !defaultExpanded);
    content.setAttribute('data-collapsible-content', '');

    // Move following siblings into content until reaching a heading of same or higher level
    let sib = h.nextSibling;
    const toMove = [];
    while (sib) {
      if (sib.nodeType === Node.ELEMENT_NODE) {
        const tag = sib.tagName;
        if (levels[tag] && levels[tag] <= level) break;
      }
      toMove.push(sib);
      sib = sib.nextSibling;
    }

    // Additionally, if this heading is the primary heading for its section,
    // absorb subsequent sibling <section> elements whose first heading is a lower level.
    // This covers structures where logical sub-sections are separate <section>s
    // (e.g., Problem -> Configuration/Recce; Daily -> Issues/Suggestions).
    const parentSection = h.closest('section');
    if (parentSection) {
      const firstHeadingInSection = parentSection.querySelector('h1, h2, h3');
      if (firstHeadingInSection === h) {
        let sec = parentSection.nextElementSibling;
        while (sec && sec.tagName === 'SECTION') {
          const firstEl = sec.firstElementChild;
          const secLevel = firstEl && levels[firstEl.tagName] ? levels[firstEl.tagName] : null;
          if (secLevel && secLevel > level) {
            toMove.push(sec);
            sec = sec.nextElementSibling;
            continue;
          }
          break;
        }
      }
    }
    if (!toMove.length) return;

    // Wrap: insert content after heading and move nodes
    h.after(content);
    toMove.forEach(n => content.appendChild(n));

    // Enhance heading with indicator and accessibility
    h.classList.add('collapsible-heading');
    h.tabIndex = 0;
    h.setAttribute('role', 'button');
    h.setAttribute('aria-expanded', String(defaultExpanded));
    const icon = document.createElement('span');
    icon.className = 'collapsible-toggle';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▾';
    // Put icon at the start
    h.prepend(icon);

    const toggle = () => {
      const expanded = h.getAttribute('aria-expanded') === 'true';
      const next = h.nextElementSibling;
      if (next && next.hasAttribute('data-collapsible-content')) {
        next.classList.toggle('is-hidden', expanded);
        h.setAttribute('aria-expanded', String(!expanded));
      }
    };

    h.addEventListener('click', toggle);
    h.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
})();

// Ensure TOC clicks expand the target's parent sections before scrolling
(function(){
  const tocLinks = document.querySelectorAll('main > section:first-of-type .links-tree a');
  if (!tocLinks.length) return;

  function expandToReveal(target) {
    if (!target) return;
    // Iteratively expand any heading whose content contains the current target
    let current = target;
    let changed = true;
    while (changed) {
      changed = false;
      const heads = document.querySelectorAll('main h1.collapsible-heading, main h2.collapsible-heading, main h3.collapsible-heading');
      for (const h of heads) {
        const content = h.nextElementSibling;
        if (!content || !content.hasAttribute('data-collapsible-content')) continue;
        if (content.contains(current)) {
          if (h.getAttribute('aria-expanded') === 'false') {
            content.classList.remove('is-hidden');
            h.setAttribute('aria-expanded', 'true');
          }
          current = h; // move up one level and continue
          changed = true;
          break;
        }
      }
    }
  }

  tocLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#')) return; // let normal behavior proceed
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        expandToReveal(target);
        // Expand parents so it's visible
        expandToReveal(target);

        // Also expand the target itself if it's a collapsible heading
        const content = target.nextElementSibling;
        if (content && content.hasAttribute('data-collapsible-content')) {
          content.classList.remove('is-hidden');
          target.setAttribute('aria-expanded', 'true');
        }

        // Now scroll to it
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // And collapse the TOC sidebar for better focus
        document.body.classList.add('toc-collapsed');
        document.querySelector('#toc .toc-handle').setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Removed redundant Expand/Collapse All controls in TOC
})();

// =====================
// TOC controls: Collapse/Expand All and Theme Toggle
(function(){
  const collapseBtn = document.getElementById('toc-collapse-all');
  const themeBtn = document.getElementById('theme-toggle');
  const body = document.body;
  if (!collapseBtn && !themeBtn) return;

  // Helper: iterate collapsible sections (outside the TOC only)
  const getHeads = () => Array.from(document.querySelectorAll('main h1.collapsible-heading, main h2.collapsible-heading, main h3.collapsible-heading'))
    .filter(h => !h.closest('#toc'));

  const allCollapsed = () => getHeads().every(h => {
    const content = h.nextElementSibling;
    return content && content.classList.contains('is-hidden');
  });

  const setAll = (expanded) => {
    getHeads().forEach(h => {
      const content = h.nextElementSibling;
      if (!content || !content.hasAttribute('data-collapsible-content')) return;
      if (expanded) {
        content.classList.remove('is-hidden');
        h.setAttribute('aria-expanded', 'true');
      } else {
        content.classList.add('is-hidden');
        h.setAttribute('aria-expanded', 'false');
      }
    });
  };

  const syncCollapseBtn = () => {
    if (!collapseBtn) return;
    collapseBtn.textContent = allCollapsed() ? 'Expand All' : 'Collapse All';
  };

  // Wire collapse/expand all
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      const expand = allCollapsed();
      setAll(expand);
      syncCollapseBtn();
    });
    // Initial label
    syncCollapseBtn();
  }

  // Theme toggle with persistence
  const THEME_KEY = 'kb_theme_v1';
  const applyTheme = (mode) => {
    if (mode === 'dark') {
      body.classList.add('theme-dark');
      themeBtn.setAttribute('aria-pressed', 'true');
      themeBtn.title = 'Switch to light theme';
      themeBtn.innerHTML = '☀️'; // Sun icon
    } else {
      body.classList.remove('theme-dark');
      themeBtn.setAttribute('aria-pressed', 'false');
      themeBtn.title = 'Switch to dark theme';
      themeBtn.innerHTML = '🌙'; // Moon icon
    }

    // Switch mission image based on theme
    const missionImage = document.getElementById('mission-path-image');
    if (missionImage) {
      missionImage.src = mode === 'dark' ? missionImage.dataset.srcDark : missionImage.dataset.srcLight;
    }
  };

  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') applyTheme(saved);
  else {
    // Optional: respect prefers-color-scheme
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = body.classList.contains('theme-dark') ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
    // Ensure initial icon/label is correct on load
    applyTheme(body.classList.contains('theme-dark') ? 'dark' : 'light');
  }
})();

// =====================
// Mission tables dynamic (supports multiple tables)
// =====================
(function(){
  // Map command to column heading meanings (shared across tables)
  const headingsMap = {
    'TAKEOFF':    ['Command','—','—','—','—','—','—','Alt','Frame','Grad %','Angle','Dist','AZ'],
    'LAND':       ['Command','—','—','—','1=Prec Land','Lat','Long','Alt','Frame','Grad %','Angle','Dist','AZ'],
    'WAYPOINT':   ['Command','Delay','—','—','—','Lat','Long','Alt','Frame','Grad %','Angle','Dist','AZ'],
    'DO_SET_SERVO':['Command','Ser No','PWM','—','—','—','—','—','Frame','Grad %','Angle','Dist','AZ'],
    'DELAY':      ['Command','Seconds (or -1)','Hour UTC (or -1)','Minute UTC (or -1)','Second UTC (or -1)','—','—','—','Frame','Grad %','Angle','Dist','AZ'],
    'CONDITION_YAW':['Command','Deg','Speed (deg/s)','Dir (1=CW)','0=Abs, 1=Rel','—','—','—','Frame','Grad %','Angle','Dist','AZ']
  };
  // Data sets for both tables
  const data1 = [ // Base -> Monastery
    ['TAKEOFF','0','0','0','0','0','0','10','Relative','0','0','0','0'],
    ['WAYPOINT','0','0','0','0','27.4835753','89.6237273','40','Relative','3682.5','88.4','40.0','124'],
    ['WAYPOINT','0','0','0','0','27.4890358','89.57476','976','Relative','19.2','10.9','4957.5','277'],
    ['WAYPOINT','5','0','0','0','27.4890358','89.57476','941','Relative','-∞','-90.0','35.0','180'],
    ['DO_SET_SERVO','11','2000','0','0','0','0','0','Absolute','0','0','0','0'],
    ['DELAY','5','0','0','0','0','0','0','Absolute','0','0','0','0'],
    ['WAYPOINT','40','0','0','0','27.4890358','89.57476','976','Relative','∞','90.0','35.0','180'],
    ['CONDITION_YAW','180','10','1','1','0','0','0','Absolute','0','0','0','0'],
    ['DELAY','30','0','0','0','0','0','0','Absolute','0','0','0','0'],
    ['WAYPOINT','0','0','0','0','27.4835963','89.6237514','489','Relative','-10.0','-5.7','4894.7','97'],
    ['CONDITION_YAW','180','10','1','1','0','0','0','Absolute','0','0','0','0'],
    ['DELAY','30','0','0','0','0','0','0','Absolute','0','0','0','0'],
    ['WAYPOINT','0','0','0','0','27.4860763','89.6013565','265','Relative','-10.1','-5.7','2237.5','277'],
    ['CONDITION_YAW','180','10','1','1','0','0','0','Absolute','0','0','0','0'],
    ['DELAY','30','0','0','0','0','0','0','Absolute','0','0','0','0'],
    ['WAYPOINT','0','0','0','0','27.4835963','89.6237514','41','Relative','-10.1','-5.7','2237.5','97'],
    ['LAND','0','0','0','1','27.4835753','89.6237273','0','Relative','-1230.4','-85.4','41.1','226']
  ];

  const data2 = [ // Monastery -> Base (from user)
    ['TAKEOFF','0','0','0','0','0','0','40','Relative','0','0','0','0'],
    ['WAYPOINT','0','0','0','0','27.4835753','89.6237273','-447','Relative','-9.2','-5.2','4888.5','97'],
    ['CONDITION_YAW','180','10','1','0','0','0','0','Absolute','0','0','0','0'],
    ['DELAY','30','0','0','0','0','0','0','Absolute','0','0','0','0'],
    ['WAYPOINT','0','0','0','0','27.4859639','89.6017885','-631','Relative','-8.4','-4.8','2188.1','277'],
    ['CONDITION_YAW','180','10','1','0','0','0','0','Absolute','0','0','0','0'],
    ['DELAY','30','0','0','0','0','0','0','Absolute','0','0','0','0'],
    ['WAYPOINT','0','0','0','0','27.4835753','89.6237273','-895','Relative','-12.1','-6.9','2196.3','97'],
    ['LAND','0','0','0','1','27.4835753','89.6237273','-956','Relative','-∞','-90.0','61.0','180']
  ];

  const defaultHeads = ['Sr. No','Command','P1','P2','P3','P4','Lat','Long','Alt','Frame','Grad %','Angle','Dist','AZ'];

  function initMission(tableId, toggleId, data) {
    const missionTable = document.getElementById(tableId);
    if (!missionTable) return;

    const tbody = missionTable.querySelector('tbody');
    const thead = missionTable.querySelector('thead');
    const headerRow = thead ? thead.querySelector('tr') : null;
    const clearSelected = () => tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));

    // Populate rows
    tbody.innerHTML = '';
    data.forEach((row, idx) => {
      const tr = document.createElement('tr');
      // Sr. No
      const serial = document.createElement('td');
      serial.textContent = String(idx + 1);
      tr.appendChild(serial);
      // Other cells
      row.forEach((cell, cidx) => {
        const td = document.createElement('td');
        td.textContent = cell;
        if (cidx >= 5) td.style.fontFamily = 'monospace';
        if (cidx === 5 || cidx === 6) {
          td.classList.add('coordinates');
          td.style.cursor = 'pointer';
          td.title = 'Click to copy coordinates';
          td.addEventListener('click', function() {
            navigator.clipboard.writeText(this.textContent).then(() => {
              const original = this.style.backgroundColor;
              this.style.backgroundColor = '#2ecc71';
              this.style.color = 'white';
              setTimeout(() => {
                this.style.backgroundColor = original;
                this.style.color = '#222';
              }, 1000);
            });
          });
        }
        tr.appendChild(td);
      });

      tr.addEventListener('click', () => {
        clearSelected();
        tr.classList.add('selected');
        const cmd = row[0];
        const heads = ['Sr. No', ...(headingsMap[cmd] || headingsMap['WAYPOINT'])];
        if (headerRow) {
          const ths = headerRow.querySelectorAll('th');
          heads.forEach((label, i) => { if (ths[i]) ths[i].textContent = label; });
        }
      });
      tbody.appendChild(tr);
    });

    // Default header
    const setHeader = (labels) => {
      if (!headerRow) return;
      const ths = headerRow.querySelectorAll('th');
      labels.forEach((label, i) => { if (ths[i]) ths[i].textContent = label; });
    };
    setHeader(defaultHeads);

    // Reset on header click
    if (headerRow) {
      headerRow.style.cursor = 'pointer';
      headerRow.title = 'Click to reset headings';
      headerRow.addEventListener('click', () => {
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        setHeader(defaultHeads);
      });
    }

    // Outside click reset (ignore clicks on its Advanced button)
    document.addEventListener('click', (e) => {
      const within = missionTable.contains(e.target);
      const toggleEl = toggleId ? document.getElementById(toggleId) : null;
      const onToggle = toggleEl ? toggleEl.contains(e.target) : false;
      if (!within && !onToggle) {
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        setHeader(defaultHeads);
      }
    });

    // Advanced toggle
    const advBtn = toggleId ? document.getElementById(toggleId) : null;
    if (advBtn) {
      advBtn.addEventListener('click', () => {
        missionTable.classList.toggle('hide-advanced');
        advBtn.classList.toggle('active');
      });
    }
  }

  // Initialize both tables
  initMission('mission-table', 'mission-advanced-toggle', data1);
  initMission('mission-table-2', 'mission-advanced-toggle-2', data2);
})();
