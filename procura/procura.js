// ================================================================
//  ProCura — procura.js
//  3-mode configurator: hapcuration | dualcuration | finalgenome
// ================================================================

// ----------------------------------------------------------------
// STATE
// ----------------------------------------------------------------
const state = {
  mode: '',   // 'hapcuration' | 'dualcuration' | 'finalgenome'

  // Shared — Sample & Reads
  sample:    '',
  r1_path:   '',
  r2_path:   '',
  hifi_path: '',

  // Hap + Dual Curation — haplotype paths
  hap1_path: '',
  hap2_path: '',

  // Dual Curation — AGP files for hap1/hap2
  agp_hap1: '',
  agp_hap2: '',

  // Final Genome — diploid path + AGP
  diploid_path: '',
  agp_diploid:  '',

  // Final Genome — BUSCO database
  buscodb: '',

  // Hap Curation + Final Genome — NCBI RefSeq (one per line in textarea)
  ncbi_refseq: '',

  // Hap Curation — OrthoFinder
  ortholog_taxon: '',

  // Tool Parameters — PretextMap
  pretexmap_default: '--sortby nosort',

  // Tool Parameters — BWA-MEM2
  bwa_mem2_default: '-SP -T0',

  // Tool Parameters — Pairtools
  pairtools_min_mapq: '5',
  pairtools_default:  '--walks-policy 5unique --max-inter-align-gap 30',

  // Tool Parameters — FastK (finalgenome only)
  fastk_default: '-v -M32 -t1',
  fastk_kmer:    '31',
};

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

// ----------------------------------------------------------------
// INIT
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Set initial defaults in fields
  setFieldValue('f-pretexmap', state.pretexmap_default);
  setFieldValue('f-bwa-mem2',  state.bwa_mem2_default);
  setFieldValue('f-pairtools-mapq', state.pairtools_min_mapq);
  setFieldValue('f-pairtools', state.pairtools_default);
  setFieldValue('f-fastk-default', state.fastk_default);
  setFieldValue('f-fastk-kmer', state.fastk_kmer);

  bindEvents();
  updateConditionals();
  updateYAML();
});

// ----------------------------------------------------------------
// BIND EVENTS
// ----------------------------------------------------------------
function bindEvents() {
  // Mode selection
  document.querySelectorAll('input[name="procura_mode"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.mode = e.target.value;
      onModeChange();
    });
  });

  // Text / number fields
  const textFields = [
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
    ['f-pretexmap',       'pretexmap_default'],
    ['f-bwa-mem2',        'bwa_mem2_default'],
    ['f-pairtools-mapq',  'pairtools_min_mapq'],
    ['f-pairtools',       'pairtools_default'],
    ['f-fastk-default',   'fastk_default'],
    ['f-fastk-kmer',      'fastk_kmer'],
  ];

  textFields.forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      state[key] = e.target.value;
      updateYAML();
    });
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
function onModeChange() {
  const mode = state.mode;

  // Update pretexmap default based on mode
  const newPretex = mode === 'finalgenome' ? '--sortby length' : '--sortby nosort';
  if (state.pretexmap_default === '--sortby nosort' || state.pretexmap_default === '--sortby length') {
    // Only auto-update if it's still the mode default (user hasn't customized)
    state.pretexmap_default = newPretex;
    setFieldValue('f-pretexmap', newPretex);
  }

  // Reveal sections (staggered)
  showSection('section-reads',    0);
  showSection('section-assembly', 80);

  const hasRefs = mode !== 'dualcuration';
  if (hasRefs) showSection('section-refs', 160);
  else         hideSection('section-refs');

  showSection('section-tools', hasRefs ? 240 : 160);

  // Hide the mode hint
  const $hint = $('mode-hint');
  if ($hint) $hint.classList.add('hidden');

  updateConditionals();
  updateYAML();
}

// ----------------------------------------------------------------
// CONDITIONALS — show/hide mode-specific fields
// ----------------------------------------------------------------
function updateConditionals() {
  const mode = state.mode;

  if (!mode) return;

  const isHap   = mode === 'hapcuration';
  const isDual  = mode === 'dualcuration';
  const isFinal = mode === 'finalgenome';

  // Assembly section badge
  const $asmBadge = $('assembly-badge');
  if ($asmBadge) {
    const labels = { hapcuration: 'HAP1 · HAP2', dualcuration: 'HAP1 · HAP2 · AGP', finalgenome: 'DIPLOID · AGP' };
    $asmBadge.textContent = labels[mode] || '—';
  }

  // Refs section badge
  const $refBadge = $('refs-badge');
  if ($refBadge) {
    const labels = { hapcuration: 'NCBI · OrthoFinder', finalgenome: 'BUSCO · NCBI' };
    $refBadge.textContent = labels[mode] || '—';
  }

  // Tool Parameters step number: 3 for Dual Curation (no Refs section), 4 otherwise
  const $toolsStep = $('tools-step-num');
  if ($toolsStep) $toolsStep.textContent = isDual ? '3' : '4';

  // Assembly field groups
  (isHap || isDual) ? showGroup('group-hap-paths') : hideGroup('group-hap-paths');
  isDual            ? showGroup('group-agp-hap')   : hideGroup('group-agp-hap');
  isFinal           ? showGroup('group-diploid')   : hideGroup('group-diploid');

  // Refs field groups
  isFinal           ? showGroup('group-buscodb')    : hideGroup('group-buscodb');
  (isHap || isFinal)? showGroup('group-ncbi-refseq'): hideGroup('group-ncbi-refseq');
  isHap             ? showGroup('group-ortholog')    : hideGroup('group-ortholog');

  // FastK (tools section)
  isFinal ? showGroup('group-fastk') : hideGroup('group-fastk');
}

// ----------------------------------------------------------------
// YAML HELPERS
// ----------------------------------------------------------------
function qline(key, val) {
  return `${key}: "${val ?? ''}"\n`;
}

function line(key, val) {
  return `${key}: ${val ?? ''}\n`;
}

function sline(key, val) {
  // Double-quoted string (safe for values containing single quotes)
  return `${key}: "${val ?? ''}"\n`;
}

function iline(indent, key, val) {
  return `${indent}${key}: ${val ?? ''}\n`;
}

function isline(indent, key, val) {
  return `${indent}${key}: "${val ?? ''}"\n`;
}

function formatNcbiRefseq(raw, forceList = false) {
  const lines = (raw || '').split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    if (forceList) return `ncbi_refseq_assembly:\n  - ""\n`;
    return `ncbi_refseq_assembly: ""\n`;
  }
  if (lines.length === 1 && !forceList) {
    return `ncbi_refseq_assembly: "${lines[0]}"\n`;
  }
  // Multiple (or forceList) — emit as YAML list
  let s = `ncbi_refseq_assembly:\n`;
  lines.forEach((acc) => { s += `  - "${acc}"\n`; });
  return s;
}

// ----------------------------------------------------------------
// YAML GENERATION — mode-specific
// ----------------------------------------------------------------
function generateYAML() {
  const s = state;
  const mode = s.mode;

  if (!mode) return '';

  let y = '';

  if (mode === 'hapcuration') {
    y += qline('sample',    s.sample);
    y += qline('hap1_path', s.hap1_path);
    y += qline('hap2_path', s.hap2_path);
    y += qline('r1_path',   s.r1_path);
    y += qline('r2_path',   s.r2_path);
    y += qline('hifi_path', s.hifi_path);
    y += formatNcbiRefseq(s.ncbi_refseq, false);
    y += sline('ortholog_taxon', s.ortholog_taxon);

  } else if (mode === 'dualcuration') {
    y += qline('sample',    s.sample);
    y += qline('hap1_path', s.hap1_path);
    y += qline('hap2_path', s.hap2_path);
    y += qline('agp_hap1',  s.agp_hap1);
    y += qline('agp_hap2',  s.agp_hap2);
    y += qline('r1_path',   s.r1_path);
    y += qline('r2_path',   s.r2_path);
    y += qline('hifi_path', s.hifi_path);

  } else if (mode === 'finalgenome') {
    y += qline('sample',        s.sample);
    y += qline('diploid_path',  s.diploid_path);
    y += qline('agp_diploid',   s.agp_diploid);
    y += qline('r1_path',       s.r1_path);
    y += qline('r2_path',       s.r2_path);
    y += qline('hifi_path',     s.hifi_path);
    y += sline('buscodb',       s.buscodb);
    y += formatNcbiRefseq(s.ncbi_refseq, true);

    y += `fastk:\n`;
    y += isline('  ', 'default', s.fastk_default);
    y += iline( '  ', 'kmer',    s.fastk_kmer || '31');
  }

  // Shared tool parameters (all modes)
  y += `pretexmap:\n`;
  y += isline('  ', 'default', s.pretexmap_default);

  y += `bwa_mem2:\n`;
  y += isline('  ', 'mem_default', s.bwa_mem2_default);

  y += `pairtools:\n`;
  y += iline( '  ', 'min-mapq', s.pairtools_min_mapq || '5');
  y += isline('  ', 'default',  s.pairtools_default);

  return y;
}

// ----------------------------------------------------------------
// YAML SYNTAX HIGHLIGHTING
// ----------------------------------------------------------------
function highlightYAML(text) {
  const lines = text.split('\n');
  return lines.map((line) => {
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

    // YAML list item  "  - 'value'"
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
  if (counter) counter.textContent = `${yaml.split('\n').filter(Boolean).length} lines`;
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
// DOWNLOAD YAML
// ----------------------------------------------------------------
function downloadYAML() {
  const yaml = generateYAML();
  if (!yaml) return;
  const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
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
  state.pretexmap_default   = '--sortby nosort';
  state.bwa_mem2_default    = '-SP -T0';
  state.pairtools_min_mapq  = '5';
  state.pairtools_default   = '--walks-policy 5unique --max-inter-align-gap 30';
  state.fastk_default       = '-v -M32 -t1';
  state.fastk_kmer          = '31';

  // Reset all inputs
  document.querySelectorAll('.pc-field-input').forEach((el) => {
    el.value = '';
  });
  setFieldValue('f-pretexmap',       state.pretexmap_default);
  setFieldValue('f-bwa-mem2',        state.bwa_mem2_default);
  setFieldValue('f-pairtools-mapq',  state.pairtools_min_mapq);
  setFieldValue('f-pairtools',       state.pairtools_default);
  setFieldValue('f-fastk-default',   state.fastk_default);
  setFieldValue('f-fastk-kmer',      state.fastk_kmer);

  // Reset mode radios
  document.querySelectorAll('input[name="procura_mode"]').forEach((r) => { r.checked = false; });

  // Hide sections
  ['section-reads', 'section-assembly', 'section-refs', 'section-tools'].forEach(hideSection);

  // Show mode hint
  const $hint = $('mode-hint');
  if ($hint) $hint.classList.remove('hidden');

  updateConditionals();
  updateYAML();
}
