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
  $('btn-download').addEventListener('click', downloadYAML);
  $('btn-copy').addEventListener('click', () => copyYAML('btn-copy'));
  $('btn-copy-yaml').addEventListener('click', () => copyYAML('btn-copy-yaml'));
  $('btn-reset').addEventListener('click', resetForm);
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
// UPDATE YAML PREVIEW
// ----------------------------------------------------------------
function updateYAML() {
  const yaml = generateYAML();
  const code = $('yaml-code');
  const counter = $('yaml-line-count');

  if (code) code.innerHTML = highlightYAML(yaml);
  if (counter) counter.textContent = `${yaml.split('\n').length} lines`;
}

// ----------------------------------------------------------------
// COPY YAML
// ----------------------------------------------------------------
function copyYAML(triggerId) {
  const yaml = generateYAML();
  navigator.clipboard.writeText(yaml).then(() => {
    const toast = $('yaml-copy-toast');
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 2000);
    }

    // Flash the button
    const btn = $(triggerId);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '✓ Copied';
      setTimeout(() => { btn.textContent = orig; }, 1800);
    }
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = yaml;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ----------------------------------------------------------------
// DOWNLOAD YAML
// ----------------------------------------------------------------
function downloadYAML() {
  const yaml = generateYAML();
  const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'config.yaml';
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
  state.annotation = 'Yes';
  state.run_nhmmer = 'No';
  state.nhmmer_db = 'resources/rfam.hmm';
  state.run_images = 'No';

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

  // Hide revealed sections
  ['section-qc', 'section-assembly', 'section-steps'].forEach(hideSection);

  updateConditionals();
  updateYAML();
}
