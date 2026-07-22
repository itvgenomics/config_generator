// ================================================================
//  PIMBA — pimba.js
//  3-mode configurator: main | place | tax
// ================================================================

// ----------------------------------------------------------------
// STATE
// ----------------------------------------------------------------
const state = {
  mode: '',   // 'main' | 'place' | 'tax'

  // ── Shared: Singularity (main + tax) ──
  sif_dir:   '',
  cache_dir: '',
  temp_dir:  '',

  // ── Shared: Resources (main + tax) ──
  num_threads: '8',

  // ── Main: Prepare General ──
  minlength:     '100',
  minphred:      '20',
  outputprepare: 'AllSamples',

  // ── Main: Prepare Mode ──
  prepare_mode: 'paired_end',

  // Paired-end
  rawdatadir:  '',
  adapters:    '',
  minoverlap:  '10',
  minsim:      '0.9',
  merger:      'pear',

  // Single index
  raw_fastq_single:   '',
  prefix:             '',
  singleadapter:      '',
  barcodes_5end_txt:  '',
  barcodes_5end_fasta: '',

  // Dual index
  raw_fastq_dual:     '',
  barcodes_3end_txt:  '',
  barcodes_3end_rev:  '',
  barcodes_3end_fasta: '',
  barcodes_5end_dir:  '',
  dual_barcodes_5end_txt: '',
  forward_adapter:    '',
  reverse_adapter:    '',

  // ── Shared: Run (main + tax) ──
  outputrun:        'AllSamples_97clust90assign',
  strategy:         'otu',
  otu_similarity:   '0.97',
  assign_similarity: '0.9',
  mincoverage:      '0.9',
  otu_length:       '200',
  hits_per_subject: '1',
  marker_gene:      'COI-BOLD',
  e_value:          '0.001',
  lulu:             'no',
  ITS:              'no',
  remote:           'yes',
  db_type:          'nt',
  blast_type:       'megablast',

  // ── Shared: Reference Databases (main + tax) ──
  coi_bold_db:        '',
  silva_db:           '',
  greengenes_db:      '',
  rdp_db:             '',
  ncbi_db:            '',
  its_fungi_unite_db: '',
  taxdump:            '',

  // ── Shared: Curate (main + tax) ──
  ncbi_taxizedb: '',
  curate_mode:   'single',

  // ── Main only: Plot ──
  metadata: '',
  group_by: 'Species',

  // ── Tax only: Inputs ──
  fasta_file:          '',
  txt_table:           '',
  raw_reads:           '',
  tax_outputprepare:   'AllSamples',
  tax_outputrun:       '',

  // ── Place: Input Data ──
  samples:             '',
  reference_tree:      '',
  reference_alignment: '',
  taxonomy_file:       '',

  // ── Place: Settings ──
  datatype:       'nt',
  use_chunkify:   'True',
  clustering_no:  true,   // bool for no_clustering toggle
  clustering_swarm: false, // bool for swarm toggle
  alignment_tool: 'hmmer',
  placement_tool: 'epa-ng',
  outdir:         'results/04-place/',

  // ── Place: Params — general ──
  place_threads: '8',

  // Swarm
  swarm_differences: '1',
  swarm_fastidious:  'True',

  // Chunkify
  hash_function:     'SHA1',
  min_abundance:     '1',
  chunk_size:        '50000',
  jplace_cache_size: '0',

  // HMMER
  hmmbuild_extra:  '',
  hmmsearch_e:     '0.01',
  hmmalign_trim:   'False',

  // RAxML-NG
  raxml_threads: '2',
  raxml_extra:   '',

  // EPA-ng
  epa_model:        'GTR+G',
  epa_model_params: '',

  // GAPPA heat-tree
  sample_trees:  'False',
  svg_ladderize: 'True',
  min_value:     '1.0',
  under_color:   '#808080',

  // GAPPA assign
  distant_label:    'False',
  resolve_missing:  'True',
  gappa_krona:      'True',

  // Guppy
  include_pendant: 'False',
};

// ----------------------------------------------------------------
// DOM HELPERS
// ----------------------------------------------------------------
const $ = (id) => document.getElementById(id);

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

function show(id) { const el = $(id); if (el) el.classList.remove('hidden'); }
function hide(id) { const el = $(id); if (el) el.classList.add('hidden'); }

function setVal(id, value) {
  const el = $(id);
  if (el) el.value = value;
}

// ----------------------------------------------------------------
// INIT
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Pre-populate defaults
  setVal('f-num-threads',      state.num_threads);
  setVal('f-minlength',        state.minlength);
  setVal('f-minphred',         state.minphred);
  setVal('f-outputprepare',    state.outputprepare);
  setVal('f-minoverlap',       state.minoverlap);
  setVal('f-minsim',           state.minsim);
  setVal('f-merger',           state.merger);
  setVal('f-outputrun',        state.outputrun);
  setVal('f-strategy',         state.strategy);
  setVal('f-otu-similarity',   state.otu_similarity);
  setVal('f-assign-similarity', state.assign_similarity);
  setVal('f-mincoverage',      state.mincoverage);
  setVal('f-otu-length',       state.otu_length);
  setVal('f-hits-per-subject', state.hits_per_subject);
  setVal('f-marker-gene',      state.marker_gene);
  setVal('f-e-value',          state.e_value);
  setVal('f-lulu',             state.lulu);
  setVal('f-ITS',              state.ITS);
  setVal('f-remote',           state.remote);
  setVal('f-db-type',          state.db_type);
  setVal('f-blast-type',       state.blast_type);
  setVal('f-curate-mode',      state.curate_mode);
  setVal('f-group-by',         state.group_by);
  setVal('f-datatype',         state.datatype);
  setVal('f-use-chunkify',     state.use_chunkify);
  setVal('f-alignment-tool',   state.alignment_tool);
  setVal('f-placement-tool',   state.placement_tool);
  setVal('f-outdir',           state.outdir);
  setVal('f-place-threads',    state.place_threads);
  setVal('f-swarm-differences', state.swarm_differences);
  setVal('f-swarm-fastidious', state.swarm_fastidious);
  setVal('f-hash-function',    state.hash_function);
  setVal('f-min-abundance',    state.min_abundance);
  setVal('f-chunk-size',       state.chunk_size);
  setVal('f-jplace-cache-size', state.jplace_cache_size);
  setVal('f-hmmbuild-extra',   state.hmmbuild_extra);
  setVal('f-hmmsearch-e',      state.hmmsearch_e);
  setVal('f-hmmalign-trim',    state.hmmalign_trim);
  setVal('f-raxml-threads',    state.raxml_threads);
  setVal('f-raxml-extra',      state.raxml_extra);
  setVal('f-epa-model',        state.epa_model);
  setVal('f-epa-model-params', state.epa_model_params);
  setVal('f-sample-trees',     state.sample_trees);
  setVal('f-svg-ladderize',    state.svg_ladderize);
  setVal('f-min-value',        state.min_value);
  setVal('f-under-color',      state.under_color);
  setVal('f-distant-label',    state.distant_label);
  setVal('f-resolve-missing',  state.resolve_missing);
  setVal('f-gappa-krona',      state.gappa_krona);
  setVal('f-include-pendant',  state.include_pendant);

  bindEvents();
  updateYAML();
});

// ----------------------------------------------------------------
// BIND EVENTS
// ----------------------------------------------------------------
function bindEvents() {
  // Mode radios
  document.querySelectorAll('input[name="pimba_mode"]').forEach((r) => {
    r.addEventListener('change', (e) => {
      state.mode = e.target.value;
      onModeChange();
    });
  });

  // Prepare sub-mode toggles
  document.querySelectorAll('[data-prepare]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.prepare_mode = btn.dataset.prepare;
      document.querySelectorAll('[data-prepare]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      updatePrepareConditionals();
      updatePrepareBadge();
      updateYAML();
    });
  });

  // Clustering tool toggles (multi-select)
  const ctoggleNo    = $('ctoggle-no-clustering');
  const ctoggleSwarm = $('ctoggle-swarm');
  if (ctoggleNo) {
    ctoggleNo.addEventListener('click', () => {
      state.clustering_no = !state.clustering_no;
      ctoggleNo.classList.toggle('active', state.clustering_no);
      updateYAML();
    });
  }
  if (ctoggleSwarm) {
    ctoggleSwarm.addEventListener('click', () => {
      state.clustering_swarm = !state.clustering_swarm;
      ctoggleSwarm.classList.toggle('active', state.clustering_swarm);
      updateYAML();
    });
  }

  // All text/select/number/textarea inputs
  const fieldMap = [
    ['f-sif-dir',           'sif_dir'],
    ['f-cache-dir',         'cache_dir'],
    ['f-temp-dir',          'temp_dir'],
    ['f-num-threads',       'num_threads'],
    ['f-minlength',         'minlength'],
    ['f-minphred',          'minphred'],
    ['f-outputprepare',     'outputprepare'],
    ['f-rawdatadir',        'rawdatadir'],
    ['f-adapters',          'adapters'],
    ['f-minoverlap',        'minoverlap'],
    ['f-minsim',            'minsim'],
    ['f-merger',            'merger'],
    ['f-raw-fastq-single',  'raw_fastq_single'],
    ['f-prefix',            'prefix'],
    ['f-singleadapter',     'singleadapter'],
    ['f-barcodes-5end-txt', 'barcodes_5end_txt'],
    ['f-barcodes-5end-fasta', 'barcodes_5end_fasta'],
    ['f-raw-fastq-dual',    'raw_fastq_dual'],
    ['f-barcodes-3end-txt', 'barcodes_3end_txt'],
    ['f-barcodes-3end-rev', 'barcodes_3end_rev'],
    ['f-barcodes-3end-fasta', 'barcodes_3end_fasta'],
    ['f-dual-barcodes-5end-txt', 'dual_barcodes_5end_txt'],
    ['f-dual-barcodes-5end-dir', 'barcodes_5end_dir'],
    ['f-forward-adapter',   'forward_adapter'],
    ['f-reverse-adapter',   'reverse_adapter'],
    ['f-outputrun',         'outputrun'],
    ['f-strategy',          'strategy'],
    ['f-otu-similarity',    'otu_similarity'],
    ['f-assign-similarity', 'assign_similarity'],
    ['f-mincoverage',       'mincoverage'],
    ['f-otu-length',        'otu_length'],
    ['f-hits-per-subject',  'hits_per_subject'],
    ['f-marker-gene',       'marker_gene'],
    ['f-e-value',           'e_value'],
    ['f-lulu',              'lulu'],
    ['f-ITS',               'ITS'],
    ['f-remote',            'remote'],
    ['f-db-type',           'db_type'],
    ['f-blast-type',        'blast_type'],
    ['f-coi-bold-db',       'coi_bold_db'],
    ['f-silva-db',          'silva_db'],
    ['f-greengenes-db',     'greengenes_db'],
    ['f-rdp-db',            'rdp_db'],
    ['f-ncbi-db',           'ncbi_db'],
    ['f-its-fungi-unite-db','its_fungi_unite_db'],
    ['f-taxdump',           'taxdump'],
    ['f-ncbi-taxizedb',     'ncbi_taxizedb'],
    ['f-curate-mode',       'curate_mode'],
    ['f-metadata',          'metadata'],
    ['f-group-by',          'group_by'],
    ['f-fasta-file',        'fasta_file'],
    ['f-txt-table',         'txt_table'],
    ['f-raw-reads',         'raw_reads'],
    ['f-tax-outputprepare', 'tax_outputprepare'],
    ['f-tax-outputrun',     'tax_outputrun'],
    ['f-samples',           'samples'],
    ['f-reference-tree',    'reference_tree'],
    ['f-reference-alignment','reference_alignment'],
    ['f-taxonomy-file',     'taxonomy_file'],
    ['f-datatype',          'datatype'],
    ['f-use-chunkify',      'use_chunkify'],
    ['f-alignment-tool',    'alignment_tool'],
    ['f-placement-tool',    'placement_tool'],
    ['f-outdir',            'outdir'],
    ['f-place-threads',     'place_threads'],
    ['f-swarm-differences', 'swarm_differences'],
    ['f-swarm-fastidious',  'swarm_fastidious'],
    ['f-hash-function',     'hash_function'],
    ['f-min-abundance',     'min_abundance'],
    ['f-chunk-size',        'chunk_size'],
    ['f-jplace-cache-size', 'jplace_cache_size'],
    ['f-hmmbuild-extra',    'hmmbuild_extra'],
    ['f-hmmsearch-e',       'hmmsearch_e'],
    ['f-hmmalign-trim',     'hmmalign_trim'],
    ['f-raxml-threads',     'raxml_threads'],
    ['f-raxml-extra',       'raxml_extra'],
    ['f-epa-model',         'epa_model'],
    ['f-epa-model-params',  'epa_model_params'],
    ['f-sample-trees',      'sample_trees'],
    ['f-svg-ladderize',     'svg_ladderize'],
    ['f-min-value',         'min_value'],
    ['f-under-color',       'under_color'],
    ['f-distant-label',     'distant_label'],
    ['f-resolve-missing',   'resolve_missing'],
    ['f-gappa-krona',       'gappa_krona'],
    ['f-include-pendant',   'include_pendant'],
  ];

  fieldMap.forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', (e) => { state[key] = e.target.value; updateYAML(); });
    el.addEventListener('change', (e) => { state[key] = e.target.value; updateYAML(); });
  });

  // Action buttons
  $('btn-download').addEventListener('click', downloadYAML);
  $('btn-copy').addEventListener('click', () => copyYAML('btn-copy'));
  $('btn-copy-yaml').addEventListener('click', () => copyYAML('btn-copy-yaml'));
  $('btn-reset').addEventListener('click', resetForm);
}

// ----------------------------------------------------------------
// MODE CHANGE
// ----------------------------------------------------------------
const ALL_MAIN_SECTIONS   = ['section-singularity', 'section-resources', 'section-prepare-general',
                              'section-prepare-mode', 'section-run', 'section-databases',
                              'section-curate', 'section-plot'];
const ALL_PLACE_SECTIONS  = ['section-place-input', 'section-place-settings', 'section-place-params'];
const ALL_TAX_SECTIONS    = ['section-singularity', 'section-resources', 'section-tax-inputs',
                              'section-run', 'section-databases', 'section-curate'];

function onModeChange() {
  const mode = state.mode;

  // Hide all sections first
  [...ALL_MAIN_SECTIONS, ...ALL_PLACE_SECTIONS, 'section-tax-inputs'].forEach(hideSection);

  const hint = $('mode-hint');
  if (hint) hint.classList.add('hidden');

  // Update YAML filename display
  const fn = $('yaml-filename');
  if (fn) {
    fn.textContent = mode === 'place' ? 'config_place.yaml'
                   : mode === 'tax'   ? 'config_tax.yaml'
                   : 'config.yaml';
  }

  if (mode === 'main') {
    ALL_MAIN_SECTIONS.forEach((id, i) => showSection(id, i * 80));
    // Renumber run section step
    const s = $('step-run'); if (s) s.textContent = '5';
    const d = $('step-databases'); if (d) d.textContent = '6';
    const c = $('step-curate'); if (c) c.textContent = '7';
  } else if (mode === 'place') {
    ALL_PLACE_SECTIONS.forEach((id, i) => showSection(id, i * 80));
  } else if (mode === 'tax') {
    ALL_TAX_SECTIONS.forEach((id, i) => showSection(id, i * 80));
    // Renumber for tax: sing=1, res=2, tax-inputs=3, run=4, db=5, curate=6
    const s = $('step-run'); if (s) s.textContent = '4';
    const d = $('step-databases'); if (d) d.textContent = '5';
    const c = $('step-curate'); if (c) c.textContent = '6';
  }

  updatePrepareConditionals();
  updatePrepareBadge();
  updateDBBadge();
  updateYAML();
}

// ----------------------------------------------------------------
// PREPARE SUB-MODE CONDITIONALS
// ----------------------------------------------------------------
function updatePrepareConditionals() {
  const pm = state.prepare_mode;
  pm === 'paired_end'   ? show('group-paired') : hide('group-paired');
  pm === 'single_index' ? show('group-single') : hide('group-single');
  pm === 'dual_index'   ? show('group-dual')   : hide('group-dual');
}

function updatePrepareBadge() {
  const badge = $('prepare-mode-badge');
  if (!badge) return;
  const labels = { paired_end: 'PAIRED-END', single_index: 'SINGLE INDEX', dual_index: 'DUAL INDEX' };
  badge.textContent = labels[state.prepare_mode] || '—';
}

function updateDBBadge() {
  const badge = $('db-badge');
  if (!badge) return;
  const labels = {
    'COI-BOLD': 'COI-BOLD', 'COI-NCBI': 'COI-NCBI', '16S-SILVA': '16S-SILVA',
    '16S-GREENGENES': '16S-GREENGENES', '16S-RDP': '16S-RDP', '16S-NCBI': '16S-NCBI',
    'ITS-PLANTS-NCBI': 'ITS-PLANTS', 'ITS-FUNGI-UNITE': 'ITS-UNITE',
    'ITS-FUNGI-NCBI': 'ITS-NCBI', 'ALL-NCBI': 'ALL-NCBI',
  };
  badge.textContent = labels[state.marker_gene] || '—';
}

// ----------------------------------------------------------------
// YAML HELPERS
// ----------------------------------------------------------------
const q  = (key, val, indent='') => `${indent}${key}: '${val ?? ''}'\n`;
const nl = (key, val, indent='') => `${indent}${key}: ${val ?? ''}\n`;
const ql = (key, val, indent='') => `${indent}${key}: "${val ?? ''}"\n`;

function comment(text) {
  if (!text) return '\n';
  return text.split('\n').map((l) => l ? `# ${l}` : '#').join('\n') + '\n';
}

function sectionHeader(title) {
  const line = '='.repeat(74);
  return `\n# ${'='.repeat(74)}\n# ${title}\n# ${line}\n\n`;
}

// ----------------------------------------------------------------
// YAML GENERATION — Main Config
// ----------------------------------------------------------------
function generateMain() {
  const s = state;
  let y = '';

  // --- Singularity ---
  y += sectionHeader('SINGULARITY STORAGE');
  y += q('sif_dir',   s.sif_dir);
  y += q('cache_dir', s.cache_dir);
  y += q('temp_dir',  s.temp_dir);

  // --- Resources ---
  y += sectionHeader('COMPUTATIONAL RESOURCES');
  y += nl('num_threads', s.num_threads || 8);

  // --- Prepare General ---
  y += sectionHeader('PIMBA PREPARE \u2014 GENERAL READ-PROCESSING OPTIONS');
  y += nl('minlength',     s.minlength     || 100);
  y += nl('minphred',      s.minphred      || 20);
  y += q('outputprepare', s.outputprepare);

  // --- Prepare Mode-specific ---
  y += sectionHeader('PIMBA PREPARE \u2014 PAIRED-END READS');
  if (s.prepare_mode === 'paired_end') {
    y += q('rawdatadir', s.rawdatadir);
    y += q('adapters',   s.adapters);
    y += nl('minoverlap', s.minoverlap || 10);
    y += nl('minsim',     s.minsim     || 0.9);
    y += q('merger',     s.merger);
  } else {
    y += q('rawdatadir', '');
    y += q('adapters',   '');
    y += nl('minoverlap', '');
    y += nl('minsim',     '');
    y += q('merger',     '');
  }

  y += sectionHeader('PIMBA PREPARE \u2014 SINGLE-END READS WITH A SINGLE INDEX');
  if (s.prepare_mode === 'single_index') {
    y += q('raw_fastq_single',   s.raw_fastq_single);
    y += q('prefix',             s.prefix);
    y += q('barcodes_5end_txt',  s.barcodes_5end_txt);
    y += q('singleadapter',      s.singleadapter);
    y += q('barcodes_5end_fasta', s.barcodes_5end_fasta);
  } else {
    y += q('raw_fastq_single',   '');
    y += q('prefix',             '');
    y += q('barcodes_5end_txt',  '');
    y += q('singleadapter',      '');
    y += q('barcodes_5end_fasta', '');
  }

  y += sectionHeader('PIMBA PREPARE \u2014 SINGLE-END READS WITH DUAL INDEXES');
  if (s.prepare_mode === 'dual_index') {
    y += q('raw_fastq_dual',     s.raw_fastq_dual);
    y += q('barcodes_3end_txt',  s.barcodes_3end_txt);
    y += q('barcodes_3end_rev',  s.barcodes_3end_rev);
    y += q('barcodes_3end_fasta', s.barcodes_3end_fasta);
    y += q('barcodes_5end_dir',  s.barcodes_5end_dir);
    y += q('forward_adapter',    s.forward_adapter);
    y += q('reverse_adapter',    s.reverse_adapter);
  } else {
    y += q('raw_fastq_dual',     '');
    y += q('barcodes_3end_txt',  '');
    y += q('barcodes_3end_rev',  '');
    y += q('barcodes_3end_fasta', '');
    y += q('barcodes_5end_dir',  '');
    y += q('forward_adapter',    '');
    y += q('reverse_adapter',    '');
  }

  // --- Run ---
  y += sectionHeader('PIMBA RUN \u2014 OTU/ASV INFERENCE AND TAXONOMIC ASSIGNMENT');
  y += q('outputrun',        s.outputrun);
  y += q('strategy',         s.strategy);
  y += nl('otu_similarity',  s.otu_similarity   || 0.97);
  y += nl('assign_similarity', s.assign_similarity || 0.9);
  y += nl('mincoverage',     s.mincoverage      || 0.9);
  y += nl('otu_length',      s.otu_length       || 200);
  y += nl('hits_per_subject', s.hits_per_subject || 1);
  y += q('marker_gene',     s.marker_gene);
  y += nl('e_value',         s.e_value          || 0.001);
  y += q('lulu',             s.lulu);
  y += q('ITS',              s.ITS);
  y += q('remote',           s.remote);
  y += q('db_type',          s.db_type);
  y += q('blast_type',       s.blast_type);

  // --- Databases ---
  y += sectionHeader('REFERENCE DATABASE PATHS');
  y += nl('16S-SILVA-DB',     `'${s.silva_db}'`);
  y += nl('COI-BOLD-DB',      `'${s.coi_bold_db}'`);
  y += nl('16S-GREENGENES-DB', `'${s.greengenes_db}'`);
  y += nl('16S-RDP-DB',       `'${s.rdp_db}'`);
  y += nl('NCBI-DB',          `'${s.ncbi_db}'`);
  y += nl('ITS-FUNGI-UNITE-DB', `'${s.its_fungi_unite_db}'`);
  y += nl('taxdump',          `'${s.taxdump}'`);

  // --- Curate ---
  y += sectionHeader('PIMBA CURATE \u2014 TAXONOMIC STANDARDIZATION AND VALIDATION');
  y += q('ncbi_taxizedb', s.ncbi_taxizedb);
  y += q('mode',          s.curate_mode);

  // --- Plot ---
  y += sectionHeader('PIMBA PLOT \u2014 METADATA AND SAMPLE GROUPING');
  y += q('metadata', s.metadata);
  y += q('group_by', s.group_by);

  return y.trimStart();
}

// ----------------------------------------------------------------
// YAML GENERATION — PIMBA Place
// ----------------------------------------------------------------
function generatePlace() {
  const s = state;
  let y = '';

  // Build clustering list
  const clusterList = [];
  if (s.clustering_no)    clusterList.push('no_clustering');
  if (s.clustering_swarm) clusterList.push('swarm');
  const clusterYaml = clusterList.length > 0
    ? clusterList.map((c) => `    - "${c}"`).join('\n') + '\n'
    : `    - "no_clustering"\n`;

  // Build samples list
  const sampleLines = (s.samples || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const samplesYaml = sampleLines.length > 0
    ? sampleLines.map((p) => `    - "${p}"`).join('\n') + '\n'
    : `    - ""\n`;

  y += `data:\n\n`;
  y += `  samples:\n${samplesYaml}\n`;
  y += `  reference-tree: "${s.reference_tree}"\n\n`;
  y += `  reference-alignment: "${s.reference_alignment}"\n\n`;
  y += `  taxonomy-file: "${s.taxonomy_file}"\n\n`;

  y += `\nsettings:\n\n`;
  y += `  datatype: "${s.datatype}"\n\n`;
  y += `  clustering-tool:\n${clusterYaml}\n`;
  y += `  use-chunkify: ${s.use_chunkify}\n\n`;
  y += `  alignment-tool: "${s.alignment_tool}"\n\n`;
  y += `  placement-tool: "${s.placement_tool}"\n\n`;
  y += `  outdir: "${s.outdir}"\n\n`;

  y += `\nparams:\n\n`;
  y += `  threads: ${s.place_threads || 8}\n\n`;

  y += `  swarm:\n`;
  y += `    differences: ${s.swarm_differences || 1}\n`;
  y += `    fastidious: ${s.swarm_fastidious}\n\n`;

  y += `  chunkify:\n`;
  y += `    hash-function: "${s.hash_function}"\n`;
  y += `    min-abundance: ${s.min_abundance || 1}\n`;
  y += `    chunk-size: ${s.chunk_size || 50000}\n`;
  y += `    jplace-cache-size: ${s.jplace_cache_size || 0}\n\n`;

  y += `  hmmer:\n\n`;
  y += `    hmmbuild:\n`;
  y += `      extra: "${s.hmmbuild_extra}"\n\n`;
  y += `    hmmalign:\n`;
  y += `      trim: ${s.hmmalign_trim}\n\n`;
  y += `    hmmsearch:\n`;
  y += `      E: ${s.hmmsearch_e || 0.01}\n\n`;

  y += `  raxml-ng:\n`;
  y += `    threads: ${s.raxml_threads || 2}\n`;
  y += `    extra: "${s.raxml_extra}"\n\n`;

  y += `  epa-ng:\n`;
  y += `    model-params: "${s.epa_model_params}"\n`;
  y += `    model: "${s.epa_model}"\n\n`;

  y += `  gappa:\n\n`;
  y += `    heat-tree:\n`;
  y += `      sample-trees: ${s.sample_trees}\n`;
  y += `      formats:\n        - "svg"\n        - "newick"\n`;
  y += `      svg-tree-ladderize: ${s.svg_ladderize}\n`;
  y += `      min-value: ${s.min_value || 1.0}\n`;
  y += `      under-color: "${s.under_color}"\n\n`;
  y += `    assign:\n`;
  y += `      distant-label: ${s.distant_label}\n`;
  y += `      resolve-missing-paths: ${s.resolve_missing}\n`;
  y += `      krona: ${s.gappa_krona}\n\n`;

  y += `  guppy:\n\n`;
  y += `    fpd:\n`;
  y += `      include-pendant: ${s.include_pendant}\n`;

  return y.trimStart();
}

// ----------------------------------------------------------------
// YAML GENERATION — PIMBA Tax
// ----------------------------------------------------------------
function generateTax() {
  const s = state;
  let y = '';

  // --- Singularity ---
  y += sectionHeader('SINGULARITY STORAGE');
  y += q('sif_dir',   s.sif_dir);
  y += q('cache_dir', s.cache_dir);
  y += q('temp_dir',  s.temp_dir);

  // --- Resources ---
  y += sectionHeader('COMPUTATIONAL RESOURCES');
  y += nl('num_threads', s.num_threads || 8);

  // --- Tax Inputs ---
  y += sectionHeader('PIMBA TAX \u2014 REQUIRED EXISTING DATASET INPUTS');
  y += q('txt_table',  s.txt_table);
  y += q('fasta_file', s.fasta_file);
  y += q('raw_reads',  s.raw_reads);

  // --- Output Naming ---
  y += sectionHeader('DATASET AND OUTPUT NAMING');
  y += q('outputprepare', s.tax_outputprepare || s.outputprepare || 'AllSamples');
  y += q('outputrun',     s.tax_outputrun);

  // --- Strategy ---
  y += sectionHeader('ORIGINAL SEQUENCE-INFERENCE STRATEGY');
  y += q('strategy',      s.strategy);
  y += nl('otu_similarity', s.otu_similarity || 0.97);

  // --- Taxonomic Filters ---
  y += sectionHeader('TAXONOMIC ASSIGNMENT FILTERS');
  y += nl('assign_similarity', s.assign_similarity || 0.9);
  y += nl('mincoverage',       s.mincoverage      || 0.9);
  y += nl('otu_length',        s.otu_length       || 200);
  y += nl('hits_per_subject',  s.hits_per_subject || 1);

  // --- DB Selection ---
  y += sectionHeader('REFERENCE DATABASE SELECTION');
  y += q('marker_gene',  s.marker_gene);
  y += nl('e_value',     s.e_value || 0.001);
  y += q('lulu',         s.lulu);
  y += q('ITS',          s.ITS);
  y += q('remote',       s.remote);
  y += q('db_type',      s.db_type);
  y += q('blast_type',   s.blast_type);

  // --- Databases ---
  y += sectionHeader('REFERENCE DATABASE PATHS');
  y += nl('16S-SILVA-DB',      `'${s.silva_db}'`);
  y += nl('COI-BOLD-DB',       `'${s.coi_bold_db}'`);
  y += nl('16S-GREENGENES-DB', `'${s.greengenes_db}'`);
  y += nl('16S-RDP-DB',        `'${s.rdp_db}'`);
  y += nl('NCBI-DB',           `'${s.ncbi_db}'`);
  y += nl('ITS-FUNGI-UNITE-DB', `'${s.its_fungi_unite_db}'`);
  y += nl('taxdump',           `'${s.taxdump}'`);

  // --- Curate ---
  y += sectionHeader('OPTIONAL PIMBA CURATE SETTINGS');
  y += q('ncbi_taxizedb', s.ncbi_taxizedb);
  y += q('mode',          s.curate_mode);

  return y.trimStart();
}

// ----------------------------------------------------------------
// DISPATCH
// ----------------------------------------------------------------
function generateYAML() {
  if (!state.mode) return '';
  if (state.mode === 'main')  return generateMain();
  if (state.mode === 'place') return generatePlace();
  if (state.mode === 'tax')   return generateTax();
  return '';
}

// ----------------------------------------------------------------
// YAML SYNTAX HIGHLIGHTING
// ----------------------------------------------------------------
function highlightYAML(text) {
  return text.split('\n').map((line) => {
    // Comment lines
    if (/^\s*#/.test(line)) {
      return `<span class="y-comment">${esc(line)}</span>`;
    }
    // Key-value
    const kv = line.match(/^(\s*)([\w./-]+)(\s*:\s*)(.*)$/);
    if (kv) {
      const [, indent, key, sep, raw] = kv;
      let valHtml;
      if (!raw || raw === '') {
        valHtml = '';
      } else if (/^'.*'$/.test(raw) || /^".*"$/.test(raw)) {
        valHtml = `<span class="y-string">${esc(raw)}</span>`;
      } else if (/^\d+(\.\d+)?$/.test(raw)) {
        valHtml = `<span class="y-number">${esc(raw)}</span>`;
      } else if (/^(True|False|true|false|yes|no)$/.test(raw)) {
        valHtml = `<span class="y-bool">${esc(raw)}</span>`;
      } else {
        valHtml = `<span class="y-string">${esc(raw)}</span>`;
      }
      return `${esc(indent)}<span class="y-key">${esc(key)}</span><span class="y-sep">${esc(sep)}</span>${valHtml}`;
    }
    // List items
    const li = line.match(/^(\s*-\s+)(.*)$/);
    if (li) {
      const [, pfx, val] = li;
      const valHtml = /^'.*'$/.test(val) || /^".*"$/.test(val)
        ? `<span class="y-string">${esc(val)}</span>`
        : esc(val);
      return `${esc(pfx)}${valHtml}`;
    }
    return esc(line);
  }).join('\n');
}

function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ----------------------------------------------------------------
// UPDATE YAML PREVIEW
// ----------------------------------------------------------------
function updateYAML() {
  const yaml    = generateYAML();
  const code    = $('yaml-code');
  const counter = $('yaml-line-count');

  if (!state.mode) {
    if (code) code.innerHTML = '<span class="pc-yaml-placeholder">← Select a mode to generate YAML</span>';
    if (counter) counter.textContent = '— lines';
    return;
  }

  if (code) code.innerHTML = highlightYAML(yaml);
  if (counter) counter.textContent = `${yaml.split('\n').filter(Boolean).length} lines`;

  // Keep DB badge in sync
  updateDBBadge();
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
      const orig = btn.textContent.trim();
      btn.textContent = '✓ Copied';
      setTimeout(() => { btn.textContent = orig; }, 1800);
    }
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = yaml;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
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
  const filename = state.mode === 'place' ? 'config_place.yaml'
                 : state.mode === 'tax'   ? 'config_tax.yaml'
                 : 'config.yaml';
  const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
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
  Object.keys(state).forEach((k) => {
    if (typeof state[k] === 'boolean') { state[k] = false; }
    else { state[k] = ''; }
  });
  state.mode              = '';
  state.num_threads       = '8';
  state.minlength         = '100';
  state.minphred          = '20';
  state.outputprepare     = 'AllSamples';
  state.prepare_mode      = 'paired_end';
  state.minoverlap        = '10';
  state.minsim            = '0.9';
  state.merger            = 'pear';
  state.outputrun         = 'AllSamples_97clust90assign';
  state.strategy          = 'otu';
  state.otu_similarity    = '0.97';
  state.assign_similarity = '0.9';
  state.mincoverage       = '0.9';
  state.otu_length        = '200';
  state.hits_per_subject  = '1';
  state.marker_gene       = 'COI-BOLD';
  state.e_value           = '0.001';
  state.lulu              = 'no';
  state.ITS               = 'no';
  state.remote            = 'yes';
  state.db_type           = 'nt';
  state.blast_type        = 'megablast';
  state.curate_mode       = 'single';
  state.group_by          = 'Species';
  state.datatype          = 'nt';
  state.use_chunkify      = 'True';
  state.clustering_no     = true;
  state.clustering_swarm  = false;
  state.alignment_tool    = 'hmmer';
  state.placement_tool    = 'epa-ng';
  state.outdir            = 'results/04-place/';
  state.place_threads     = '8';
  state.swarm_differences = '1';
  state.swarm_fastidious  = 'True';
  state.hash_function     = 'SHA1';
  state.min_abundance     = '1';
  state.chunk_size        = '50000';
  state.jplace_cache_size = '0';
  state.hmmbuild_extra    = '';
  state.hmmsearch_e       = '0.01';
  state.hmmalign_trim     = 'False';
  state.raxml_threads     = '2';
  state.fasta_file        = '';
  state.txt_table         = '';
  state.raw_reads         = '';
  state.tax_outputprepare = 'AllSamples';
  state.tax_outputrun     = '';
  state.raxml_extra       = '';
  state.epa_model         = 'GTR+G';
  state.epa_model_params  = '';
  state.sample_trees      = 'False';
  state.svg_ladderize     = 'True';
  state.min_value         = '1.0';
  state.under_color       = '#808080';
  state.distant_label     = 'False';
  state.resolve_missing   = 'True';
  state.gappa_krona       = 'True';
  state.include_pendant   = 'False';

  // Reset all form inputs
  document.querySelectorAll('.pc-field-input, .pc-field-select').forEach((el) => {
    el.value = '';
  });

  // Re-apply defaults to fields
  setVal('f-num-threads', '8');
  setVal('f-minlength', '100');
  setVal('f-minphred', '20');
  setVal('f-outputprepare', 'AllSamples');
  setVal('f-minoverlap', '10');
  setVal('f-minsim', '0.9');
  setVal('f-merger', 'pear');
  setVal('f-outputrun', 'AllSamples_97clust90assign');
  setVal('f-strategy', 'otu');
  setVal('f-otu-similarity', '0.97');
  setVal('f-assign-similarity', '0.9');
  setVal('f-mincoverage', '0.9');
  setVal('f-otu-length', '200');
  setVal('f-hits-per-subject', '1');
  setVal('f-marker-gene', 'COI-BOLD');
  setVal('f-e-value', '0.001');
  setVal('f-lulu', 'no');
  setVal('f-ITS', 'no');
  setVal('f-remote', 'yes');
  setVal('f-db-type', 'nt');
  setVal('f-blast-type', 'megablast');
  setVal('f-curate-mode', 'single');
  setVal('f-group-by', 'Species');
  setVal('f-datatype', 'nt');
  setVal('f-use-chunkify', 'True');
  setVal('f-alignment-tool', 'hmmer');
  setVal('f-placement-tool', 'epa-ng');
  setVal('f-outdir', 'results/04-place/');
  setVal('f-place-threads', '8');
  setVal('f-swarm-differences', '1');
  setVal('f-swarm-fastidious', 'True');
  setVal('f-hash-function', 'SHA1');
  setVal('f-min-abundance', '1');
  setVal('f-chunk-size', '50000');
  setVal('f-jplace-cache-size', '0');
  setVal('f-hmmbuild-extra', '');
  setVal('f-hmmsearch-e', '0.01');
  setVal('f-hmmalign-trim', 'False');
  setVal('f-raxml-threads', '2');
  setVal('f-raxml-extra', '');
  setVal('f-epa-model', 'GTR+G');
  setVal('f-tax-outputprepare', 'AllSamples');
  setVal('f-raw-reads', '');
  setVal('f-epa-model-params', '');
  setVal('f-sample-trees', 'False');
  setVal('f-svg-ladderize', 'True');
  setVal('f-min-value', '1.0');
  setVal('f-under-color', '#808080');
  setVal('f-distant-label', 'False');
  setVal('f-resolve-missing', 'True');
  setVal('f-gappa-krona', 'True');
  setVal('f-include-pendant', 'False');

  // Reset prepare toggle buttons
  document.querySelectorAll('[data-prepare]').forEach((b) => b.classList.remove('active'));
  const pairedBtn = $('ptoggle-paired');
  if (pairedBtn) pairedBtn.classList.add('active');

  // Reset clustering toggles
  const ctNo = $('ctoggle-no-clustering');
  const ctSw = $('ctoggle-swarm');
  if (ctNo) ctNo.classList.add('active');
  if (ctSw) ctSw.classList.remove('active');

  // Reset mode radios
  document.querySelectorAll('input[name="pimba_mode"]').forEach((r) => { r.checked = false; });

  // Reset YAML filename
  const fn = $('yaml-filename');
  if (fn) fn.textContent = 'config.yaml';

  // Hide all sections
  [...ALL_MAIN_SECTIONS, ...ALL_PLACE_SECTIONS, 'section-tax-inputs'].forEach(hideSection);

  // Show mode hint
  const hint = $('mode-hint');
  if (hint) hint.classList.remove('hidden');

  updatePrepareConditionals();
  updatePrepareBadge();
  updateDBBadge();
  updateYAML();
}
