// ================================================================
//  PipeASM — pipeasm.js
//  State management, conditional display, YAML generation
// ================================================================

// ----------------------------------------------------------------
// STATE
// ----------------------------------------------------------------
const state = {
  // Section 1: Sample & Reads
  sample: '',
  hifi_reads: '',
  hic_r1: '',
  hic_r2: '',
  ont_reads: '',

  // Section 2: Assembly Settings
  taxid: '',
  buscodb: '',
  sif_dir: '',
  solo_asm: 'No',
  diff_species_hic: 'No',

  // Section 3: Mitochondrial
  run_mitohifi: 'No',
  species: '',
  geneticcode: '',

  // Section 4: Databases
  gxdb: '',

  // Section 5: Read QC — Fastp
  fastp_flags: '--cut_tail --detect_adapter_for_pe --dont_eval_duplication --trim_poly_g',
  fastp_min_len: '--length_required 35',
  fastp_quality: '--cut_mean_quality 24',
  fastp_crop: '--trim_front1 5',

  // Section 5: Read QC — Cutadapt
  cutadapt_adaptors: '-b ATCTCTCTCAACAACAACAACGGAGGAGGAGGAAAAGAGAGAGAT -b ATCTCTCTCTTTTCCTCCTCCTCCGTTGTTGTTGTTGAGAGAGAT',
  cutadapt_filtering: '--discard -O 35',
  cutadapt_adap_find: '--rc -e 0.1',

  // Section 6: NanoPlot
  nanoplot_args: '--tsv_stats --format svg',
  nanoplot_plots: '--plots kde hex dot',

  // Section 7: K-mer
  fastk_default: '-v -M32 -t1',
  fastk_kmer: '-k31',
  genescopefk_kmer: '-k 31',
  genescopefk_ploidy: '-p 2',
  smudgeplot_minsize: '-L 12',

  // Section 8: Assembly Tools
  hifiasm_purge: '-l 1 -O 1',
  hifiasm_similarity: '-s 0.75',
  gfastats_params: '-o fa --discover-paths',
  bellerophon: '--quality 10',

  // Section 9: Scaffolding & Visualization
  pretext_map: '--mapq 10',
  pretext_snapshot: "--sequences '=full' -c 'Mellow Rainbow' --gridSize 1 --gridColour black --jpegQuality 100 -r 4000",
  yahs: '-e GATC,GANTC,CTNAG,TTAA --no-mem-check -v 1',
};

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
  // Set defaults for radio groups
  setRadio('solo_asm', state.solo_asm);
  setRadio('diff_species_hic', state.diff_species_hic);
  setRadio('run_mitohifi', state.run_mitohifi);

  // Populate textarea / text defaults
  setFieldValue('f-cutadapt-adaptors', state.cutadapt_adaptors);
  setFieldValue('f-fastp-flags',       state.fastp_flags);
  setFieldValue('f-fastp-minlen',      state.fastp_min_len);
  setFieldValue('f-fastp-quality',     state.fastp_quality);
  setFieldValue('f-fastp-crop',        state.fastp_crop);
  setFieldValue('f-cutadapt-filtering',state.cutadapt_filtering);
  setFieldValue('f-cutadapt-adap-find',state.cutadapt_adap_find);
  setFieldValue('f-nanoplot-args',     state.nanoplot_args);
  setFieldValue('f-nanoplot-plots',    state.nanoplot_plots);
  setFieldValue('f-fastk-default',     state.fastk_default);
  setFieldValue('f-fastk-kmer',        state.fastk_kmer);
  setFieldValue('f-genescopefk-kmer',  state.genescopefk_kmer);
  setFieldValue('f-genescopefk-ploidy',state.genescopefk_ploidy);
  setFieldValue('f-smudgeplot-minsize',state.smudgeplot_minsize);
  setFieldValue('f-hifiasm-purge',     state.hifiasm_purge);
  setFieldValue('f-hifiasm-similarity',state.hifiasm_similarity);
  setFieldValue('f-gfastats-params',   state.gfastats_params);
  setFieldValue('f-bellerophon',       state.bellerophon);
  setFieldValue('f-pretext-map',       state.pretext_map);
  setFieldValue('f-pretext-snapshot',  state.pretext_snapshot);
  setFieldValue('f-yahs',              state.yahs);

  bindEvents();
  updateConditionals();
  updateYAML();
});

// ----------------------------------------------------------------
// BIND EVENTS
// ----------------------------------------------------------------
function bindEvents() {

  // ---- Text / number inputs & textareas ----
  const textFields = [
    ['f-sample',            'sample'],
    ['f-hifi-reads',        'hifi_reads'],
    ['f-hic-r1',            'hic_r1'],
    ['f-hic-r2',            'hic_r2'],
    ['f-ont-reads',         'ont_reads'],
    ['f-taxid',             'taxid'],
    ['f-buscodb',           'buscodb'],
    ['f-sif-dir',           'sif_dir'],
    ['f-species',           'species'],
    ['f-geneticcode',       'geneticcode'],
    ['f-gxdb',              'gxdb'],
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

  textFields.forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      state[key] = e.target.value.trim();
      updateConditionals();
      updateYAML();
    });
  });

  // ---- Radio groups ----
  const radioGroups = ['solo_asm', 'diff_species_hic', 'run_mitohifi'];

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

function setFieldValue(id, value) {
  const el = $(id);
  if (!el) return;
  el.value = value;
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
// YAML GENERATION
// ----------------------------------------------------------------
function generateYAML() {
  const s = state;

  // Helpers
  const line  = (key, val) => `${key}: ${val ?? ''}\n`;
  const qline = (key, val) => `${key}: "${val ?? ''}"\n`;
  const iline = (indent, key, val) => `${indent}${key}: ${val ?? ''}\n`;
  const iqline = (indent, key, val) => `${indent}${key}: '${val ?? ''}'\n`;

  let y = '';

  // ── Sample & Reads ─────────────────────────────────────────────
  y += qline('sample',    s.sample);
  y += qline('hifi_reads',s.hifi_reads);
  y += qline('hic_r1',    s.hic_r1);
  y += qline('hic_r2',    s.hic_r2);
  y += qline('ont_reads', s.ont_reads);

  // ── Assembly Settings ──────────────────────────────────────────
  y += line( 'taxid',          s.taxid);
  y += qline('buscodb',        s.buscodb);
  y += qline('solo_asm',       s.solo_asm || 'No');
  y += qline('sif_dir',        s.sif_dir);

  // ── Mitochondrial ──────────────────────────────────────────────
  y += qline('run_mitohifi',   s.run_mitohifi || 'No');
  y += qline('species',        s.species);
  y += line( 'geneticcode',    s.geneticcode);

  // ── Hi-C / Scaffolding mode ────────────────────────────────────
  y += qline('diff_species_hic', s.diff_species_hic || 'No');

  // ── Databases ──────────────────────────────────────────────────
  y += line( 'gxdb',   s.gxdb);

  // ── Fastp (nested) ─────────────────────────────────────────────
  y += `fastp:\n`;
  y += iqline('  ', 'flags',   s.fastp_flags);
  y += iqline('  ', 'min_len', s.fastp_min_len);
  y += iqline('  ', 'crop',    s.fastp_crop);
  y += iqline('  ', 'quality', s.fastp_quality);

  // ── Cutadapt (nested) ──────────────────────────────────────────
  y += `cutadapt:\n`;
  y += iqline('  ', 'adaptors', s.cutadapt_adaptors);
  y += iqline('  ', 'filtering',s.cutadapt_filtering);
  y += iqline('  ', 'adap_find',s.cutadapt_adap_find);

  // ── NanoPlot (nested) ──────────────────────────────────────────
  y += `nanoplot:\n`;
  y += iqline('  ', 'args',  s.nanoplot_args);
  y += iqline('  ', 'plots', s.nanoplot_plots);

  // ── FastK (nested) ─────────────────────────────────────────────
  y += `fastk:\n`;
  y += iqline('  ', 'default', s.fastk_default);
  y += iqline('  ', 'kmer',    s.fastk_kmer);

  // ── GeneScopeFK (nested) ───────────────────────────────────────
  y += `genescopeFK:\n`;
  y += iqline('  ', 'kmer',   s.genescopefk_kmer);
  y += iqline('  ', 'ploidy', s.genescopefk_ploidy);

  // ── SmudgePlot (nested) ────────────────────────────────────────
  y += `smudgeplot:\n`;
  y += iqline('  ', 'minsize', s.smudgeplot_minsize);

  // ── Hifiasm (nested) ───────────────────────────────────────────
  y += `hifiasm:\n`;
  y += iqline('  ', 'purgelevel', s.hifiasm_purge);
  y += iqline('  ', 'similarity', s.hifiasm_similarity);

  // ── gfastats (nested) ──────────────────────────────────────────
  y += `gfastats:\n`;
  y += iqline('  ', 'params', s.gfastats_params);

  // ── Bellerophon (flat string) ──────────────────────────────────
  y += qline('bellerophon', s.bellerophon);

  // ── Pretext (nested) ───────────────────────────────────────────
  y += `pretext:\n`;
  y += iqline('  ', 'map',      s.pretext_map);
  y += iqline('  ', 'snapshot', s.pretext_snapshot);

  // ── YAHS (flat string) ─────────────────────────────────────────
  y += qline('yahs', s.yahs);

  return y;
}

// ----------------------------------------------------------------
// YAML SYNTAX HIGHLIGHTING
// ----------------------------------------------------------------
function highlightYAML(text) {
  const lines = text.split('\n');
  return lines.map((line) => {
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

  // Reset string fields to empty
  Object.keys(state).forEach((k) => { state[k] = ''; });

  // Restore radio defaults
  state.solo_asm        = 'No';
  state.diff_species_hic= 'No';
  state.run_mitohifi    = 'No';

  // Restore parameter defaults
  state.fastp_flags         = '--cut_tail --detect_adapter_for_pe --dont_eval_duplication --trim_poly_g';
  state.fastp_min_len       = '--length_required 35';
  state.fastp_quality       = '--cut_mean_quality 24';
  state.fastp_crop          = '--trim_front1 5';
  state.cutadapt_adaptors   = '-b ATCTCTCTCAACAACAACAACGGAGGAGGAGGAAAAGAGAGAGAT -b ATCTCTCTCTTTTCCTCCTCCTCCGTTGTTGTTGTTGAGAGAGAT';
  state.cutadapt_filtering  = '--discard -O 35';
  state.cutadapt_adap_find  = '--rc -e 0.1';
  state.nanoplot_args       = '--tsv_stats --format svg';
  state.nanoplot_plots      = '--plots kde hex dot';
  state.fastk_default       = '-v -M32 -t1';
  state.fastk_kmer          = '-k31';
  state.genescopefk_kmer    = '-k 31';
  state.genescopefk_ploidy  = '-p 2';
  state.smudgeplot_minsize  = '-L 12';
  state.hifiasm_purge       = '-l 1 -O 1';
  state.hifiasm_similarity  = '-s 0.75';
  state.gfastats_params     = '-o fa --discover-paths';
  state.bellerophon         = '--quality 10';
  state.pretext_map         = '--mapq 10';
  state.pretext_snapshot    = "--sequences '=full' -c 'Mellow Rainbow' --gridSize 1 --gridColour black --jpegQuality 100 -r 4000";
  state.yahs                = '-e GATC,GANTC,CTNAG,TTAA --no-mem-check -v 1';

  // Reset all inputs
  document.querySelectorAll('.field-input').forEach((el) => {
    const defaults = {
      'f-cutadapt-adaptors':  state.cutadapt_adaptors,
      'f-fastp-flags':        state.fastp_flags,
      'f-fastp-minlen':       state.fastp_min_len,
      'f-fastp-quality':      state.fastp_quality,
      'f-fastp-crop':         state.fastp_crop,
      'f-cutadapt-filtering': state.cutadapt_filtering,
      'f-cutadapt-adap-find': state.cutadapt_adap_find,
      'f-nanoplot-args':      state.nanoplot_args,
      'f-nanoplot-plots':     state.nanoplot_plots,
      'f-fastk-default':      state.fastk_default,
      'f-fastk-kmer':         state.fastk_kmer,
      'f-genescopefk-kmer':   state.genescopefk_kmer,
      'f-genescopefk-ploidy': state.genescopefk_ploidy,
      'f-smudgeplot-minsize': state.smudgeplot_minsize,
      'f-hifiasm-purge':      state.hifiasm_purge,
      'f-hifiasm-similarity': state.hifiasm_similarity,
      'f-gfastats-params':    state.gfastats_params,
      'f-bellerophon':        state.bellerophon,
      'f-pretext-map':        state.pretext_map,
      'f-pretext-snapshot':   state.pretext_snapshot,
      'f-yahs':               state.yahs,
    };
    el.value = defaults[el.id] ?? '';
  });

  // Reset radios
  document.querySelectorAll('input[type="radio"]').forEach((r) => { r.checked = false; });
  setRadio('solo_asm', 'No');
  setRadio('diff_species_hic', 'No');
  setRadio('run_mitohifi', 'No');

  updateConditionals();
  updateYAML();
}
