// Leonida Platinum — offline GTA VI trophy guide & tracker.
// One module, no libraries, no network at run time: it fetches only
// data/trophies.json (a file under app/) and keeps progress in localStorage.
const STORAGE_KEY = 'gta6-trophy-guide-v1';
const DEFAULT_SELECTED = 'The Shootist';

const listEl = document.getElementById('trophyList');
const emptyEl = document.getElementById('emptyList');
const detailEl = document.getElementById('detailPane');
const searchEl = document.getElementById('search');
const kindEl = document.getElementById('kindFilter');
const gradeEl = document.getElementById('gradeFilter');
const statusEl = document.getElementById('statusFilter');
const spoilerEl = document.getElementById('spoilerToggle');
const spoilerSettingsEl = document.getElementById('spoilerToggleSettings');
const listMetaEl = document.getElementById('listMeta');
const ioStatusEl = document.getElementById('ioStatus');

let doc = null; // { trophies: [...], sources: {...}, roadmap: [...] }
let earned = new Set();
let spoilerOn = false;
let selectedName = DEFAULT_SELECTED;
let activeTab = 'guide';

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.earned)) earned = new Set(saved.earned.filter((n) => typeof n === 'string'));
    if (typeof saved.spoiler === 'boolean') spoilerOn = saved.spoiler;
    if (typeof saved.selected === 'string') selectedName = saved.selected;
  } catch {
    earned = new Set();
    spoilerOn = false;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      earned: [...earned].sort(),
      spoiler: spoilerOn,
      selected: selectedName,
    }));
  } catch {
    // Storage full or unavailable: progress still shows in this session.
  }
}

function isStoryHidden(trophy) {
  return spoilerOn && trophy.kind === 'story' && !earned.has(trophy.name);
}

function displayName(trophy) {
  return isStoryHidden(trophy) ? 'Hidden story trophy' : trophy.name;
}

function displayDescription(trophy) {
  return isStoryHidden(trophy)
    ? 'Hidden until earned — turn off “Hide story spoilers” to reveal it.'
    : trophy.description;
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function trophyMatchesFilters(trophy) {
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(trophy.name.toLowerCase().includes(q)
    || trophy.description.toLowerCase().includes(q)
    || trophy.guide.toLowerCase().includes(q))) return false;
  if (kindEl.value !== 'all' && trophy.kind !== kindEl.value) return false;
  if (gradeEl.value !== 'all' && trophy.grade !== gradeEl.value) return false;
  const has = earned.has(trophy.name);
  if (statusEl.value === 'remaining' && has) return false;
  if (statusEl.value === 'earned' && !has) return false;
  if (statusEl.value === 'missable' && !trophy.missable) return false;
  return true;
}

function renderHeader() {
  const total = doc.trophies.length;
  const count = earned.size;
  document.getElementById('earnedCount').textContent = String(count);
  const fill = document.getElementById('progressFill');
  fill.style.width = `${Math.round((count / total) * 100)}%`;
  const bar = document.getElementById('progressBar');
  bar.setAttribute('aria-valuenow', String(count));
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  document.getElementById('gradeCounts').textContent = grades
    .map((g) => `${earnedCountByGrade(g)}/${countByGrade(g)} ${gradeLabel(g)}`)
    .join(' · ');
  const next = nextUpTrophy();
  document.getElementById('nextUp').innerHTML = next
    ? `Next up: <strong>${escapeHtml(next.name)}</strong> — ${escapeHtml(next.description)}`
    : 'Platinum complete — every trophy earned.';
  document.getElementById('missableCount').textContent = String(doc.trophies.filter((t) => t.missable).length);
}

function countByGrade(grade) {
  return doc.trophies.filter((t) => t.grade === grade).length;
}

function earnedCountByGrade(grade) {
  return doc.trophies.filter((t) => t.grade === grade && earned.has(t.name)).length;
}

function nextUpTrophy() {
  const ordered = [...doc.trophies].sort((a, b) => (a.stage - b.stage) || (a.id - b.id));
  return ordered.find((t) => !earned.has(t.name)) ?? null;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderList() {
  const visible = doc.trophies.filter(trophyMatchesFilters);
  listEl.replaceChildren();
  for (const trophy of visible) {
    const li = document.createElement('li');
    li.className = 'trophy-row'
      + (earned.has(trophy.name) ? ' earned' : '')
      + (trophy.name === selectedName ? ' selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(trophy.name);
    box.setAttribute('aria-label', `Mark ${trophy.name} earned`);
    box.addEventListener('change', () => {
      toggleEarned(trophy.name);
    });
    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'trophy-main';
    main.addEventListener('click', () => {
      selectedName = trophy.name;
      saveState();
      renderList();
      renderDetail();
    });
    const name = document.createElement('span');
    name.className = 'trophy-name';
    name.textContent = displayName(trophy);
    const desc = document.createElement('span');
    desc.className = 'trophy-desc';
    desc.textContent = displayDescription(trophy);
    const tags = document.createElement('span');
    tags.className = 'trophy-tags';
    tags.append(gradeTag(trophy), kindTag(trophy));
    if (trophy.missable) tags.append(missableTag());
    main.append(name, desc, tags);
    const count = document.createElement('span');
    count.className = 'trophy-count';
    count.textContent = trophy.count ? `PSN ${earned.has(trophy.name) ? trophy.count : 0}/${trophy.count}` : '';
    li.append(box, main, count);
    listEl.append(li);
  }
  emptyEl.hidden = visible.length !== 0;
  listMetaEl.textContent = `Showing ${visible.length} of ${doc.trophies.length} trophies`
    + (spoilerOn ? ' · story spoilers hidden until earned' : '');
}

function gradeTag(trophy) {
  const tag = document.createElement('span');
  tag.className = `tag grade-${trophy.grade}`;
  tag.textContent = gradeLabel(trophy.grade);
  return tag;
}

function kindTag(trophy) {
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = kindLabel(trophy.kind);
  return tag;
}

function missableTag() {
  const tag = document.createElement('span');
  tag.className = 'tag missable';
  tag.textContent = 'MISSABLE';
  return tag;
}

function renderDetail() {
  const trophy = doc.trophies.find((t) => t.name === selectedName) ?? doc.trophies[0];
  const hidden = isStoryHidden(trophy);
  detailEl.replaceChildren();
  const title = document.createElement('h2');
  title.textContent = displayName(trophy);
  const official = document.createElement('p');
  official.className = 'official';
  official.innerHTML = 'Official description: ';
  const quote = document.createElement('q');
  quote.textContent = displayDescription(trophy);
  official.append(quote);
  const meta = document.createElement('div');
  meta.className = 'detail-meta';
  meta.append(gradeTag(trophy), kindTag(trophy));
  if (trophy.missable) meta.append(missableTag());
  if (trophy.count) {
    const target = document.createElement('span');
    target.className = 'tag';
    target.textContent = `PSN target: ${trophy.count}`;
    meta.append(target);
  }
  const stage = document.createElement('span');
  stage.className = 'tag';
  stage.textContent = `Roadmap stage ${trophy.stage}`;
  meta.append(stage);
  detailEl.append(title, official, meta);
  if (trophy.missable && trophy.missableNote) {
    const note = document.createElement('p');
    note.className = 'missable-note';
    note.innerHTML = '<strong>Missable:</strong> ';
    note.append(document.createTextNode(trophy.missableNote));
    detailEl.append(note);
  }
  const guideHeading = document.createElement('h3');
  guideHeading.textContent = 'Guide';
  const sourcesHeading = document.createElement('h3');
  sourcesHeading.textContent = 'Sources';
  const sources = document.createElement('ul');
  sources.className = 'source-list';
  for (const key of trophy.cites ?? ['exophase', 'own']) {
    const source = doc.sources[key];
    if (!source) continue;
    const item = document.createElement('li');
    if (source.url) {
      const link = document.createElement('a');
      link.href = source.url;
      link.textContent = source.label;
      item.append(link);
    } else {
      item.textContent = source.label;
    }
    sources.append(item);
  }
  // Sources sit above the guide so the citation is visible at a glance.
  detailEl.append(sourcesHeading, sources, guideHeading);
  if (hidden) {
    const masked = document.createElement('p');
    masked.className = 'spoiler-mask';
    masked.textContent = 'Guide hidden until this trophy is earned — turn off “Hide story spoilers” to reveal it.';
    detailEl.append(masked);
  } else {
    const guide = document.createElement('p');
    guide.textContent = trophy.guide;
    detailEl.append(guide);
    if (Array.isArray(trophy.steps) && trophy.steps.length > 0) {
      const stepsHeading = document.createElement('h3');
      stepsHeading.textContent = 'Steps';
      const steps = document.createElement('ol');
      for (const step of trophy.steps) {
        const item = document.createElement('li');
        item.textContent = step;
        steps.append(item);
      }
      detailEl.append(stepsHeading, steps);
    }
  }
  const markBtn = document.createElement('button');
  markBtn.type = 'button';
  markBtn.className = 'btn' + (earned.has(trophy.name) ? ' earned-btn' : '');
  markBtn.textContent = earned.has(trophy.name) ? '✓ Earned — click to unmark' : 'Mark as earned';
  markBtn.addEventListener('click', () => toggleEarned(trophy.name));
  detailEl.append(markBtn);
}

function toggleEarned(name) {
  if (earned.has(name)) earned.delete(name);
  else earned.add(name);
  saveState();
  renderHeader();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

function renderRoadmap() {
  const host = document.getElementById('roadmapStages');
  host.replaceChildren();
  for (const stage of doc.roadmap) {
    const card = document.createElement('article');
    card.className = 'stage-card';
    const title = document.createElement('h2');
    title.textContent = `Stage ${stage.stage} — ${stage.title}`;
    const goal = document.createElement('p');
    goal.innerHTML = `<strong>Goal:</strong> ${escapeHtml(stage.goal)}`;
    const note = document.createElement('p');
    note.textContent = stage.note;
    const stageTrophies = doc.trophies.filter((t) => t.stage === stage.stage);
    const done = stageTrophies.filter((t) => earned.has(t.name)).length;
    const progress = document.createElement('p');
    progress.className = 'stage-progress';
    progress.textContent = `${done} of ${stageTrophies.length} trophies earned in this stage`;
    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const trophy of stageTrophies) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'stage-chip' + (earned.has(trophy.name) ? ' earned' : '');
      chip.textContent = `${trophy.missable ? '⚠ ' : ''}${displayName(trophy)} (${gradeLabel(trophy.grade)})`;
      chip.addEventListener('click', () => {
        selectedName = trophy.name;
        saveState();
        switchTab('guide');
        renderList();
        renderDetail();
      });
      chips.append(chip);
    }
    card.append(title, progress, goal, note, chips);
    host.append(card);
  }
}

function renderMissables() {
  const host = document.getElementById('missableList');
  host.replaceChildren();
  for (const trophy of doc.trophies.filter((t) => t.missable)) {
    const card = document.createElement('article');
    card.className = 'missable-card';
    const title = document.createElement('h2');
    title.textContent = `⚠ ${trophy.name}`;
    const desc = document.createElement('p');
    desc.innerHTML = `Official description: <q>${escapeHtml(trophy.description)}</q>`;
    const note = document.createElement('p');
    note.className = 'missable-note';
    note.innerHTML = '<strong>Why it can be missed:</strong> ';
    note.append(document.createTextNode(trophy.missableNote ?? 'Tied to a one-off moment in the official description.'));
    const guide = document.createElement('p');
    guide.textContent = trophy.guide;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'btn';
    open.textContent = 'Open full guide';
    open.addEventListener('click', () => {
      selectedName = trophy.name;
      saveState();
      switchTab('guide');
      renderList();
      renderDetail();
    });
    card.append(title, desc, note, guide, open);
    host.append(card);
  }
}

function switchTab(tab) {
  activeTab = tab;
  for (const button of document.querySelectorAll('.tab')) {
    button.classList.toggle('active', button.dataset.tab === tab);
  }
  document.getElementById('view-guide').hidden = tab !== 'guide';
  document.getElementById('view-roadmap').hidden = tab !== 'roadmap';
  document.getElementById('view-missables').hidden = tab !== 'missables';
  document.getElementById('view-settings').hidden = tab !== 'settings';
}

function exportProgress() {
  const payload = {
    app: 'leonida-platinum-gta6-trophy-guide',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
  setIoStatus(`Exported ${earned.size} earned trophies.`);
}

function setIoStatus(message, isError = false) {
  ioStatusEl.textContent = message;
  ioStatusEl.style.color = isError ? '#a11' : '';
  window.clearTimeout(setIoStatus.timer);
  setIoStatus.timer = window.setTimeout(() => { ioStatusEl.textContent = ''; }, 6000);
}

async function importProgressFile(file) {
  if (!file) return;
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    setIoStatus('Import failed: that file is not valid JSON.', true);
    return;
  }
  const names = Array.isArray(parsed) ? parsed : parsed?.earned;
  if (!Array.isArray(names)) {
    setIoStatus('Import failed: expected a JSON file with an "earned" list of trophy names.', true);
    return;
  }
  const known = new Set(doc.trophies.map((t) => t.name));
  const imported = names.filter((n) => typeof n === 'string' && known.has(n));
  const ignored = names.length - imported.length;
  earned = new Set(imported);
  saveState();
  renderHeader();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
  setIoStatus(`Imported ${imported.length} earned trophies${ignored > 0 ? ` (${ignored} unknown names ignored)` : ''}.`);
}

function bindImport(input) {
  input.addEventListener('change', async (event) => {
    await importProgressFile(event.target.files?.[0]);
    input.value = '';
  });
}

function renderAll() {
  renderHeader();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

async function boot() {
  loadSavedState();
  spoilerEl.checked = spoilerOn;
  spoilerSettingsEl.checked = spoilerOn;
  try {
    const response = await fetch('data/trophies.json');
    if (!response.ok) throw new Error(`trophies.json: ${response.status}`);
    doc = await response.json();
  } catch (error) {
    listEl.replaceChildren();
    const item = document.createElement('li');
    item.textContent = `Could not load the trophy data (${error.message}). Check that data/trophies.json is present.`;
    listEl.append(item);
    return;
  }
  if (!doc.trophies.some((t) => t.name === selectedName)) selectedName = doc.trophies[0].name;
  for (const button of document.querySelectorAll('.tab')) {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  }
  searchEl.addEventListener('input', renderList);
  kindEl.addEventListener('change', renderList);
  gradeEl.addEventListener('change', renderList);
  statusEl.addEventListener('change', renderList);
  const setSpoiler = (value) => {
    spoilerOn = value;
    spoilerEl.checked = value;
    spoilerSettingsEl.checked = value;
    saveState();
    renderList();
    renderDetail();
  };
  spoilerEl.addEventListener('change', () => setSpoiler(spoilerEl.checked));
  spoilerSettingsEl.addEventListener('change', () => setSpoiler(spoilerSettingsEl.checked));
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('exportBtn2').addEventListener('click', exportProgress);
  bindImport(document.getElementById('importFile'));
  bindImport(document.getElementById('importFile2'));
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Reset all progress? This clears every earned trophy.')) return;
    earned = new Set();
    saveState();
    renderAll();
    setIoStatus('Progress reset.');
  });
  renderAll();
}

await boot();
