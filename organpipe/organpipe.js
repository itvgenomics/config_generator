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
  sequencing_type: '',

  // Section 2: Quality Control
  run_trimming: '',
  adapters: '',
  minlength: '',
  minquality: '',
  pacbio_adapters: '-b ATCTCTCTCAACAACAACAACGGAGGAGGAGGAAAAGAGAGAGAT -b ATCTCTCTCTTTTCCTCCTCCTCCGTTGTTGTTGTTGAGAGAGAT',

  // Section 3: Assembly (NOVOPlasty)
  reference: '',
  seed_format: '',
  seed_file: '',
  feature: '',
  search_ncbi: '',
  search_genes: '',
  search_term: '',
  max_references: '',
  genome_range: '',
  kmers: '',
  max_memory: '',
  reads_length: '',
  insert_size: '',

  // Section 4: Pipeline Steps
  annotation: 'Yes',
  genetic_code: '',
  run_nhmmer: 'No',
  nhmmer_db: 'resources/rfam.hmm',
  run_images: 'No',

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
  // After transition, hide so it doesn't take up space
  setTimeout(() => {
    if (!el.classList.contains('visible')) {
      // Still hidden — ok
    }
  }, 400);
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
  setRadio('output_format', 'yaml');
  setFieldValue('f-pacbio-adapters', state.pacbio_adapters);
  setFieldValue('f-nhmmer-db', state.nhmmer_db);

  updateConditionals();
  updateYAML();
});

// ----------------------------------------------------------------
// BIND EVENTS
// ----------------------------------------------------------------
function bindEvents() {

  // ---- Text inputs / textareas / number inputs ----
  const textFields = [
    ['f-sample', 'sample'],
    ['f-reads-path', 'reads_path'],
    ['f-adapters', 'adapters'],
    ['f-minlength', 'minlength'],
    ['f-minquality', 'minquality'],
    ['f-pacbio-adapters', 'pacbio_adapters'],
    ['f-reference', 'reference'],
    ['f-seed-file', 'seed_file'],
    ['f-search-genes', 'search_genes'],
    ['f-search-term', 'search_term'],
    ['f-max-refs', 'max_references'],
    ['f-genome-range', 'genome_range'],
    ['f-kmers', 'kmers'],
    ['f-max-memory', 'max_memory'],
    ['f-reads-length', 'reads_length'],
    ['f-insert-size', 'insert_size'],
    ['f-genetic-code', 'genetic_code'],
    ['f-nhmmer-db', 'nhmmer_db'],
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
    ['f-feature', 'feature'],
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
    search_ncbi, run_nhmmer, annotation } = state;

  const isShort = sequencing_type === 'Short';
  const isLong = sequencing_type === 'Long';
  const trimYes = run_trimming === 'Yes';
  const ncbiYes = search_ncbi === 'Yes';
  const nhmmerYes = run_nhmmer === 'Yes';
  const annotationYes = annotation === 'Yes';

  // --- Chloro forces Short reads ---
  const longRadio = document.querySelector('input[name="sequencing_type"][value="Long"]');
  const segLong = $('seg-long');
  if (organelle === 'chloro') {
    if (longRadio) longRadio.disabled = true;
    if (segLong) segLong.classList.add('disabled');
    show('note-chloro');
    // If Long was selected, switch to Short
    if (isLong) {
      const shortRadio = document.querySelector('input[name="sequencing_type"][value="Short"]');
      if (shortRadio) { shortRadio.checked = true; state.sequencing_type = 'Short'; }
    }
  } else {
    if (longRadio) longRadio.disabled = false;
    if (segLong) segLong.classList.remove('disabled');
    hide('note-chloro');
  }

  const effectivelyShort = state.sequencing_type === 'Short';

  // --- Section reveal ---
  const projectComplete = organelle && state.sequencing_type;
  if (projectComplete) {
    revealSection('section-qc', 0);
    if (effectivelyShort) {
      revealSection('section-assembly', 120);
    } else {
      hideSection('section-assembly');
    }
    revealSection('section-steps', effectivelyShort ? 240 : 120);
  }

  // --- QC conditionals ---
  const $shortTrim = $('group-short-trim');
  const $longTrim = $('group-long-trim');

  if ($shortTrim) $shortTrim.classList.toggle('hidden', !(effectivelyShort && trimYes));
  if ($longTrim) $longTrim.classList.toggle('hidden', !(isLong && trimYes));

  // --- Assembly conditionals ---
  const hasSeed = !!seed_format;
  const isGenbank = seed_format === 'genbank';

  const $seedFile = $('group-seed-file');
  const $feature = $('group-feature');
  const $ncbi = $('group-ncbi-fields');

  if ($seedFile) $seedFile.classList.toggle('hidden', !hasSeed);
  if ($feature) $feature.classList.toggle('hidden', !isGenbank);
  if ($ncbi) $ncbi.classList.toggle('hidden', !ncbiYes);

  // --- Steps conditionals ---
  const isMitoLong = isLong && organelle === 'mito';
  const showAnnotation = effectivelyShort || isMitoLong;

  const $annGroup = $('group-annotation');
  const $annFields = $('group-annotation-fields');
  const $nhmmerDb = $('group-nhmmer-db');
  const $imagesGroup = $('group-run-images');

  if ($annGroup) $annGroup.classList.toggle('hidden', !showAnnotation);
  // annotation-dependent fields: only show when annotation=Yes (and supported reads)
  if ($annFields) $annFields.classList.toggle('hidden', !(showAnnotation && annotationYes));
  if ($nhmmerDb) $nhmmerDb.classList.toggle('hidden', !nhmmerYes);
  if ($imagesGroup) $imagesGroup.classList.toggle('hidden', !effectivelyShort);

  // --- Update step number badge ---
  const $stepNum = $('steps-step-number');
  if ($stepNum) $stepNum.textContent = effectivelyShort ? '4' : '3';
}

// ----------------------------------------------------------------
// FORMAT UI SYNC
// ----------------------------------------------------------------
function updateFormatUI() {
  const isCSV = state.format === 'csv';

  // Show/hide CSV controls + import bar
  const $csvCtrl   = $('csv-controls');
  const $importBar = $('csv-import-bar');
  if ($csvCtrl)   $csvCtrl.classList.toggle('hidden', !isCSV);
  if ($importBar) $importBar.classList.toggle('hidden', !isCSV);

  // Update filenames and button labels
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
  const isShort = s.sequencing_type === 'Short';
  const isLong = s.sequencing_type === 'Long';
  const isMitoLong = isLong && s.organelle === 'mito';
  const supportsAnnotation = isShort || isMitoLong;
  const annYes = (s.annotation || 'Yes') === 'Yes';

  // Helper: format a value line
  const line  = (key, val) => `${key}: ${val ?? ''}\n`;
  const qline = (key, val) => `${key}: "${val ?? ''}"\n`;

  let y = '';

  y += qline('sample',          s.sample);
  y += qline('reads_path',      s.reads_path);
  y += qline('organelle',       s.organelle);
  y += qline('sequencing_type', s.sequencing_type);

  y += qline('run_trimming',    s.run_trimming);
  y += qline('adapters',        s.adapters);
  y += line( 'minlength',       s.minlength);
  y += line( 'minquality',      s.minquality);
  y += qline('pacbio_adapters', s.pacbio_adapters);

  y += qline('reference',       s.reference);
  y += qline('seed_format',     s.seed_format);
  y += qline('seed_file',       s.seed_file);
  y += qline('feature',         s.feature);
  y += qline('search_ncbi',     s.search_ncbi);
  y += qline('search_genes',    s.search_genes);
  y += qline('search_term',     s.search_term);
  y += line( 'max_references',  s.max_references);
  y += qline('genome_range',    s.genome_range);
  y += qline('kmers',           s.kmers);
  y += line( 'max_memory',      s.max_memory);
  y += line( 'reads_length',    s.reads_length);
  y += line( 'insert_size',     s.insert_size);

  y += qline('annotation',  supportsAnnotation ? (s.annotation || 'Yes') : 'No');
  y += line( 'genetic_code', supportsAnnotation && annYes ? s.genetic_code : '');

  y += qline('run_nhmmer', supportsAnnotation && annYes ? (s.run_nhmmer || 'No') : 'No');
  y += qline('nhmmer_db',  s.nhmmer_db || 'resources/rfam.hmm');
  y += qline('run_images', isShort && annYes ? (s.run_images || 'No') : 'No');

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

    // Key: value  (but not inside quotes)
    const kv = line.match(/^(\s*)([\w_]+)(\s*:\s*)(.*)$/);
    if (kv) {
      const [, indent, key, sep, raw] = kv;
      let valueHtml;

      if (!raw || raw === '') {
        valueHtml = '';
      } else if (/^".*"$/.test(raw)) {
        // Quoted string
        valueHtml = `<span class="y-string">${esc(raw)}</span>`;
      } else if (/^\d+(\.\d+)?$/.test(raw)) {
        // Number
        valueHtml = `<span class="y-number">${esc(raw)}</span>`;
      } else if (/^(Yes|No|true|false)$/.test(raw)) {
        // Bool-like
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
  ['sample',          (s) => s.sample],
  ['reads_path',      (s) => s.reads_path],
  ['organelle',       (s) => s.organelle],
  ['genetic_code',    (s) => s.genetic_code],
  ['reference',       (s) => s.reference],
  ['sequencing_type', (s) => s.sequencing_type],
  ['genome_range',    (s) => s.genome_range],
  ['annotation',      (s) => s.annotation || 'Yes'],
  ['run_trimming',    (s) => s.run_trimming],
  ['adapters',        (s) => s.adapters],
  ['minlength',       (s) => s.minlength],
  ['minquality',      (s) => s.minquality],
  ['seed_format',     (s) => s.seed_format],
  ['seed_file',       (s) => s.seed_file],
  ['feature',         (s) => s.feature],
  ['search_ncbi',     (s) => s.search_ncbi],
  ['search_genes',    (s) => s.search_genes],
  ['search_term',     (s) => s.search_term],
  ['max_references',  (s) => s.max_references],
  ['kmers',           (s) => s.kmers],
  ['max_memory',      (s) => s.max_memory],
  ['reads_length',    (s) => s.reads_length],
  ['insert_size',     (s) => s.insert_size],
  ['run_nhmmer',      (s) => s.run_nhmmer || 'No'],
  ['nhmmer_db',       (s) => s.nhmmer_db],
  ['run_images',      (s) => s.run_images || 'No'],
  ['pacbio_adapters', (s) => s.pacbio_adapters],
];

function csvVal(v) {
  const str = String(v ?? '');
  // Quote values that contain commas
  return str.includes(',') ? `"${str}"` : str;
}

function stateToCSVRow(s) {
  return CSV_COLUMNS.map(([, fn]) => csvVal(fn(s))).join(',');
}

// ----------------------------------------------------------------
// CSV — MERGE IMPORTED ROW WITH FORM DEFAULTS
// ----------------------------------------------------------------
function mergeWithDefaults(importedRow) {
  // Start with current state fields as defaults
  const merged = {};
  Object.keys(state).forEach((k) => {
    if (k !== 'format' && k !== 'csvRows' && k !== 'importedRows') merged[k] = state[k];
  });
  // Override with non-empty values from the uploaded CSV row
  Object.keys(importedRow).forEach((col) => {
    const val = importedRow[col];
    if (val !== undefined && val !== '') merged[col] = val;
  });
  return merged;
}

function buildCSVPreview() {
  const header      = CSV_COLUMNS.map(([col]) => col).join(',');
  const importedRows = state.importedRows.map((r) => stateToCSVRow(mergeWithDefaults(r)));
  const savedRows   = state.csvRows.map(stateToCSVRow);
  const pendingRow  = stateToCSVRow(state);
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
      // Rows from the uploaded file — amber tint
      return `<span class="csv-imported">${esc(line)}</span>`;
    } else if (i <= importedCount + savedCount) {
      // Manually added rows — normal colour
      return esc(line);
    } else {
      // Pending (current form) row — muted
      return `<span class="csv-pending">${esc(line)}</span>`;
    }
  }).join('\n');
}

// ----------------------------------------------------------------
// ADD / CLEAR CSV ROWS
// ----------------------------------------------------------------
function addCSVRow() {
  // Snapshot current state (exclude format/csvRows)
  const snap = {};
  Object.keys(state).forEach((k) => {
    if (k !== 'format' && k !== 'csvRows') snap[k] = state[k];
  });
  state.csvRows.push(snap);

  // Clear only sample + reads_path so user can enter the next sample
  state.sample    = '';
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
  // Handles quoted values (e.g. "19,23,33")
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

    // Store raw rows — do NOT merge yet (user clicks Generate Rows first)
    state._rawImportRows = rows;
    state.importedRows   = [];   // clear any previous applied rows

    // Switch UI: hide drop zone, show status
    const $dz = $('csv-drop-zone');
    const $ok = $('csv-import-ok');
    if ($dz) $dz.classList.add('hidden');
    if ($ok) $ok.classList.remove('hidden');

    const $label    = $('csv-import-label');
    const $filename = $('csv-import-filename');
    const $applyBtn = $('btn-apply-import');
    if ($label)    $label.textContent    = `${rows.length} row${rows.length !== 1 ? 's' : ''} loaded`;
    if ($filename) $filename.textContent = file.name;
    // Reset button to initial state
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

  // Merge raw imported rows with current form defaults
  state.importedRows = [...state._rawImportRows];

  // Update the button to show it has been applied
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

  // Switch UI: show drop zone, hide status
  const $dz = $('csv-drop-zone');
  const $ok = $('csv-import-ok');
  if ($dz) $dz.classList.remove('hidden');
  if ($ok) $ok.classList.add('hidden');

  // Reset button label for next upload
  const $applyBtn = $('btn-apply-import');
  if ($applyBtn) {
    $applyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Generate Rows`;
  }

  // Clear the file input so the same file can be re-selected
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
  const isCSV = state.format === 'csv';
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

  // Reset state
  Object.keys(state).forEach((k) => { state[k] = ''; });
  state.pacbio_adapters = '-b ATCTCTCTCAACAACAACAACGGAGGAGGAGGAAAAGAGAGAGAT -b ATCTCTCTCTTTTCCTCCTCCTCCGTTGTTGTTGTTGAGAGAGAT';
  state.annotation  = 'Yes';
  state.run_nhmmer  = 'No';
  state.nhmmer_db   = 'resources/rfam.hmm';
  state.run_images  = 'No';
  state.format       = 'yaml';
  state.csvRows      = [];
  state.importedRows = [];
  state._rawImportRows = [];


  // Reset all inputs
  document.querySelectorAll('.field-input, .field-select').forEach((el) => {
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else if (el.id === 'f-pacbio-adapters') el.value = state.pacbio_adapters;
    else if (el.id === 'f-nhmmer-db') el.value = state.nhmmer_db;
    else el.value = '';
  });

  // Reset radios
  document.querySelectorAll('input[type="radio"]').forEach((r) => { r.checked = false; });
  setRadio('annotation', 'Yes');
  setRadio('run_nhmmer', 'No');
  setRadio('run_images', 'No');
  setRadio('output_format', 'yaml');

  // Reset CSV counter and import UI
  updateCSVCounter();
  clearImport();

  // Hide revealed sections
  ['section-qc', 'section-assembly', 'section-steps'].forEach(hideSection);

  updateFormatUI();
  updateConditionals();
  updateYAML();
}
