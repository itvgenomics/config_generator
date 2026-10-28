// ================================================================
//  PipeASM — pipeasm.js
//  State management, conditional display, config check, YAML generation
// ================================================================

// ----------------------------------------------------------------
// DEFAULTS (Pipeasm 1.2.0 config/config.yaml)
// ----------------------------------------------------------------
const DEFAULTS = {
  // Section 1: Sample & Reads
  sample: '',
  hifi_reads: '',
  hic_r1: '',
  hic_r2: '',
  ont_reads: '',

  // Section 2: Assembly Options
  genome_size: '',
  solo_asm: 'No',
  diff_species_hic: 'No',

  // Section 3: Completeness & Contaminants
  buscodb: '',
  taxid: '',
  gxdb: '',

  // Section 4: Mitogenome
  run_mitohifi: 'No',
  species: '',
  geneticcode: '',

  // Section 5: Containers
  sif_dir: '',

  // Section 6: Read QC — Fastp
  fastp_flags: '--cut_tail --detect_adapter_for_pe --dont_eval_duplication --trim_poly_g',
  fastp_min_len: '--length_required 35',
  fastp_quality: '--cut_mean_quality 24',
  fastp_crop: '--trim_front1 5',

  // Section 6: Read QC — Cutadapt
  cutadapt_adaptors: '-b ATCTCTCTCAACAACAACAACGGAGGAGGAGGAAAAGAGAGAGAT -b ATCTCTCTCTTTTCCTCCTCCTCCGTTGTTGTTGTTGAGAGAGAT',
  cutadapt_filtering: '--discard -O 35',
  cutadapt_adap_find: '--rc -e 0.1',

  // Section 7: NanoPlot
  nanoplot_args: '--tsv_stats --format svg',
  nanoplot_plots: '--plots kde hex dot',

  // Section 8: K-mer
  fastk_default: '-v -M32 -t1',
  fastk_kmer: '-k31',
  genescopefk_kmer: '-k 31',
  genescopefk_ploidy: '-p 2',
  smudgeplot_minsize: '-L 12',

  // Section 9: Assembly Tools
  hifiasm_purge: '-l 1 -O 1',
  hifiasm_similarity: '-s 0.75',
  gfastats_params: '-o fa --discover-paths',
  bellerophon: '--quality 10',

  // Section 10: Scaffolding & Visualization
  pretext_map: '--mapq 10 --ultraRes',
  pretext_snapshot: "--sequences '=full' -c 'Mellow Rainbow' --gridSize 1 --gridColour black --jpegQuality 100 -r 4000",
  yahs: '-e GATC,GANTC,CTNAG,TTAA --no-mem-check -v 1',
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
  ['f-sample',            'sample'],
  ['f-hifi-reads',        'hifi_reads'],
  ['f-hic-r1',            'hic_r1'],
  ['f-hic-r2',            'hic_r2'],
  ['f-ont-reads',         'ont_reads'],
  ['f-buscodb',           'buscodb'],
  ['f-taxid',             'taxid'],
  ['f-gxdb',              'gxdb'],
  ['f-species',           'species'],
  ['f-geneticcode',       'geneticcode'],
  ['f-sif-dir',           'sif_dir'],
  ['f-fastp-flags',       'fastp_flags'],
  ['f-fastp-minlen',      'fastp_min_len'],
  ['f-fastp-quality',     'fastp_quality'],
  ['f-fastp-crop',        'fastp_crop'],
  ['f-cutadapt-adaptors', 'cutadapt_adaptors'],
  ['f-cutadapt-filtering','cutadapt_filtering'],
  ['f-cutadapt-adap-find','cutadapt_adap_find'],
  ['f-nanoplot-args',     'nanoplot_args'],
  ['f-nanoplot-plots',    'nanoplot_plots'],
  ['f-fastk-default',     'fastk_default'],
  ['f-fastk-kmer',        'fastk_kmer'],
  ['f-genescopefk-kmer',  'genescopefk_kmer'],
  ['f-genescopefk-ploidy','genescopefk_ploidy'],
  ['f-smudgeplot-minsize','smudgeplot_minsize'],
  ['f-hifiasm-purge',     'hifiasm_purge'],
  ['f-hifiasm-similarity','hifiasm_similarity'],
  ['f-gfastats-params',   'gfastats_params'],
  ['f-bellerophon',       'bellerophon'],
  ['f-pretext-map',       'pretext_map'],
  ['f-pretext-snapshot',  'pretext_snapshot'],
  ['f-yahs',              'yahs'],
];

const SELECT_FIELDS = [
  ['f-genome-size', 'genome_size'],
];

const RADIO_GROUPS = ['solo_asm', 'diff_species_hic', 'run_mitohifi'];

// state key -> element to highlight/focus for config check messages
const FIELD_ELEMENT = Object.fromEntries([
  ...[...TEXT_FIELDS, ...SELECT_FIELDS].map(([id, key]) => [key, id]),
  ['solo_asm',         'fg-solo-asm'],
  ['diff_species_hic', 'fg-diff-species-hic'],
]);

// ----------------------------------------------------------------
// PRESETS: Pretext resolution and YaHS enzyme motifs
// ----------------------------------------------------------------
const PRETEXT_RES_FLAGS = ['--ultraRes', '--highRes'];
const ARIMA_MOTIFS = '-e GATC,GANTC,CTNAG,TTAA';

function pretextResOf(flags) {
  const tokens = flags.split(/\s+/);
  return PRETEXT_RES_FLAGS.find((f) => tokens.includes(f)) || '';
}

function setPretextRes(flag) {
  const tokens = state.pretext_map.split(/\s+/).filter((t) => t && !PRETEXT_RES_FLAGS.includes(t));
  if (flag) tokens.push(flag);
  state.pretext_map = tokens.join(' ');
  setFieldValue('f-pretext-map', state.pretext_map);
}

function yahsKitOf(flags) {
  if (/(^|\s)-e\s+GATC,GANTC,CTNAG,TTAA(\s|$)/.test(flags)) return 'arima';
  if (!/(^|\s)-e(\s|$)/.test(flags)) return 'enzyme-free';
  return 'custom';
}

function setYahsKit(kit) {
  if (kit === 'custom') {
    $('f-yahs').focus();
    return;
  }
  const rest = state.yahs.replace(/(^|\s)-e\s+\S+/g, ' ').replace(/\s+/g, ' ').trim();
  state.yahs = kit === 'arima' ? `${ARIMA_MOTIFS} ${rest}`.trim() : rest;
  setFieldValue('f-yahs', state.yahs);
}

function syncPresets() {
  setFieldValue('f-pretext-res', pretextResOf(state.pretext_map));
  setFieldValue('f-yahs-kit', yahsKitOf(state.yahs));
}

// ----------------------------------------------------------------
// DOM HELPERS
// ----------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const show = (id) => { const el = $(id); if (el) el.classList.remove('hidden'); };
const hide = (id) => { const el = $(id); if (el) el.classList.add('hidden'); };

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
  RADIO_GROUPS.forEach((name) => setRadio(name, state[name]));
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

  // ---- Text / number inputs & textareas ----
  TEXT_FIELDS.forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      state[key] = e.target.value.trim();
      if (key === 'pretext_map') setFieldValue('f-pretext-res', pretextResOf(state.pretext_map));
      if (key === 'yahs') setFieldValue('f-yahs-kit', yahsKitOf(state.yahs));
      refresh();
    });
    el.addEventListener('blur', () => {
      touched.add(key);
      renderCheck();
    });
  });

  // ---- Select fields ----
  SELECT_FIELDS.forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      state[key] = e.target.value;
      touched.add(key);
      refresh();
    });
  });

  // ---- Presets (rewrite the related flags field) ----
  $('f-pretext-res').addEventListener('change', (e) => {
    setPretextRes(e.target.value);
    refresh();
  });
  $('f-yahs-kit').addEventListener('change', (e) => {
    setYahsKit(e.target.value);
    refresh();
  });

  // ---- Radio groups ----
  RADIO_GROUPS.forEach((name) => {
    document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
      radio.addEventListener('change', (e) => {
        state[name] = e.target.value;
        refresh();
      });
    });
  });

  // ---- Config check panel ----
  $('pa-check-toggle').addEventListener('click', () => {
    const btn = $('pa-check-toggle');
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    $('pa-check').classList.toggle('is-collapsed', expanded);
  });
  $('pa-check-list').addEventListener('click', (e) => {
    const item = e.target.closest('[data-field]');
    if (item) focusField(item.dataset.field);
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

function setFieldValue(id, value) {
  const el = $(id);
  if (!el) return;
  el.value = value;
}

function focusField(key) {
  const el = $(FIELD_ELEMENT[key]);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const target = el.matches('input, select, textarea') ? el : el.querySelector('input:checked, input');
  if (target) target.focus({ preventScroll: true });
}

// ----------------------------------------------------------------
// CONDITIONALS
// ----------------------------------------------------------------
function updateConditionals() {
  const mitoYes = state.run_mitohifi === 'Yes';
  const $mitoFields = $('group-mitohifi-fields');
  if ($mitoFields) $mitoFields.classList.toggle('hidden', !mitoYes);
}

// ----------------------------------------------------------------
// CONFIG CHECK
// Mirrors workflow/scripts/check_config.py from Pipeasm 1.2.0,
// except for file/directory existence, which only Pipeasm can check.
// ----------------------------------------------------------------
const GENOME_SIZES = ['small', 'medium', 'large'];

function checkConfig() {
  const s = state;
  const errors = [];
  const warnings = [];
  const error = (field, msg) => errors.push({ field, msg });
  const warn = (field, msg) => warnings.push({ field, msg });
  const isAbs = (p) => p.startsWith('/');

  // Sample name (must match the `sample` wildcard constraint in workflow/rules/common.smk)
  if (!s.sample) error('sample', "'sample' is required.");
  else if (!/^[A-Za-z0-9_]+$/.test(s.sample)) {
    error('sample', `'sample' must contain only letters, numbers and underscores: '${s.sample}'.`);
  }

  // Reads
  const checkReads = (field, required) => {
    const value = s[field];
    if (!value) {
      if (required) error(field, `'${field}' is required: set the absolute path to the reads (.fastq.gz).`);
      return;
    }
    if (!isAbs(value)) error(field, `'${field}' must be an absolute path: '${value}'.`);
    if (!/\.(fastq|fq)\.gz$/.test(value)) {
      error(field, `'${field}' must be a gzip-compressed FASTQ file (.fastq.gz): '${value}'.`);
    }
  };
  checkReads('hifi_reads', true);
  checkReads('hic_r1', false);
  checkReads('hic_r2', false);
  checkReads('ont_reads', false);

  const hasHic = Boolean(s.hic_r1 && s.hic_r2);
  if (!s.hic_r1 !== !s.hic_r2) {
    error(s.hic_r1 ? 'hic_r2' : 'hic_r1', "'hic_r1' and 'hic_r2' must be set together (or both left empty).");
  }

  // Assembly options
  if (!GENOME_SIZES.includes(s.genome_size)) {
    error('genome_size', "'genome_size' is required: choose small, medium or large.");
  }
  if (s.diff_species_hic === 'Yes' && !hasHic) {
    error('diff_species_hic', "'diff_species_hic' is \"Yes\" but no Hi-C reads were set in 'hic_r1'/'hic_r2'.");
  }
  if (!hasHic && s.solo_asm === 'No') {
    warn('solo_asm', "No Hi-C reads and 'solo_asm' is \"No\": no assembly will be produced " +
      "(only trimming/QC and k-mer profiling). Set 'solo_asm' to \"Yes\" to assemble the HiFi reads.");
  }

  // Completeness and contaminants
  if (!s.buscodb) error('buscodb', "'buscodb' is required (e.g., \"aves\").");
  else if (/_odb1[02]$/.test(s.buscodb)) {
    error('buscodb', `'buscodb' must not include the '_odb' suffix: '${s.buscodb}'.`);
  }

  if (!s.taxid) error('taxid', "'taxid' is required (NCBI Taxonomy ID, e.g., 1202453).");
  else if (!/^\d+$/.test(s.taxid)) error('taxid', `'taxid' must be a number: '${s.taxid}'.`);

  if (s.gxdb && !isAbs(s.gxdb)) error('gxdb', `'gxdb' must be an absolute path: '${s.gxdb}'.`);

  // Mitogenome
  if (s.run_mitohifi === 'Yes') {
    if (!s.species) error('species', "'species' is required when 'run_mitohifi' is \"Yes\".");
    if (!s.geneticcode) error('geneticcode', "'geneticcode' is required when 'run_mitohifi' is \"Yes\".");
    else if (!/^\d+$/.test(s.geneticcode)) {
      error('geneticcode', `'geneticcode' must be a number: '${s.geneticcode}'.`);
    }
  }

  // Containers
  if (!s.sif_dir) error('sif_dir', "'sif_dir' is required (directory to store the Singularity images).");
  else if (!isAbs(s.sif_dir)) error('sif_dir', `'sif_dir' must be an absolute path: '${s.sif_dir}'.`);

  // Advanced tool parameters
  const fastkK = s.fastk_kmer.match(/\d+/);
  const genescopeK = s.genescopefk_kmer.match(/\d+/);
  if (fastkK && genescopeK && fastkK[0] !== genescopeK[0]) {
    error('genescopefk_kmer',
      `'fastk.kmer' (k=${fastkK[0]}) and 'genescopeFK.kmer' (k=${genescopeK[0]}) must use the same k-mer size.`);
  }

  return { errors, warnings };
}

function renderCheck() {
  const { errors, warnings } = checkConfig();

  // Field highlighting: empty required fields only after they were touched
  document.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  errors.forEach(({ field }) => {
    const el = $(FIELD_ELEMENT[field]);
    if (el && el.matches('input, select, textarea') && (state[field] || touched.has(field))) {
      el.classList.add('is-invalid');
    }
  });

  const panel = $('pa-check');
  const summary = $('pa-check-summary');
  const list = $('pa-check-list');
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
    `<li><button type="button" class="pa-check-item ${cls}" data-field="${field}">` +
    `<span class="pa-check-tag">${label}</span>${esc(msg)}</button></li>`;
  list.innerHTML = [...errors.map(item('is-error', 'Error')), ...warnings.map(item('is-warning', 'Warning'))].join('');
}

// ----------------------------------------------------------------
// YAML GENERATION
// ----------------------------------------------------------------
function generateYAML() {
  const s = state;

  // Helpers
  const quote  = (val) => `"${String(val ?? '').replace(/\r?\n/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const line   = (key, val) => (val ? `${key}: ${val}\n` : `${key}:\n`);
  const qline  = (key, val) => `${key}: ${quote(val)}\n`;
  const oqline = (key, val) => (val ? qline(key, val) : `${key}:\n`);
  const iqline = (indent, key, val) => `${indent}${key}: ${quote(val)}\n`;
  const banner = (title) => `\n################################\n${title}\n################################\n\n`;

  let y = '';

  // ── Sample & Reads ─────────────────────────────────────────────
  y += banner('#### SAMPLE AND INPUT READS ####').trimStart();
  y += qline('sample',      s.sample);
  y += qline('hifi_reads',  s.hifi_reads);
  y += qline('hic_r1',      s.hic_r1);
  y += qline('hic_r2',      s.hic_r2);
  y += qline('ont_reads',   s.ont_reads);

  // ── Assembly Options ───────────────────────────────────────────
  y += banner('####### ASSEMBLY OPTIONS #######');
  y += qline('genome_size',      s.genome_size);
  y += qline('solo_asm',         s.solo_asm || 'No');
  y += qline('diff_species_hic', s.diff_species_hic || 'No');

  // ── Completeness & Contaminants ────────────────────────────────
  y += banner('## COMPLETENESS AND CONTAMINANTS');
  y += qline( 'buscodb', s.buscodb);
  y += line(  'taxid',   s.taxid);
  y += oqline('gxdb',    s.gxdb);

  // ── Mitogenome ─────────────────────────────────────────────────
  y += banner('########## MITOGENOME ##########');
  y += qline('run_mitohifi', s.run_mitohifi || 'No');
  y += qline('species',      s.species);
  y += line( 'geneticcode',  s.geneticcode);

  // ── Containers ─────────────────────────────────────────────────
  y += banner('########## CONTAINERS ##########');
  y += qline('sif_dir', s.sif_dir);

  y += banner('### ADVANCED TOOL PARAMETERS ###').trimEnd() + '\n';

  // ── Fastp (nested) ─────────────────────────────────────────────
  y += `\n## fastp - Hi-C read trimming and QC\n`;
  y += `fastp:\n`;
  y += iqline('  ', 'flags',   s.fastp_flags);
  y += iqline('  ', 'min_len', s.fastp_min_len);
  y += iqline('  ', 'crop',    s.fastp_crop);
  y += iqline('  ', 'quality', s.fastp_quality);

  // ── Cutadapt (nested) ──────────────────────────────────────────
  y += `\n## Cutadapt - PacBio HiFi adapter removal\n`;
  y += `cutadapt:\n`;
  y += iqline('  ', 'adaptors', s.cutadapt_adaptors);
  y += iqline('  ', 'filtering',s.cutadapt_filtering);
  y += iqline('  ', 'adap_find',s.cutadapt_adap_find);

  // ── NanoPlot (nested) ──────────────────────────────────────────
  y += `\n## NanoPlot - HiFi and ONT read length and quality plots\n`;
  y += `nanoplot:\n`;
  y += iqline('  ', 'args',  s.nanoplot_args);
  y += iqline('  ', 'plots', s.nanoplot_plots);

  // ── FastK (nested) ─────────────────────────────────────────────
  y += `\n## FastK - k-mer counting of the HiFi reads\n`;
  y += `fastk:\n`;
  y += iqline('  ', 'default', s.fastk_default);
  y += iqline('  ', 'kmer',    s.fastk_kmer);

  // ── GeneScopeFK (nested) ───────────────────────────────────────
  y += `\n## GeneScopeFK - genome size, heterozygosity and repeat content from the k-mer histogram\n`;
  y += `genescopeFK:\n`;
  y += iqline('  ', 'kmer',   s.genescopefk_kmer);
  y += iqline('  ', 'ploidy', s.genescopefk_ploidy);

  // ── SmudgePlot (nested) ────────────────────────────────────────
  y += `\n## Smudgeplot - ploidy estimation from k-mer pairs\n`;
  y += `smudgeplot:\n`;
  y += iqline('  ', 'minsize', s.smudgeplot_minsize);

  // ── Hifiasm (nested) ───────────────────────────────────────────
  y += `\n## Hifiasm - contig assembly\n`;
  y += `hifiasm:\n`;
  y += iqline('  ', 'purgelevel', s.hifiasm_purge);
  y += iqline('  ', 'similarity', s.hifiasm_similarity);

  // ── gfastats (nested) ──────────────────────────────────────────
  y += `\n## gfastats - assembly graph to FASTA conversion and assembly statistics\n`;
  y += `gfastats:\n`;
  y += iqline('  ', 'params', s.gfastats_params);

  // ── Bellerophon (flat string) ──────────────────────────────────
  y += `\n## Bellerophon - Hi-C read filtering\n`;
  y += qline('bellerophon', s.bellerophon);

  // ── Pretext (nested) ───────────────────────────────────────────
  y += `\n## PretextMap / PretextSnapshot - Hi-C contact maps\n`;
  y += `pretext:\n`;
  y += iqline('  ', 'map',      s.pretext_map);
  y += iqline('  ', 'snapshot', s.pretext_snapshot);

  // ── YAHS (flat string) ─────────────────────────────────────────
  y += `\n## YaHS - Hi-C scaffolding\n`;
  y += qline('yahs', s.yahs);

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

    // Indented key: value (nested YAML)
    const kv = line.match(/^(\s*)([\w_]+)(\s*:\s*)(.*)$/);
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

  Object.assign(state, DEFAULTS);
  touched.clear();

  document.querySelectorAll('input[type="radio"]').forEach((r) => { r.checked = false; });
  populateForm();
  refresh();
}
