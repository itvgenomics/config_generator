// ================================================================
//  OrganPipe — organpipe.js
//  State management, conditional display, YAML generation
// ================================================================

// ----------------------------------------------------------------
// STATE
// ----------------------------------------------------------------
const state = {
  // Section 1: Project Info
  sample: '',
  reads_path: '',
  organelle: '',
  genetic_code: '',
  sequencing_type: '',

  // Section 2: Quality Control
  run_trimming: '',
  adapters: '',
  minlength: '',
  minquality: '',
  pacbio_adapters: '-b ATCTCTCTCAACAACAACAACGGAGGAGGAGGAAAAGAGAGAGAT -b ATCTCTCTCTTTTCCTCCTCCTCCGTTGTTGTTGTTGAGAGAGAT',

  // Section 3: Pipeline Steps
  annotation: 'Yes',
  run_nhmmer: 'No',
  run_images: 'No',

  // Section 4: NOVOPlasty Assembly
  run_novoplasty: 'Yes',
  genome_range: '',
  reference: '',
  seed_format: '',
  seed_file: '',
  feature: '',
  search_ncbi: '',
  search_genes: '',
  search_term: '',
  max_references: '',
  kmers: '',
  max_memory: '',
  reads_length: '',
  insert_size: '',

  // Section 5: GetOrganelle
  run_getorganelle: 'No',
  database: '',
  n_rounds: '',
  target_size: '',
  spades_kmers: '',
  extra_flags: '',

  // Section 6: MitoHifi
  search_species: '',
  n_references: '',

  // Output format
  format: 'yaml',        // 'yaml' | 'csv'
  csvRows: [],           // manually added CSV rows (state snapshots)
  importedRows: [],      // rows applied to the output (after Generate is clicked)
  _rawImportRows: [],    // raw rows from uploaded file (before Generate)
};

// ----------------------------------------------------------------
// DOM HELPERS
// ----------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const show = (id) => { const el = $(id); if (el) el.classList.remove('hidden'); };
const hide = (id) => { const el = $(id); if (el) el.classList.add('hidden'); };

function revealSection(id, delay = 0) {
  const el = $(id);
  if (!el) return;
  el.removeAttribute('aria-hidden');
  el.classList.add('visible');

  setTimeout(() => {
    el.classList.add('revealed');
  }, delay + 20);
}

function hideSection(id) {
  const el = $(id);
  if (!el) return;
  el.setAttribute('aria-hidden', 'true');
  el.classList.remove('visible', 'revealed');
}

function setFieldValue(id, value) {
  const el = $(id);
  if (!el) return;
  el.value = value;
}

// ----------------------------------------------------------------
// INIT
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  // Set default radio states from state object
  setRadio('annotation', state.annotation);
  setRadio('run_nhmmer', state.run_nhmmer);
  setRadio('run_images', state.run_images);
  setRadio('run_novoplasty', state.run_novoplasty);
  setRadio('run_getorganelle', state.run_getorganelle);
  setRadio('output_format', 'yaml');
  setFieldValue('f-pacbio-adapters', state.pacbio_adapters);

  updateConditionals();
  updateYAML();
});

// ----------------------------------------------------------------
// BIND EVENTS
// ----------------------------------------------------------------
function bindEvents() {

  // ---- Text inputs / textareas / number inputs ----
  const textFields = [
    ['f-sample',          'sample'],
    ['f-reads-path',      'reads_path'],
    ['f-genetic-code',    'genetic_code'],
    ['f-adapters',        'adapters'],
    ['f-minlength',       'minlength'],
    ['f-minquality',      'minquality'],
    ['f-pacbio-adapters', 'pacbio_adapters'],
    ['f-reference',       'reference'],
    ['f-seed-file',       'seed_file'],
    ['f-search-genes',    'search_genes'],
    ['f-search-term',     'search_term'],
    ['f-max-refs',        'max_references'],
    ['f-genome-range',    'genome_range'],
    ['f-kmers',           'kmers'],
    ['f-max-memory',      'max_memory'],
    ['f-reads-length',    'reads_length'],
    ['f-insert-size',     'insert_size'],
    // GetOrganelle
    ['f-n-rounds',        'n_rounds'],
    ['f-target-size',     'target_size'],
    ['f-spades-kmers',    'spades_kmers'],
    ['f-extra-flags',     'extra_flags'],
    // MitoHifi
    ['f-search-species',  'search_species'],
    ['f-n-references',    'n_references'],
  ];

  textFields.forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      state[key] = e.target.value.trim();
      updateConditionals();
      updateYAML();
    });
  });

  // ---- Select inputs ----
  const selectFields = [
    ['f-seed-format', 'seed_format'],
    ['f-feature',     'feature'],
    ['f-database',    'database'],
  ];

  selectFields.forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      state[key] = e.target.value;
      updateConditionals();
      updateYAML();
    });
  });

  // ---- Radio groups ----
  const radioGroups = [
    'organelle',
    'sequencing_type',
    'run_trimming',
    'search_ncbi',
    'annotation',
    'run_nhmmer',
    'run_images',
    'run_novoplasty',
    'run_getorganelle',
  ];

  radioGroups.forEach((name) => {
    document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
      radio.addEventListener('change', (e) => {
        state[name] = e.target.value;
        updateConditionals();
        updateYAML();
      });
    });
  });

  // ---- Action buttons ----
  $('btn-download').addEventListener('click', downloadOutput);
  $('btn-copy').addEventListener('click', () => copyOutput('btn-copy'));
  $('btn-copy-yaml').addEventListener('click', () => copyOutput('btn-copy-yaml'));
  $('btn-reset').addEventListener('click', resetForm);

  // ---- Format toggle ----
  document.querySelectorAll('input[name="output_format"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.format = e.target.value;
      updateFormatUI();
      updateYAML();
    });
  });

  // ---- CSV row management ----
  $('btn-add-row').addEventListener('click', addCSVRow);
  $('btn-clear-rows').addEventListener('click', clearCSVRows);

  // ---- CSV import ----
  const fileInput = $('f-csv-import');
  const dropZone  = $('csv-drop-zone');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleImport(e.target.files[0]);
    });
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleImport(file);
    });
  }

  const $clearImport = $('btn-clear-import');
  if ($clearImport) $clearImport.addEventListener('click', clearImport);

  const $applyImport = $('btn-apply-import');
  if ($applyImport) $applyImport.addEventListener('click', applyImport);
}

// ----------------------------------------------------------------
// HELPER: set radio checked state
// ----------------------------------------------------------------
function setRadio(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}

// ----------------------------------------------------------------
// CONDITIONALS
// ----------------------------------------------------------------
function updateConditionals() {
  const { organelle, sequencing_type, run_trimming, seed_format,
    search_ncbi, run_nhmmer, annotation, run_novoplasty, run_getorganelle } = state;

  const isShort = sequencing_type === 'Short';
  const isLong  = sequencing_type === 'Long';
  const trimYes          = run_trimming    === 'Yes';
  const ncbiYes          = search_ncbi     === 'Yes';
  const nhmmerYes        = run_nhmmer      === 'Yes';
  const annotationYes    = annotation      === 'Yes';
  const novoYes          = run_novoplasty  === 'Yes';
  const getOrganelleYes  = run_getorganelle === 'Yes';

  // --- Chloro forces Short reads ---
  const longRadio = document.querySelector('input[name="sequencing_type"][value="Long"]');
  const segLong   = $('seg-long');
  if (organelle === 'chloro') {
    if (longRadio) longRadio.disabled = true;
    if (segLong)   segLong.classList.add('disabled');
    show('note-chloro');
    if (isLong) {
      const shortRadio = document.querySelector('input[name="sequencing_type"][value="Short"]');
      if (shortRadio) { shortRadio.checked = true; state.sequencing_type = 'Short'; }
    }
  } else {
    if (longRadio) longRadio.disabled = false;
    if (segLong)   segLong.classList.remove('disabled');
    hide('note-chloro');
  }

  const effectivelyShort = state.sequencing_type === 'Short';
  const isMitoLong       = isLong && organelle === 'mito';

  // --- Section reveal ---
  const projectComplete = organelle && state.sequencing_type;
  if (projectComplete) {
    revealSection('section-qc', 0);
    revealSection('section-steps', 80);

    // NOVOPlasty: short reads only
    if (effectivelyShort) {
      revealSection('section-novoplasty', 160);
    } else {
      hideSection('section-novoplasty');
    }

    // GetOrganelle: short reads only
    if (effectivelyShort) {
      revealSection('section-getorganelle', 240);
    } else {
      hideSection('section-getorganelle');
    }

    // MitoHifi: long mito only
    if (isMitoLong) {
      revealSection('section-mitohifi', 160);
    } else {
      hideSection('section-mitohifi');
    }
  }

  // --- QC conditionals ---
  const $shortTrim = $('group-short-trim');
  const $longTrim  = $('group-long-trim');
  if ($shortTrim) $shortTrim.classList.toggle('hidden', !(effectivelyShort && trimYes));
  if ($longTrim)  $longTrim.classList.toggle('hidden',  !(isLong && trimYes));

  // --- NOVOPlasty conditionals ---
  const $novoParams = $('group-novo-params');
  if ($novoParams) $novoParams.classList.toggle('hidden', !novoYes);

  // --- Seed / NCBI conditionals (inside NOVOPlasty) ---
  const hasSeed    = !!seed_format;
  const isGenbank  = seed_format === 'genbank';
  const $seedFile  = $('group-seed-file');
  const $feature   = $('group-feature');
  const $ncbi      = $('group-ncbi-fields');
  if ($seedFile) $seedFile.classList.toggle('hidden', !hasSeed);
  if ($feature)  $feature.classList.toggle('hidden',  !isGenbank);
  if ($ncbi)     $ncbi.classList.toggle('hidden',     !ncbiYes);

  // --- GetOrganelle conditionals ---
  const $goFields = $('group-go-fields');
  if ($goFields) $goFields.classList.toggle('hidden', !getOrganelleYes);

  // --- Steps conditionals ---
  // annotation: short reads only
  const showAnnotation = effectivelyShort;
  // nhmmer: short+annYes OR long mito
  const showNhmmer = (effectivelyShort && annotationYes) || isMitoLong;
  // images: short + annYes only
  const showImages = effectivelyShort && annotationYes;

  const $annGroup    = $('group-annotation');
  const $nhmmerGroup = $('group-nhmmer');
  const $imagesGroup = $('group-run-images');
  if ($annGroup)    $annGroup.classList.toggle('hidden',    !showAnnotation);
  if ($nhmmerGroup) $nhmmerGroup.classList.toggle('hidden', !showNhmmer);
  if ($imagesGroup) $imagesGroup.classList.toggle('hidden', !showImages);

  // --- Update step number badges ---
  const $stepsNum = $('steps-step-number');
  if ($stepsNum) $stepsNum.textContent = '3';

  const $novoNum = $('novo-step-number');
  if ($novoNum) $novoNum.textContent = effectivelyShort ? '4' : '—';

  const $goNum = $('go-step-number');
  if ($goNum) $goNum.textContent = effectivelyShort ? '5' : '—';

  const $mhNum = $('mh-step-number');
  if ($mhNum) $mhNum.textContent = isMitoLong ? '4' : '—';
}

// ----------------------------------------------------------------
// FORMAT UI SYNC
// ----------------------------------------------------------------
function updateFormatUI() {
  const isCSV = state.format === 'csv';

  const $csvCtrl   = $('csv-controls');
  const $importBar = $('csv-import-bar');
  if ($csvCtrl)   $csvCtrl.classList.toggle('hidden', !isCSV);
  if ($importBar) $importBar.classList.toggle('hidden', !isCSV);

  const $filename  = $('yaml-filename');
  const $copyLabel = $('btn-copy-label');
  const $dlLabel   = $('btn-download-label');
  if ($filename)  $filename.textContent  = isCSV ? 'samples.csv' : 'config.yaml';
  if ($copyLabel) $copyLabel.textContent = isCSV ? 'Copy CSV'    : 'Copy YAML';
  if ($dlLabel)   $dlLabel.textContent   = isCSV ? 'Download .csv' : 'Download .yml';
}

// ----------------------------------------------------------------
// YAML GENERATION
// ----------------------------------------------------------------
function generateYAML() {
  const s = state;
  const isShort       = s.sequencing_type === 'Short';
  const isLong        = s.sequencing_type === 'Long';
  const isMitoLong    = isLong && s.organelle === 'mito';
  const supportsAnnotation = isShort || isMitoLong;
  const annYes        = (s.annotation || 'Yes') === 'Yes';
  const novoYes       = (s.run_novoplasty || 'Yes') === 'Yes';
  const goYes         = s.run_getorganelle === 'Yes';

  const line  = (key, val) => `${key}: ${val ?? ''}\n`;
  const qline = (key, val) => `${key}: "${val ?? ''}"\n`;
  // Emit a compact 3-line section header with no blank lines between the ### rows
  const sectionHeader = (border, title) => `\n${border}\n${title}\n${border}\n`;

  let y = '';

  // --- Project Info ---
  y += sectionHeader('################################', '######### PROJECT INFO #########');
  y += qline('sample',          s.sample);
  y += qline('reads_path',      s.reads_path);
  y += qline('organelle',       s.organelle);
  y += line( 'genetic_code',    isShort && annYes ? s.genetic_code : '');
  y += qline('sequencing_type', s.sequencing_type);

  // nhmmer: show when short+annYes OR long mito
  const showNhmmerYaml = (isShort && annYes) || isMitoLong;

  // --- Pipeline Steps ---
  y += sectionHeader('##################################', '######## OrganPipe Steps #########');
  y += qline('run_trimming',  s.run_trimming);
  y += qline('annotation',    isShort ? (s.annotation || 'Yes') : 'No');
  y += qline('run_nhmmer',    showNhmmerYaml ? (s.run_nhmmer || 'No') : 'No');
  y += qline('run_images',    isShort && annYes ? (s.run_images || 'No') : 'No');

  // --- Quality Control ---
  y += sectionHeader('################################', '####### QUALITY CONTROL ########');
  y += qline('adapters',        s.adapters);
  y += line( 'minlength',       s.minlength);
  y += line( 'minquality',      s.minquality);
  y += qline('pacbio_adapters', s.pacbio_adapters);

  // --- NOVOPlasty ---
  y += sectionHeader('################################', '####### NOVOPlasty INFO ########');
  y += qline('run_novoplasty', isShort ? (s.run_novoplasty || 'Yes') : 'No');
  y += qline('genome_range',   s.genome_range);
  y += qline('reference',      s.reference);
  y += qline('seed_format',    s.seed_format);
  y += qline('seed_file',      s.seed_file);
  y += qline('feature',        s.feature);
  y += qline('search_ncbi',    s.search_ncbi);
  y += qline('search_genes',   s.search_genes);
  y += qline('search_term',    s.search_term);
  y += line( 'max_references', s.max_references);
  y += qline('kmers',          s.kmers);
  y += line( 'max_memory',     s.max_memory);
  y += line( 'reads_length',   s.reads_length);
  y += line( 'insert_size',    s.insert_size);

  // --- GetOrganelle ---
  y += sectionHeader('################################', '###### GetOrganelle INFO #######');
  y += qline('run_getorganelle', isShort ? (s.run_getorganelle || 'No') : 'No');
  y += qline('database',         s.database);
  y += line( 'n_rounds',         s.n_rounds);
  y += line( 'target_size',      s.target_size);
  y += qline('spades_kmers',     s.spades_kmers);
  y += qline('extra_flags',      s.extra_flags);

  // --- MitoHifi ---
  y += sectionHeader('################################', '######## MitoHifi INFO #########');
  y += qline('search_species', s.search_species);
  y += line( 'n_references',   s.n_references);

  return y;
}

// ----------------------------------------------------------------
// YAML SYNTAX HIGHLIGHTING
// ----------------------------------------------------------------
function highlightYAML(text) {
  const lines = text.split('\n');
  return lines.map((line) => {
    // Comment lines
    if (/^\s*#/.test(line)) {
      return `<span class="y-comment">${esc(line)}</span>`;
    }

    // Key: value
    const kv = line.match(/^(\s*)([\w_]+)(\s*:\s*)(.*)$/);
    if (kv) {
      const [, indent, key, sep, raw] = kv;
      let valueHtml;

      if (!raw || raw === '') {
        valueHtml = '';
      } else if (/^".*"$/.test(raw)) {
        valueHtml = `<span class="y-string">${esc(raw)}</span>`;
      } else if (/^\d+(\.\d+)?$/.test(raw)) {
        valueHtml = `<span class="y-number">${esc(raw)}</span>`;
      } else if (/^(Yes|No|true|false)$/.test(raw)) {
        valueHtml = `<span class="y-bool">${esc(raw)}</span>`;
      } else {
        valueHtml = `<span class="y-string">${esc(raw)}</span>`;
      }

      return `${esc(indent)}<span class="y-key">${esc(key)}</span><span class="y-sep">${esc(sep)}</span>${valueHtml}`;
    }

    return esc(line);
  }).join('\n');
}

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ----------------------------------------------------------------
// UPDATE OUTPUT PREVIEW
// ----------------------------------------------------------------
function updateYAML() {
  const isCSV = state.format === 'csv';
  const code    = $('yaml-code');
  const counter = $('yaml-line-count');

  if (isCSV) {
    const csv = buildCSVPreview();
    if (code) code.innerHTML = highlightCSV(csv);
    const rowCount = state.csvRows.length;
    if (counter) counter.textContent = `${rowCount} saved row${rowCount !== 1 ? 's' : ''}`;
  } else {
    const yaml = generateYAML();
    if (code) code.innerHTML = highlightYAML(yaml);
    if (counter) counter.textContent = `${yaml.split('\n').length} lines`;
  }
}

// ----------------------------------------------------------------
// CSV — COLUMN DEFINITIONS
// ----------------------------------------------------------------
const CSV_COLUMNS = [
  ['sample',           (s) => s.sample],
  ['reads_path',       (s) => s.reads_path],
  ['organelle',        (s) => s.organelle],
  ['genetic_code',     (s) => s.genetic_code],
  ['sequencing_type',  (s) => s.sequencing_type],
  ['run_trimming',     (s) => s.run_trimming],
  ['annotation',       (s) => s.annotation || 'Yes'],
  ['run_nhmmer',       (s) => s.run_nhmmer || 'No'],
  ['run_images',       (s) => s.run_images || 'No'],
  ['adapters',         (s) => s.adapters],
  ['minlength',        (s) => s.minlength],
  ['minquality',       (s) => s.minquality],
  ['pacbio_adapters',  (s) => s.pacbio_adapters],
  ['run_novoplasty',   (s) => s.run_novoplasty || 'Yes'],
  ['genome_range',     (s) => s.genome_range],
  ['reference',        (s) => s.reference],
  ['seed_format',      (s) => s.seed_format],
  ['seed_file',        (s) => s.seed_file],
  ['feature',          (s) => s.feature],
  ['search_ncbi',      (s) => s.search_ncbi],
  ['search_genes',     (s) => s.search_genes],
  ['search_term',      (s) => s.search_term],
  ['max_references',   (s) => s.max_references],
  ['kmers',            (s) => s.kmers],
  ['max_memory',       (s) => s.max_memory],
  ['reads_length',     (s) => s.reads_length],
  ['insert_size',      (s) => s.insert_size],
  ['run_getorganelle', (s) => s.run_getorganelle || 'No'],
  ['database',         (s) => s.database],
  ['n_rounds',         (s) => s.n_rounds],
  ['target_size',      (s) => s.target_size],
  ['spades_kmers',     (s) => s.spades_kmers],
  ['extra_flags',      (s) => s.extra_flags],
  ['search_species',   (s) => s.search_species],
  ['n_references',     (s) => s.n_references],
];

function csvVal(v) {
  const str = String(v ?? '');
  return str.includes(',') ? `"${str}"` : str;
}

function stateToCSVRow(s) {
  return CSV_COLUMNS.map(([, fn]) => csvVal(fn(s))).join(',');
}

// ----------------------------------------------------------------
// CSV — MERGE IMPORTED ROW WITH FORM DEFAULTS
// ----------------------------------------------------------------
function mergeWithDefaults(importedRow) {
  const merged = {};
  Object.keys(state).forEach((k) => {
    if (k !== 'format' && k !== 'csvRows' && k !== 'importedRows') merged[k] = state[k];
  });
  Object.keys(importedRow).forEach((col) => {
    const val = importedRow[col];
    if (val !== undefined && val !== '') merged[col] = val;
  });
  return merged;
}

function buildCSVPreview() {
  const header       = CSV_COLUMNS.map(([col]) => col).join(',');
  const importedRows = state.importedRows.map((r) => stateToCSVRow(mergeWithDefaults(r)));
  const savedRows    = state.csvRows.map(stateToCSVRow);
  const pendingRow   = stateToCSVRow(state);
  return [header, ...importedRows, ...savedRows, pendingRow].join('\n');
}

function generateCSV() {
  const header       = CSV_COLUMNS.map(([col]) => col).join(',');
  const importedRows = state.importedRows.map((r) => stateToCSVRow(mergeWithDefaults(r)));
  const savedRows    = state.csvRows.map(stateToCSVRow);
  const rows         = [...importedRows, ...savedRows];
  if (state.sample) rows.push(stateToCSVRow(state));
  return [header, ...rows].join('\n');
}

// ----------------------------------------------------------------
// CSV HIGHLIGHTING
// ----------------------------------------------------------------
function highlightCSV(text) {
  const lines         = text.split('\n');
  const importedCount = state.importedRows.length;
  const savedCount    = state.csvRows.length;
  return lines.map((line, i) => {
    if (i === 0) {
      return `<span class="csv-header">${esc(line)}</span>`;
    } else if (i <= importedCount) {
      return `<span class="csv-imported">${esc(line)}</span>`;
    } else if (i <= importedCount + savedCount) {
      return esc(line);
    } else {
      return `<span class="csv-pending">${esc(line)}</span>`;
    }
  }).join('\n');
}

// ----------------------------------------------------------------
// ADD / CLEAR CSV ROWS
// ----------------------------------------------------------------
function addCSVRow() {
  const snap = {};
  Object.keys(state).forEach((k) => {
    if (k !== 'format' && k !== 'csvRows') snap[k] = state[k];
  });
  state.csvRows.push(snap);

  state.sample     = '';
  state.reads_path = '';
  setFieldValue('f-sample', '');
  setFieldValue('f-reads-path', '');

  updateCSVCounter();
  updateYAML();
}

function clearCSVRows() {
  if (state.csvRows.length === 0) return;
  if (!confirm(`Clear all ${state.csvRows.length} saved row${state.csvRows.length !== 1 ? 's' : ''}?`)) return;
  state.csvRows = [];
  updateCSVCounter();
  updateYAML();
}

function updateCSVCounter() {
  const el = $('csv-row-count');
  if (!el) return;
  const n = state.importedRows.length + state.csvRows.length;
  el.textContent = n === 1 ? '1 row' : `${n} rows`;
}

// ----------------------------------------------------------------
// CSV IMPORT (file upload + drag & drop)
// ----------------------------------------------------------------
function parseCsvLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsvImport(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
    return row;
  });
}

function handleImport(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const rows = parseCsvImport(e.target.result);

    state._rawImportRows = rows;
    state.importedRows   = [];

    const $dz = $('csv-drop-zone');
    const $ok = $('csv-import-ok');
    if ($dz) $dz.classList.add('hidden');
    if ($ok) $ok.classList.remove('hidden');

    const $label    = $('csv-import-label');
    const $filename = $('csv-import-filename');
    const $applyBtn = $('btn-apply-import');
    if ($label)    $label.textContent    = `${rows.length} row${rows.length !== 1 ? 's' : ''} loaded`;
    if ($filename) $filename.textContent = file.name;
    if ($applyBtn) {
      $applyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Generate Rows`;
    }

    updateCSVCounter();
    updateYAML();
  };
  reader.readAsText(file);
}

function applyImport() {
  if (state._rawImportRows.length === 0) return;

  state.importedRows = [...state._rawImportRows];

  const $applyBtn = $('btn-apply-import');
  if ($applyBtn) {
    $applyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2a4 4 0 110 8 4 4 0 010-8zM10 2l-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Regenerate`;
  }

  updateCSVCounter();
  updateYAML();
}

function clearImport() {
  state.importedRows    = [];
  state._rawImportRows  = [];

  const $dz = $('csv-drop-zone');
  const $ok = $('csv-import-ok');
  if ($dz) $dz.classList.remove('hidden');
  if ($ok) $ok.classList.add('hidden');

  const $applyBtn = $('btn-apply-import');
  if ($applyBtn) {
    $applyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Generate Rows`;
  }

  const $fi = $('f-csv-import');
  if ($fi) $fi.value = '';

  updateCSVCounter();
  updateYAML();
}

// ----------------------------------------------------------------
// COPY OUTPUT
// ----------------------------------------------------------------
function copyOutput(triggerId) {
  const text = state.format === 'csv' ? generateCSV() : generateYAML();
  navigator.clipboard.writeText(text).then(() => {
    const toast = $('yaml-copy-toast');
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 2000);
    }
    const btn = $(triggerId);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '✓ Copied';
      setTimeout(() => { btn.textContent = orig; }, 1800);
    }
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ----------------------------------------------------------------
// DOWNLOAD OUTPUT
// ----------------------------------------------------------------
function downloadOutput() {
  const isCSV    = state.format === 'csv';
  const text     = isCSV ? generateCSV()  : generateYAML();
  const mimeType = isCSV ? 'text/csv'     : 'text/yaml';
  const filename = isCSV ? 'samples.csv'  : 'config.yaml';
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------
// RESET FORM
// ----------------------------------------------------------------
function resetForm() {
  if (!confirm('Reset all fields to their defaults?')) return;

  Object.keys(state).forEach((k) => { state[k] = ''; });
  state.pacbio_adapters  = '-b ATCTCTCTCAACAACAACAACGGAGGAGGAGGAAAAGAGAGAGAT -b ATCTCTCTCTTTTCCTCCTCCTCCGTTGTTGTTGTTGAGAGAGAT';
  state.annotation       = 'Yes';
  state.run_nhmmer       = 'No';
  state.run_images       = 'No';
  state.run_novoplasty   = 'Yes';
  state.run_getorganelle = 'No';
  state.format           = 'yaml';
  state.csvRows          = [];
  state.importedRows     = [];
  state._rawImportRows   = [];

  document.querySelectorAll('.field-input, .field-select').forEach((el) => {
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else if (el.id === 'f-pacbio-adapters') el.value = state.pacbio_adapters;
    else el.value = '';
  });

  document.querySelectorAll('input[type="radio"]').forEach((r) => { r.checked = false; });
  setRadio('annotation',       'Yes');
  setRadio('run_nhmmer',       'No');
  setRadio('run_images',       'No');
  setRadio('run_novoplasty',   'Yes');
  setRadio('run_getorganelle', 'No');
  setRadio('output_format',    'yaml');

  updateCSVCounter();
  clearImport();

  ['section-qc', 'section-steps', 'section-novoplasty',
   'section-getorganelle', 'section-mitohifi'].forEach(hideSection);

  // Hide pipeline step conditionals
  ['group-annotation', 'group-nhmmer', 'group-run-images'].forEach((id) => {
    const el = $(id); if (el) el.classList.add('hidden');
  });

  updateFormatUI();
  updateConditionals();
  updateYAML();
}
