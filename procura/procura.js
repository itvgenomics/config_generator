// ================================================================
//  ProCura — procura.js
//  3-mode configurator: hapcuration | dualcuration | finalgenome
//  State management, conditional display, config check, YAML generation
// ================================================================

// ----------------------------------------------------------------
// DEFAULTS (ProCura 1.1.0 config/config_<mode>.yaml)
// ----------------------------------------------------------------
const PRETEXTMAP_DEFAULTS = {
  hapcuration:  '--sortby nosort --ultraRes',
  dualcuration: '--sortby nosort --ultraRes',
  finalgenome:  '--sortby length --ultraRes',
};

const DEFAULTS = {
  mode: '',   // 'hapcuration' | 'dualcuration' | 'finalgenome'

  // Shared — Sample & Reads
  sample:      '',
  r1_path:     '',
  r2_path:     '',
  hifi_path:   '',
  genome_size: '',

  // Hap + Dual Curation — haplotype paths
  hap1_path: '',
  hap2_path: '',

  // Dual Curation — AGP files for hap1/hap2
  agp_hap1: '',
  agp_hap2: '',

  // Final Genome — diploid path + AGP
  diploid_path: '',
  agp_diploid:  '',

  // Final Genome — BUSCO lineage
  buscodb: '',

  // Hap Curation + Final Genome — NCBI RefSeq (one per line in textarea)
  ncbi_refseq: '',

  // Hap Curation — ortholog track
  ortholog_taxon: '',

  // Tool Parameters — FastK (finalgenome only)
  fastk_default: '-v -M32 -t1',
  fastk_kmer:    '31',

  // Tool Parameters — BWA-MEM2
  bwa_mem2_default: '-SP -T0',

  // Tool Parameters — pairtools
  pairtools_min_mapq: '5',
  pairtools_default:  '--walks-policy 5unique --max-inter-align-gap 30',

  // Tool Parameters — PretextMap (default follows the mode)
  pretextmap_default: PRETEXTMAP_DEFAULTS.hapcuration,
};

// ----------------------------------------------------------------
// STATE
// ----------------------------------------------------------------
const state = { ...DEFAULTS };

// Fields that were edited at least once (used to flag empty required fields)
const touched = new Set();

// ----------------------------------------------------------------
// FIELD MAPS
// ----------------------------------------------------------------
const TEXT_FIELDS = [
  ['f-sample',          'sample'],
  ['f-r1',              'r1_path'],
  ['f-r2',              'r2_path'],
  ['f-hifi',            'hifi_path'],
  ['f-hap1',            'hap1_path'],
  ['f-hap2',            'hap2_path'],
  ['f-agp-hap1',        'agp_hap1'],
  ['f-agp-hap2',        'agp_hap2'],
  ['f-diploid',         'diploid_path'],
  ['f-agp-diploid',     'agp_diploid'],
  ['f-buscodb',         'buscodb'],
  ['f-ncbi-refseq',     'ncbi_refseq'],
  ['f-ortholog',        'ortholog_taxon'],
  ['f-fastk-default',   'fastk_default'],
  ['f-fastk-kmer',      'fastk_kmer'],
  ['f-bwa-mem2',        'bwa_mem2_default'],
  ['f-pairtools-mapq',  'pairtools_min_mapq'],
  ['f-pairtools',       'pairtools_default'],
  ['f-pretextmap',      'pretextmap_default'],
];

const SELECT_FIELDS = [
  ['f-genome-size', 'genome_size'],
];

// state key -> element to highlight/focus for config check messages
const FIELD_ELEMENT = Object.fromEntries([...TEXT_FIELDS, ...SELECT_FIELDS].map(([id, key]) => [key, id]));

// ----------------------------------------------------------------
// MODE TEXTS
// ----------------------------------------------------------------
const MODE_NEXT = {
  hapcuration:  'Next: open the maps (<code>workflow/report/hapcuration/{sample}.ProCura.hap{1,2}.{dup,dedup}.pretext</code>) ' +
                'in PretextView, curate hap1 and hap2, and save one AGP file per haplotype for <code>-dualcuration</code>.',
  dualcuration: 'Next: open <code>workflow/report/dualcuration/{sample}.ProCura.diploid.dup.pretext</code> in PretextView, ' +
                'curate both haplotypes together, and save one AGP file for <code>-finalgenome</code>.',
  finalgenome:  'Last step: the final curated hap1/hap2 FASTA files (<code>{sample}.curated.final.h{1,2}.fasta</code>) ' +
                'and their quality reports are written to <code>workflow/report/finalgenome/</code>.',
};

const HIFI_HINTS = {
  hapcuration:  'PacBio HiFi reads merged into a single <code>.fastq.gz</code> file. Used for the HiFi coverage track.',
  dualcuration: 'PacBio HiFi reads merged into a single <code>.fastq.gz</code> file. Used for the HiFi coverage track.',
  finalgenome:  'PacBio HiFi reads merged into a single <code>.fastq.gz</code> file. Used for the k-mer evaluation ' +
                '(FastK and MerquryFK).',
};

const PRETEXTMAP_HINTS = {
  hapcuration:  '<code>--sortby nosort</code>: keep the sequences in the order of the FASTA file (other values: ' +
                '<code>length</code>, <code>name</code>). In local mode, up to 4 maps are built at the same time.',
  dualcuration: '<code>--sortby nosort</code>: keep the hap1 scaffolds before the hap2 scaffolds (other values: ' +
                '<code>length</code>, <code>name</code>). Only one map is built in this mode.',
  finalgenome:  '<code>--sortby length</code>: show the longest sequences first (other values: <code>name</code>, ' +
                '<code>nosort</code>). In local mode, up to 4 maps are built at the same time.',
};

// ----------------------------------------------------------------
// PRESET: PretextMap resolution
// ----------------------------------------------------------------
const PRETEXT_RES_FLAGS = ['--ultraRes', '--highRes'];

function pretextResOf(flags) {
  const tokens = flags.split(/\s+/);
  return PRETEXT_RES_FLAGS.find((f) => tokens.includes(f)) || '';
}

function setPretextRes(flag) {
  const tokens = state.pretextmap_default.split(/\s+/).filter((t) => t && !PRETEXT_RES_FLAGS.includes(t));
  if (flag) tokens.push(flag);
  state.pretextmap_default = tokens.join(' ');
  setFieldValue('f-pretextmap', state.pretextmap_default);
}

function syncPresets() {
  setFieldValue('f-pretext-res', pretextResOf(state.pretextmap_default));
}

// ----------------------------------------------------------------
// DOM HELPERS
// ----------------------------------------------------------------
const $ = (id) => document.getElementById(id);

function show(id) { const el = $(id); if (el) el.classList.remove('hidden'); }
function hide(id) { const el = $(id); if (el) el.classList.add('hidden'); }

function showSection(id, delayMs = 0) {
  setTimeout(() => {
    const el = $(id);
    if (!el) return;
    el.classList.remove('pc-section-hidden');
    el.removeAttribute('aria-hidden');
  }, delayMs);
}

function hideSection(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add('pc-section-hidden');
  el.setAttribute('aria-hidden', 'true');
}

function showGroup(id) {
  const el = $(id);
  if (el) el.classList.remove('hidden');
}

function hideGroup(id) {
  const el = $(id);
  if (el) el.classList.add('hidden');
}

function setFieldValue(id, value) {
  const el = $(id);
  if (el) el.value = value;
}

function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function focusField(key) {
  const el = $(FIELD_ELEMENT[key]);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus({ preventScroll: true });
}

// ----------------------------------------------------------------
// INIT
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  populateForm();
  bindEvents();
  refresh();
});

function populateForm() {
  [...TEXT_FIELDS, ...SELECT_FIELDS].forEach(([id, key]) => setFieldValue(id, state[key]));
  syncPresets();
}

function refresh() {
  updateConditionals();
  updateYAML();
  renderCheck();
}

// ----------------------------------------------------------------
// BIND EVENTS
// ----------------------------------------------------------------
function bindEvents() {
  // Mode selection
  document.querySelectorAll('input[name="procura_mode"]').forEach((radio) => {
    radio.addEventListener('change', (e) => onModeChange(e.target.value));
  });

  // Text / number fields
  TEXT_FIELDS.forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      state[key] = e.target.value.trim();
      if (key === 'pretextmap_default') syncPresets();
      refresh();
    });
    el.addEventListener('blur', () => {
      touched.add(key);
      renderCheck();
    });
  });

  // Select fields
  SELECT_FIELDS.forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      state[key] = e.target.value;
      touched.add(key);
      refresh();
    });
  });

  // Preset (rewrites the PretextMap flags field)
  $('f-pretext-res').addEventListener('change', (e) => {
    setPretextRes(e.target.value);
    refresh();
  });

  // Config check panel
  $('pc-check-toggle').addEventListener('click', () => {
    const btn = $('pc-check-toggle');
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    $('pc-check').classList.toggle('is-collapsed', expanded);
  });
  $('pc-check-list').addEventListener('click', (e) => {
    const item = e.target.closest('[data-field]');
    if (item) focusField(item.dataset.field);
  });

  // Action buttons
  $('btn-download').addEventListener('click', downloadYAML);
  $('btn-copy').addEventListener('click', () => copyYAML('btn-copy'));
  $('btn-copy-yaml').addEventListener('click', () => copyYAML('btn-copy-yaml'));
  $('btn-reset').addEventListener('click', resetForm);
}

// ----------------------------------------------------------------
// MODE CHANGE — update defaults + reveal sections
// ----------------------------------------------------------------
function onModeChange(mode) {
  const prev = state.mode;
  state.mode = mode;

  // Switch PretextMap to the new mode's default, unless the user changed it
  if (!prev || state.pretextmap_default === PRETEXTMAP_DEFAULTS[prev]) {
    state.pretextmap_default = PRETEXTMAP_DEFAULTS[mode];
    setFieldValue('f-pretextmap', state.pretextmap_default);
    syncPresets();
  }

  // Reveal sections (staggered)
  showSection('section-reads',    0);
  showSection('section-assembly', 80);

  const hasRefs = mode !== 'dualcuration';
  if (hasRefs) showSection('section-refs', 160);
  else         hideSection('section-refs');

  showSection('section-tools', hasRefs ? 240 : 160);

  hide('mode-hint');
  refresh();
}

// ----------------------------------------------------------------
// CONDITIONALS — show/hide mode-specific fields
// ----------------------------------------------------------------
function updateConditionals() {
  const mode = state.mode;

  // Generated file name and config check panel
  const $filename = $('yaml-filename');
  if ($filename) $filename.textContent = mode ? `config_${mode}.yaml` : 'config.yaml';
  mode ? show('pc-check') : hide('pc-check');

  if (!mode) {
    hide('mode-next');
    return;
  }

  const isHap   = mode === 'hapcuration';
  const isDual  = mode === 'dualcuration';
  const isFinal = mode === 'finalgenome';

  // What to do after this mode
  setHTML('mode-next', MODE_NEXT[mode]);
  show('mode-next');

  // Mode-specific hints
  setHTML('hifi-hint', HIFI_HINTS[mode]);
  setHTML('pretextmap-hint', PRETEXTMAP_HINTS[mode]);

  // Assembly section badge
  const $asmBadge = $('assembly-badge');
  if ($asmBadge) {
    const labels = { hapcuration: 'HAP1 · HAP2', dualcuration: 'HAP1 · HAP2 · AGP', finalgenome: 'DIPLOID · AGP' };
    $asmBadge.textContent = labels[mode] || '—';
  }

  // Refs section title, description and badge
  const refs = {
    hapcuration: ['Optional Annotations', 'Synteny and ortholog tracks', 'NCBI · Orthologs'],
    finalgenome: ['Evaluation', 'BUSCO lineage and optional synteny', 'BUSCO · NCBI'],
  };
  if (refs[mode]) {
    const [title, desc, badge] = refs[mode];
    $('refs-title').textContent = title;
    $('refs-desc').textContent = desc;
    $('refs-badge').textContent = badge;
  }

  // Tool Parameters step number (3 for Dual Curation, which has no Refs section) and badge
  const $toolsStep = $('tools-step-num');
  if ($toolsStep) $toolsStep.textContent = isDual ? '3' : '4';
  const $toolsBadge = $('tools-badge');
  if ($toolsBadge) {
    $toolsBadge.textContent = isFinal ? 'FastK · BWA-MEM2 · pairtools · PretextMap' : 'BWA-MEM2 · pairtools · PretextMap';
  }

  // Assembly field groups
  (isHap || isDual) ? showGroup('group-hap-paths') : hideGroup('group-hap-paths');
  isDual            ? showGroup('group-agp-hap')   : hideGroup('group-agp-hap');
  isFinal           ? showGroup('group-diploid')   : hideGroup('group-diploid');

  // Refs field groups
  isFinal            ? showGroup('group-buscodb')     : hideGroup('group-buscodb');
  (isHap || isFinal) ? showGroup('group-ncbi-refseq') : hideGroup('group-ncbi-refseq');
  isHap              ? showGroup('group-ortholog')    : hideGroup('group-ortholog');

  // FastK (tools section)
  isFinal ? showGroup('group-fastk') : hideGroup('group-fastk');
}

// ----------------------------------------------------------------
// CONFIG CHECK
// Mirrors workflow/scripts/check_config.py from ProCura 1.1.0,
// except for file existence, which only ProCura can check.
// ----------------------------------------------------------------
const GENOME_SIZES = ['small', 'medium', 'large'];

// Input files of each mode (all required)
const FASTA_FIELDS = {
  hapcuration:  ['hap1_path', 'hap2_path'],
  dualcuration: ['hap1_path', 'hap2_path'],
  finalgenome:  ['diploid_path'],
};
const AGP_FIELDS = {
  hapcuration:  [],
  dualcuration: ['agp_hap1', 'agp_hap2'],
  finalgenome:  ['agp_diploid'],
};
const READ_FIELDS = ['r1_path', 'r2_path', 'hifi_path'];

function refseqAccessions(raw) {
  return (raw || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

function checkConfig() {
  const s = state;
  const mode = s.mode;
  const errors = [];
  const warnings = [];
  const error = (field, msg) => errors.push({ field, msg });
  const warn = (field, msg) => warnings.push({ field, msg });

  const checkFile = (field, kind) => {
    const value = s[field];
    if (!value) {
      error(field, `'${field}' is required: set the absolute path to the ${kind}.`);
      return null;
    }
    if (!value.startsWith('/')) {
      error(field, `'${field}' must be an absolute path: '${value}'.`);
      return null;
    }
    return value;
  };

  // Sample name (must match the `sample` wildcard constraint in workflow/rules/common.smk)
  if (!s.sample) error('sample', "'sample' is required.");
  else if (!/^[A-Za-z0-9_]+$/.test(s.sample)) {
    error('sample', `'sample' must contain only letters, numbers and underscores: '${s.sample}'.`);
  }

  // Assemblies, AGP files and reads
  const fastas = [];
  FASTA_FIELDS[mode].forEach((field) => {
    const path = checkFile(field, 'FASTA file');
    if (!path) return;
    fastas.push(path);
    if (path.endsWith('.gz')) {
      error(field, `'${field}' must be an uncompressed FASTA file: '${path}'. Decompress it with gunzip.`);
    }
  });
  if (fastas.length === 2 && fastas[0] === fastas[1]) {
    error('hap2_path', `'hap1_path' and 'hap2_path' point to the same file: '${fastas[0]}'.`);
  }

  AGP_FIELDS[mode].forEach((field) => {
    const path = checkFile(field, 'AGP file saved from PretextView');
    if (path && !path.endsWith('.agp')) {
      warn(field, `'${field}' does not end with .agp: '${path}'. Is it the AGP saved from PretextView?`);
    }
  });

  const reads = {};
  READ_FIELDS.forEach((field) => {
    const path = checkFile(field, 'reads (.fastq.gz)');
    if (!path) return;
    reads[field] = path;
    if (!/\.(fastq|fq)\.gz$/.test(path)) {
      error(field, `'${field}' must be a gzip-compressed FASTQ file (.fastq.gz): '${path}'.`);
    }
  });
  if (reads.r1_path && reads.r1_path === reads.r2_path) {
    error('r2_path', `'r1_path' and 'r2_path' point to the same file: '${reads.r1_path}'.`);
  }

  // SLURM resources
  if (!GENOME_SIZES.includes(s.genome_size)) {
    error('genome_size', "'genome_size' is required: choose small, medium or large.");
  }

  // Optional annotations
  if (mode === 'hapcuration' || mode === 'finalgenome') {
    refseqAccessions(s.ncbi_refseq).forEach((acc) => {
      if (acc.startsWith('GCA_')) {
        error('ncbi_refseq', `'ncbi_refseq_assembly' needs RefSeq accessions (GCF_), got the GenBank accession ` +
          `'${acc}'. Use the paired GCF_ accession shown on the NCBI assembly page.`);
      } else if (!/^GCF_[0-9]+\.[0-9]+$/.test(acc)) {
        error('ncbi_refseq', `'ncbi_refseq_assembly' must look like 'GCF_016699485.2', got: '${acc}'.`);
      }
    });
  }

  if (mode === 'finalgenome') {
    if (!s.buscodb) error('buscodb', "'buscodb' is required (BUSCO lineage for Compleasm, e.g., \"vertebrata\").");
    else if (/_odb\d+$/.test(s.buscodb)) {
      error('buscodb', `'buscodb' must not include the '_odb' suffix: '${s.buscodb}'.`);
    }
  }

  // Advanced tool parameters
  const pretextTokens = s.pretextmap_default.split(/\s+/);
  if (pretextTokens.includes('--highRes') && pretextTokens.includes('--ultraRes')) {
    warn('pretextmap_default', "'pretextmap.default' has both --highRes and --ultraRes; PretextMap uses --ultraRes.");
  }

  if (!/^\d+$/.test(s.pairtools_min_mapq)) {
    error('pairtools_min_mapq',
      `'pairtools.min-mapq' must be a whole number (0 or more), got: '${s.pairtools_min_mapq}'.`);
  }

  if (mode === 'finalgenome' && !(/^\d+$/.test(s.fastk_kmer) && Number(s.fastk_kmer) >= 1)) {
    error('fastk_kmer', `'fastk.kmer' must be a positive whole number (e.g., 31), got: '${s.fastk_kmer}'.`);
  }

  return { errors, warnings };
}

function renderCheck() {
  // Field highlighting: empty required fields only after they were touched
  document.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  if (!state.mode) return;

  const { errors, warnings } = checkConfig();

  errors.forEach(({ field }) => {
    const el = $(FIELD_ELEMENT[field]);
    if (el && (state[field] || touched.has(field))) el.classList.add('is-invalid');
  });

  const panel = $('pc-check');
  const summary = $('pc-check-summary');
  const list = $('pc-check-list');
  if (!panel || !summary || !list) return;

  panel.classList.toggle('has-errors', errors.length > 0);
  panel.classList.toggle('has-warnings', errors.length === 0 && warnings.length > 0);
  panel.classList.toggle('is-ok', errors.length === 0 && warnings.length === 0);

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const parts = [];
  if (errors.length) parts.push(plural(errors.length, 'error'));
  if (warnings.length) parts.push(plural(warnings.length, 'warning'));
  summary.textContent = parts.length ? `Config check: ${parts.join(' · ')}` : 'Config check: no problems found';

  const item = (cls, label) => ({ field, msg }) =>
    `<li><button type="button" class="pc-check-item ${cls}" data-field="${field}">` +
    `<span class="pc-check-tag">${label}</span>${esc(msg)}</button></li>`;
  list.innerHTML = [...errors.map(item('is-error', 'Error')), ...warnings.map(item('is-warning', 'Warning'))].join('');
}

// ----------------------------------------------------------------
// YAML HELPERS
// ----------------------------------------------------------------
function quote(val) {
  return `"${String(val ?? '').replace(/\r?\n/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function qline(key, val) {
  return `${key}: ${quote(val)}\n`;
}

function iqline(indent, key, val) {
  return `${indent}${key}: ${quote(val)}\n`;
}

// Whole numbers unquoted, as in the ProCura config files; anything else quoted (reported by the config check)
function inline(indent, key, val) {
  return `${indent}${key}: ${/^\d+$/.test(val) ? val : quote(val)}\n`;
}

function banner(title) {
  return `\n################################\n${title}\n################################\n\n`;
}

// "" when empty, a string for one accession, a list for several
function formatNcbiRefseq(raw) {
  const accessions = refseqAccessions(raw);
  if (accessions.length === 0) return 'ncbi_refseq_assembly: ""\n';
  if (accessions.length === 1) return qline('ncbi_refseq_assembly', accessions[0]);
  return 'ncbi_refseq_assembly:\n' + accessions.map((acc) => `  - ${quote(acc)}\n`).join('');
}

// ----------------------------------------------------------------
// YAML GENERATION — mode-specific, same layout as config/config_<mode>.yaml
// ----------------------------------------------------------------
function generateYAML() {
  const s = state;
  const mode = s.mode;

  if (!mode) return '';

  // ── Sample & Inputs ────────────────────────────────────────────
  let y = banner('###### SAMPLE AND INPUTS #######').trimStart();
  y += qline('sample', s.sample);

  if (mode === 'finalgenome') {
    y += qline('diploid_path', s.diploid_path);
    y += qline('agp_diploid',  s.agp_diploid);
  } else {
    y += qline('hap1_path', s.hap1_path);
    y += qline('hap2_path', s.hap2_path);
    if (mode === 'dualcuration') {
      y += qline('agp_hap1', s.agp_hap1);
      y += qline('agp_hap2', s.agp_hap2);
    }
  }

  y += qline('r1_path',     s.r1_path);
  y += qline('r2_path',     s.r2_path);
  y += qline('hifi_path',   s.hifi_path);
  y += qline('genome_size', s.genome_size);

  // ── Optional Annotations / Evaluation ──────────────────────────
  if (mode === 'hapcuration') {
    y += banner('##### OPTIONAL ANNOTATIONS #####');
    y += formatNcbiRefseq(s.ncbi_refseq);
    y += qline('ortholog_taxon', s.ortholog_taxon);
  } else if (mode === 'finalgenome') {
    y += banner('######### EVALUATION ###########');
    y += qline('buscodb', s.buscodb);
    y += formatNcbiRefseq(s.ncbi_refseq);
  }

  y += banner('### ADVANCED TOOL PARAMETERS ###').trimEnd() + '\n';

  // ── FastK (finalgenome only) ───────────────────────────────────
  if (mode === 'finalgenome') {
    y += `\n## FastK - k-mer counting of the HiFi reads (used by MerquryFK)\n`;
    y += `fastk:\n`;
    y += iqline('  ', 'default', s.fastk_default);
    y += inline('  ', 'kmer',    s.fastk_kmer);
  }

  // ── BWA-MEM2 ───────────────────────────────────────────────────
  y += `\n## BWA-MEM2 - Hi-C read mapping\n`;
  y += `bwa_mem2:\n`;
  y += iqline('  ', 'mem_default', s.bwa_mem2_default);

  // ── pairtools ──────────────────────────────────────────────────
  y += mode === 'dualcuration'
    ? `\n## pairtools - Hi-C pair parsing, sorting and splitting\n`
    : `\n## pairtools - Hi-C pair parsing, sorting, deduplication and splitting\n`;
  y += `pairtools:\n`;
  y += inline( '  ', 'min-mapq', s.pairtools_min_mapq);
  y += iqline('  ', 'default',  s.pairtools_default);

  // ── PretextMap ─────────────────────────────────────────────────
  y += `\n## PretextMap - Hi-C contact maps\n`;
  y += `pretextmap:\n`;
  y += iqline('  ', 'default', s.pretextmap_default);

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

    const kv = line.match(/^(\s*)([\w.-]+)(\s*:\s*)(.*)$/);
    if (kv) {
      const [, indent, key, sep, raw] = kv;
      let valueHtml;
      if (!raw || raw === '') {
        valueHtml = '';
      } else if (/^'.*'$/.test(raw) || /^".*"$/.test(raw)) {
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

    // YAML list item  '  - "value"'
    const li = line.match(/^(\s*-\s+)(.*)$/);
    if (li) {
      const [, prefix, val] = li;
      const valHtml = /^'.*'$/.test(val) || /^".*"$/.test(val)
        ? `<span class="y-string">${esc(val)}</span>`
        : esc(val);
      return `${esc(prefix)}${valHtml}`;
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

  if (!state.mode) {
    if (code) code.innerHTML = '<span class="pc-yaml-placeholder">← Select a mode to generate YAML</span>';
    if (counter) counter.textContent = '— lines';
    return;
  }

  if (code) code.innerHTML = highlightYAML(yaml);
  if (counter) counter.textContent = `${yaml.split('\n').length} lines`;
}

// ----------------------------------------------------------------
// COPY YAML
// ----------------------------------------------------------------
function copyYAML(triggerId) {
  const yaml = generateYAML();
  if (!yaml) return;

  navigator.clipboard.writeText(yaml).then(() => {
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
// DOWNLOAD YAML — named like the mode's default config file
// ----------------------------------------------------------------
function downloadYAML() {
  const yaml = generateYAML();
  if (!yaml) return;
  const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `config_${state.mode}.yaml`;
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

  Object.assign(state, DEFAULTS);
  touched.clear();

  document.querySelectorAll('input[name="procura_mode"]').forEach((r) => { r.checked = false; });
  populateForm();

  ['section-reads', 'section-assembly', 'section-refs', 'section-tools'].forEach(hideSection);
  show('mode-hint');

  refresh();
}
