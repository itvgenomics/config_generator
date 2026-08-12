/**
 * submission.js — HPC Submission File Generator
 * Generates SLURM / PBS submission scripts from form inputs.
 */

'use strict';

/* ===================================================================
   STATE
=================================================================== */
const state = {
  scheduler: 'slurm',
  modules: [],            // list of module names (for "module load" env)
};

/* ===================================================================
   HELPERS
=================================================================== */
const $ = (id) => document.getElementById(id);
const val = (id) => ($( id) ? $(id).value.trim() : '');
const checked = (name) => {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
};

/* ===================================================================
   SCHEDULER TOGGLE (SLURM ↔ PBS)
=================================================================== */
function initSchedulerToggle() {
  document.querySelectorAll('input[name="scheduler"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.scheduler = radio.value;
      const isPbs = state.scheduler === 'pbs';

      $('slurm-extra-resources').classList.toggle('hidden', isPbs);
      $('pbs-extra-resources').classList.toggle('hidden', !isPbs);

      // Update working-dir label
      $('wd-submit-label').textContent = isPbs ? '$PBS_O_WORKDIR' : '$SLURM_SUBMIT_DIR';

      // Update filename label in panel header
      $('script-filename').textContent = `submission.${state.scheduler}`;
      $('btn-download-label').textContent = `Download .${state.scheduler}`;

      generateScript();
    });
  });
}

/* ===================================================================
   ENVIRONMENT TOGGLE
=================================================================== */
function initEnvToggle() {
  document.querySelectorAll('input[name="env_type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const type = radio.value;
      $('env-module-group').classList.toggle('hidden', type !== 'module');
      $('env-conda-group').classList.toggle('hidden', type !== 'conda' && type !== 'mamba');
      generateScript();
    });
  });
}

/* ===================================================================
   WORKDIR TOGGLE
=================================================================== */
function initWorkdirToggle() {
  document.querySelectorAll('input[name="workdir_type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      $('custom-workdir-group').classList.toggle('hidden', radio.value !== 'custom');
      generateScript();
    });
  });
}

/* ===================================================================
   MODULE TAGS INPUT
=================================================================== */
function addModuleTag(name) {
  name = name.trim().replace(/,+$/, '').trim();
  if (!name || state.modules.includes(name)) return;
  state.modules.push(name);
  renderModuleTags();
  generateScript();
}

function removeModuleTag(name) {
  state.modules = state.modules.filter(m => m !== name);
  renderModuleTags();
  generateScript();
}

function renderModuleTags() {
  const container = $('module-tags');
  container.innerHTML = '';
  state.modules.forEach(m => {
    const tag = document.createElement('span');
    tag.className = 'env-tag';
    tag.innerHTML = `${m}<button class="env-tag-remove" aria-label="Remove ${m}" type="button">&times;</button>`;
    tag.querySelector('.env-tag-remove').addEventListener('click', () => removeModuleTag(m));
    container.appendChild(tag);
  });
}

function initModuleTags() {
  const input = $('module-input');
  const wrapper = $('module-tags-wrapper');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addModuleTag(input.value);
      input.value = '';
    } else if (e.key === 'Backspace' && input.value === '' && state.modules.length > 0) {
      removeModuleTag(state.modules[state.modules.length - 1]);
    }
  });

  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      addModuleTag(input.value);
      input.value = '';
    }
  });

  // clicking wrapper focuses input
  wrapper.addEventListener('click', () => input.focus());

  // Pre-add snakemake as default
  addModuleTag('snakemake');
}

/* ===================================================================
   SUGGESTION CHIPS
=================================================================== */
function initSuggestions() {
  // Conda suggestions — fill text input
  document.querySelectorAll('#conda-suggestions .env-sugg-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target || 'conda-env-name';
      $(target).value = btn.dataset.val;
      generateScript();
    });
  });
}

/* ===================================================================
   SCRIPT GENERATOR
=================================================================== */
function buildSlurmScript() {
  const jobName    = val('job-name')   || 'myjob';
  const stdout     = val('stdout-file') || 'output.txt';
  const stderr     = val('stderr-file') || 'error.txt';
  const partition  = val('partition')  || 'default';
  const nodes      = val('nodes')      || '1';
  const cpus       = val('cpus')       || '1';
  const memVal     = val('mem-value')  || '2';
  const memUnit    = val('mem-unit')   || 'G';
  const timeLimit  = val('time-limit') || '24:00:00';
  const ntasks     = val('ntasks')     || '1';
  const gpus       = parseInt(val('gpus') || '0', 10);

  const lines = [];
  lines.push('#!/bin/bash');
  lines.push(`#SBATCH --job-name=${jobName}`);
  lines.push(`#SBATCH --output=${stdout}`);
  lines.push(`#SBATCH --error=${stderr}`);
  lines.push(`#SBATCH --partition=${partition}`);
  lines.push(`#SBATCH --nodes=${nodes}`);
  if (parseInt(ntasks) > 1) lines.push(`#SBATCH --ntasks=${ntasks}`);
  lines.push(`#SBATCH --cpus-per-task=${cpus}`);
  lines.push(`#SBATCH --mem=${memVal}${memUnit}`);
  lines.push(`#SBATCH --time=${timeLimit}`);
  if (gpus > 0) lines.push(`#SBATCH --gres=gpu:${gpus}`);
  return lines;
}

function buildPbsScript() {
  const jobName   = val('job-name')   || 'myjob';
  const stdout    = val('stdout-file') || 'output.txt';
  const stderr    = val('stderr-file') || 'error.txt';
  const nodes     = val('nodes')      || '1';
  const ppn       = val('pbs-ppn')    || '4';
  const memVal    = val('mem-value')  || '2';
  const memUnit   = val('mem-unit')   || 'G';
  const timeLimit = val('time-limit') || '24:00:00';
  const queue     = val('pbs-queue')  || 'batch';

  const lines = [];
  lines.push('#!/bin/bash');
  lines.push(`#PBS -N ${jobName}`);
  lines.push(`#PBS -o ${stdout}`);
  lines.push(`#PBS -e ${stderr}`);
  lines.push(`#PBS -q ${queue}`);
  lines.push(`#PBS -l nodes=${nodes}:ppn=${ppn}`);
  lines.push(`#PBS -l mem=${memVal}${memUnit}b`);
  lines.push(`#PBS -l walltime=${timeLimit}`);
  return lines;
}

function buildEnvBlock() {
  const envType = checked('env_type');
  const lines   = [];

  lines.push('');
  lines.push('# Activate environment');

  if (envType === 'module') {
    if (state.modules.length === 0) {
      lines.push('# (no modules specified)');
    } else {
      state.modules.forEach(m => lines.push(`module load ${m}`));
    }
  } else if (envType === 'conda') {
    const envName = val('conda-env-name') || 'base';
    lines.push('source $(conda info --base)/etc/profile.d/conda.sh');
    lines.push(`conda activate ${envName}`);
  } else if (envType === 'mamba') {
    const envName = val('conda-env-name') || 'base';
    lines.push('source $(mamba info --base)/etc/profile.d/mamba.sh');
    lines.push(`mamba activate ${envName}`);
  } else {
    lines.push('# No environment activation configured');
  }
  return lines;
}

function buildWorkdirBlock() {
  const isPbs      = state.scheduler === 'pbs';
  const wdType     = checked('workdir_type');
  const submitVar  = isPbs ? '$PBS_O_WORKDIR' : '$SLURM_SUBMIT_DIR';
  const createTmp  = checked('create_tmp') === 'yes';
  const lines      = [];

  lines.push('');
  lines.push('# Move to working directory');
  if (wdType === 'custom') {
    const customDir = val('custom-workdir') || '/path/to/workdir';
    lines.push(`cd ${customDir}`);
  } else {
    lines.push(`cd ${submitVar}`);
  }

  if (createTmp) {
    const workdirRef = wdType === 'custom'
      ? (val('custom-workdir') || '/path/to/workdir')
      : submitVar;
    lines.push('');
    lines.push('# Create temp dirs for proper execution');
    lines.push(`mkdir -p ${workdirRef}/singularity ${workdirRef}/tmp`);
  }
  return lines;
}

function buildCommandBlock() { return []; }
function buildTimingBlock() { return []; }

function generateScript() {
  const isPbs   = state.scheduler === 'pbs';
  const header  = isPbs ? buildPbsScript() : buildSlurmScript();
  const env     = buildEnvBlock();
  const workdir = buildWorkdirBlock();

  const scriptLines = [
    ...header,
    ...env,
    ...workdir,
    '',
  ];

  const raw = scriptLines.join('\n');
  renderScript(scriptLines);
  updateFooter(raw);

  return raw;
}

/* ===================================================================
   SYNTAX HIGHLIGHTING
=================================================================== */
function highlightScript(lines) {
  return lines.map(line => {
    // Shebang
    if (line.startsWith('#!')) {
      return `<span class="sh-shebang">${esc(line)}</span>`;
    }
    // SBATCH / PBS directives
    if (line.startsWith('#SBATCH') || line.startsWith('#PBS')) {
      const directive = line.startsWith('#SBATCH') ? '#SBATCH' : '#PBS';
      const rest = line.slice(directive.length);
      // split on = if present
      const eqIdx = rest.indexOf('=');
      if (eqIdx !== -1) {
        const flag = rest.slice(0, eqIdx + 1);
        const value = rest.slice(eqIdx + 1);
        return `<span class="sh-directive">${esc(directive)}</span><span class="sh-flag">${esc(flag)}</span><span class="sh-value">${esc(value)}</span>`;
      }
      // PBS -flag value
      const spaceIdx = rest.search(/\s+\S/);
      if (spaceIdx !== -1) {
        const flag  = rest.slice(0, spaceIdx + 1);
        const value = rest.slice(spaceIdx + 1);
        return `<span class="sh-directive">${esc(directive)}</span><span class="sh-flag">${esc(flag)}</span><span class="sh-value">${esc(value)}</span>`;
      }
      return `<span class="sh-directive">${esc(directive)}</span><span class="sh-flag">${esc(rest)}</span>`;
    }
    // Comments
    if (line.trim().startsWith('#')) {
      return `<span class="sh-comment">${esc(line)}</span>`;
    }
    // Empty line
    if (line.trim() === '') return '';

    // Highlight variables $SLURM_ / $PBS_
    let highlighted = esc(line);
    highlighted = highlighted.replace(/(\$(?:SLURM_\w+|PBS_\w+|\w+))/g,
      '<span class="sh-variable">$1</span>');

    // module load
    if (/^\s*module\s+load/.test(line)) {
      return highlighted.replace(/^(\s*)(module)/, '$1<span class="sh-keyword">module</span>');
    }
    // conda / mamba activate
    if (/^\s*(conda|mamba)\s+activate/.test(line)) {
      return highlighted.replace(/^(\s*)(conda|mamba)/, '$1<span class="sh-keyword">$2</span>');
    }
    // source
    if (/^\s*source\s/.test(line)) {
      return highlighted.replace(/^(\s*)(source)/, '$1<span class="sh-keyword">source</span>');
    }
    // cd
    if (/^\s*cd\s/.test(line)) {
      return highlighted.replace(/^(\s*)(cd)/, '$1<span class="sh-keyword">cd</span>');
    }
    // mkdir
    if (/^\s*mkdir\s/.test(line)) {
      return highlighted.replace(/^(\s*)(mkdir)/, '$1<span class="sh-keyword">mkdir</span>');
    }
    // printf
    if (/^\s*printf\s/.test(line)) {
      return highlighted.replace(/^(\s*)(printf)/, '$1<span class="sh-keyword">printf</span>');
    }
    // bash / python / snakemake / nextflow execution
    if (/^\s*(bash|python|snakemake|nextflow|Rscript)\s/.test(line)) {
      return highlighted.replace(/^(\s*)(bash|python|snakemake|nextflow|Rscript)/, '$1<span class="sh-cmd">$2</span>');
    }

    return highlighted;
  });
}

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderScript(lines) {
  const highlighted = highlightScript(lines);
  $('script-pre').innerHTML = highlighted.join('\n');
}

function updateFooter(raw) {
  const lineCount = raw.split('\n').length;
  $('script-line-count').textContent = `${lineCount} lines`;
}

/* ===================================================================
   COPY & DOWNLOAD
=================================================================== */
function showCopyToast() {
  const toast = $('copy-toast');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2000);
}

function copyScript() {
  const raw = generateScriptRaw();
  navigator.clipboard.writeText(raw).then(showCopyToast);
}

function generateScriptRaw() {
  const isPbs   = state.scheduler === 'pbs';
  const header  = isPbs ? buildPbsScript() : buildSlurmScript();
  const env     = buildEnvBlock();
  const workdir = buildWorkdirBlock();

  return [
    ...header,
    ...env,
    ...workdir,
    '',
  ].join('\n');
}

function downloadScript() {
  const raw      = generateScriptRaw();
  const ext      = state.scheduler;
  const filename = `submission.${ext}`;
  const blob     = new Blob([raw], { type: 'text/plain' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================================================================
   RESET
=================================================================== */
function resetForm() {
  // Reset all text inputs to defaults
  $('job-name').value    = 'organpipe';
  $('partition').value   = 'op2_slurm';
  $('stdout-file').value = 'output.txt';
  $('stderr-file').value = 'error.txt';
  $('nodes').value       = '1';
  $('cpus').value        = '4';
  $('mem-value').value   = '2';
  $('mem-unit').value    = 'G';
  $('time-limit').value  = '96:00:00';
  $('ntasks').value      = '1';
  $('gpus').value        = '0';
  $('pbs-queue').value   = 'batch';
  $('pbs-ppn').value     = '4';
  $('conda-env-name').value = '';
  $('custom-workdir').value = '';

  // Reset radios
  $('sched-slurm').checked = true;
  $('env-module').checked  = true;
  $('wd-submit').checked   = true;
  $('tmp-yes').checked     = true;

  // Reset state
  state.scheduler = 'slurm';
  state.modules   = [];

  // Re-add default module
  addModuleTag('snakemake');

  // Reset conditional groups
  $('pbs-extra-resources').classList.add('hidden');
  $('slurm-extra-resources').classList.remove('hidden');
  $('env-module-group').classList.remove('hidden');
  $('env-conda-group').classList.add('hidden');
  $('custom-workdir-group').classList.add('hidden');

  // Reset script filename / btn label
  $('script-filename').textContent  = 'submission.slurm';
  $('btn-download-label').textContent = 'Download .slurm';

  generateScript();
}

/* ===================================================================
   LIVE UPDATE — attach listeners to all form fields
=================================================================== */
function initLiveUpdate() {
  const allInputs = document.querySelectorAll(
    '.form-panel input:not([type="radio"]), .form-panel textarea, .form-panel select'
  );
  allInputs.forEach(el => el.addEventListener('input', generateScript));

  // Radios
  document.querySelectorAll('.form-panel input[type="radio"]').forEach(el => {
    el.addEventListener('change', generateScript);
  });
}

/* ===================================================================
   MODE SWITCHING (Submission ↔ Execution)
=================================================================== */
function initModeSwitching() {
  const subLayout  = $('editor-layout');
  const execLayout = $('exec-layout');
  const btnSub     = $('mode-submission');
  const btnExec    = $('mode-execution');
  const header     = document.querySelector('.op-page-header');

  // Header actions only for submission tab
  const headerActions = document.querySelector('.op-header-actions');

  btnSub.addEventListener('click', () => {
    if (btnSub.classList.contains('active')) return;
    btnSub.classList.add('active');
    btnExec.classList.remove('active');
    subLayout.classList.remove('hidden');
    execLayout.classList.add('hidden');
    if (headerActions) headerActions.style.display = '';
    generateScript();
  });

  btnExec.addEventListener('click', () => {
    if (btnExec.classList.contains('active')) return;
    btnExec.classList.add('active');
    btnSub.classList.remove('active');
    execLayout.classList.remove('hidden');
    subLayout.classList.add('hidden');
    if (headerActions) headerActions.style.display = 'none';
    buildExecCommand();
  });
}

let activeExecPipeline = 'organpipe';

function initPipelineSwitching() {
  const cards = document.querySelectorAll('.exec-pipeline-card:not([disabled])');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const pipeline = card.dataset.pipeline;
      if (activeExecPipeline === pipeline) return;
      
      // Update active class on cards
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      activeExecPipeline = pipeline;
      
      // Toggle entire pipeline view visibility
      const organpipeView = $('exec-organpipe-view');
      const pipeasmView = $('exec-pipeasm-view');
      const procuraView = $('exec-procura-view');
      const pimbaView = $('exec-pimba-view');
      
      if (organpipeView) organpipeView.classList.toggle('hidden', pipeline !== 'organpipe');
      if (pipeasmView) pipeasmView.classList.toggle('hidden', pipeline !== 'pipeasm');
      if (procuraView) procuraView.classList.toggle('hidden', pipeline !== 'procura');
      if (pimbaView) pimbaView.classList.toggle('hidden', pipeline !== 'pimba');
      
      buildExecCommand();
    });
  });
}

/* ===================================================================
   EXECUTION COMMAND — ORGANPIPE BUILDER
=================================================================== */

function execVal(id) {
  const el = $(id);
  return el ? el.value.trim() : '';
}

function execChecked(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function buildOrganPipeCommand() {
  // Working directory
  const wdType  = execChecked('exec-wd-type');
  const workdir = wdType === 'custom'
    ? (execVal('exec-workdir') || '&lt;/path/to/work/dir&gt;')
    : '$SLURM_SUBMIT_DIR';

  const config    = execVal('exec-config')    || '&lt;/path/to/config&gt;';
  const runMode   = execChecked('exec-run-mode');   // 'local' | 'slurm'
  const threads   = execVal('exec-threads') || '4';

  const dryRun    = execChecked('exec-dry-run') === 'yes';
  const batchMode = execChecked('exec-batch')  === 'yes';
  const nbatch    = execVal('exec-nbatch')    || '5';
  const sifdir    = execVal('exec-sifdir');
  const nhmmerDb  = execVal('exec-nhmmer-db');
  const rerun     = execVal('exec-rerun');
  const slurmJobs = execVal('exec-slurm-jobs') || '8';
  const partition = execVal('exec-partition');
  const unlock    = false; // unlock removed from form — users add manually

  // Build flag list (without -np so we can add for dry-run copy)
  const flags = [];
  flags.push(['-d', workdir]);
  if (runMode === 'local') {
    flags.push(['-t', threads]);
  }
  flags.push(['-c', config]);

  if (runMode === 'slurm') {
    flags.push(['-slurm', null]);
    flags.push(['-j', slurmJobs]);
    if (partition) flags.push(['-partition', partition]);
  }

  if (sifdir)    flags.push(['-sifdir', sifdir]);
  if (nhmmerDb)  flags.push(['-nhmmer_db', nhmmerDb]);
  if (batchMode) {
    flags.push(['-batch', null]);
    const nb = parseInt(nbatch);
    if (!isNaN(nb)) flags.push(['-nbatch', nbatch]);
  }
  if (rerun)  flags.push(['-rerun', rerun]);
  if (unlock) flags.push(['-unlock', null]);

  return { flags, dryRun };
}

function buildPipeasmCommand() {
  // Working directory
  const wdType  = execChecked('pipeasm-wd-type');
  const workdir = wdType === 'custom'
    ? (execVal('pipeasm-workdir') || '&lt;/path/to/work/dir&gt;')
    : '$SLURM_SUBMIT_DIR';

  const config    = execVal('pipeasm-config');
  const snakefile = execVal('pipeasm-snakefile');
  const runMode   = execChecked('pipeasm-run-mode');   // 'local' | 'slurm'
  const threads   = execVal('pipeasm-threads') || '4';

  const dryRun    = execChecked('pipeasm-dry-run') === 'yes';
  const step      = execVal('pipeasm-step');
  
  const slurmJobs = execVal('pipeasm-slurm-jobs') || '8';
  const partition = execVal('pipeasm-partition');

  const flags = [];
  flags.push(['-d', workdir]);
  if (config) flags.push(['-c', config]);
  if (snakefile) flags.push(['-s', snakefile]);
  
  if (runMode === 'slurm') {
    flags.push(['-slurm', null]);
    flags.push(['-j', slurmJobs]);
    if (partition) flags.push(['-partition', partition]);
  } else {
    flags.push(['-t', threads]);
  }

  if (step) {
    flags.push([step, null]);
  }

  return { flags, dryRun };
}

function buildProcuraCommand() {
  const wdType = execChecked('procura-wd-type');
  const workdir = wdType === 'custom'
    ? (execVal('procura-workdir') || '&lt;/path/to/work/dir&gt;')
    : '$SLURM_SUBMIT_DIR';

  const mode      = execChecked('procura-mode') || '-hapcuration';
  const config    = execVal('procura-config') || (
    mode === '-hapcuration' ? 'config/config_hapcuration.yaml' :
    mode === '-dualcuration' ? 'config/config_dualcuration.yaml' :
    'config/config_finalgenome.yaml'
  );
  const snakefile = execVal('procura-snakefile');
  const sifdir    = execVal('procura-sifdir');
  const runMode   = execChecked('procura-run-mode');   // 'local' | 'slurm'
  const threads   = execVal('procura-threads') || '32';

  const dryRun    = execChecked('procura-dry-run') === 'yes';
  const slurmJobs = execVal('procura-slurm-jobs') || '8';
  const partition = execVal('procura-partition');

  const flags = [];
  flags.push(['-d', workdir]);
  if (config) flags.push(['-c', config]);
  if (mode) flags.push([mode, null]);

  if (runMode === 'slurm') {
    flags.push(['-slurm', null]);
    flags.push(['-j', slurmJobs]);
    if (partition) flags.push(['-partition', partition]);
  } else {
    flags.push(['-t', threads]);
  }

  if (sifdir) flags.push(['-sifdir', sifdir]);
  if (snakefile) flags.push(['-s', snakefile]);

  return { flags, dryRun };
}

function buildPimbaCommand() {
  const wdType  = execChecked('pimba-wd-type');
  const workdir = wdType === 'custom'
    ? (execVal('pimba-workdir') || '&lt;/path/to/work/dir&gt;')
    : '$SLURM_SUBMIT_DIR';

  const config      = execVal('pimba-config') || 'config/config.yaml';
  const prepareMode = execVal('pimba-prepare-mode') || 'paired_end';
  const runMode     = execVal('pimba-run-mode') || 'COI-BOLD';
  const plotMode    = execChecked('pimba-plot-mode') || 'yes';
  const placeMode   = execChecked('pimba-place-mode') || 'no';
  const threads     = execVal('pimba-threads') || '4';
  const dryRun      = execChecked('pimba-dry-run') === 'yes';
  const unlock      = execChecked('pimba-unlock') === 'yes';
  const customDbPath = execVal('pimba-custom-db-path') || '/path/to/custom_db/';

  const flags = [];
  flags.push(['-p', prepareMode]);
  flags.push(['-r', runMode]);
  if (runMode === 'Custom') flags.push(['-b', customDbPath]);
  flags.push(['-g', plotMode]);
  flags.push(['-l', placeMode]);
  flags.push(['-t', threads]);
  flags.push(['-c', config]);
  flags.push(['-d', workdir]);
  if (unlock) flags.push(['-u', null]);

  return { flags, dryRun };
}
function flagsToLines(flags, scriptName = 'OrganPipe.sh', extraFlags = null) {
  const all = extraFlags ? [...flags, ...extraFlags] : flags;
  const lines = [`bash ${scriptName} \\`];
  all.forEach((f, i) => {
    const [flag, val] = f;
    const isLast = i === all.length - 1;
    const segment = val !== null ? `    ${flag} ${val}` : `    ${flag}`;
    lines.push(isLast ? segment : segment + ' \\');
  });
  return lines;
}

function flagsToSingleLine(flags, scriptName = 'OrganPipe.sh', extraFlags = null) {
  const all = extraFlags ? [...flags, ...extraFlags] : flags;
  const parts = [`bash ${scriptName}`];
  all.forEach(([flag, val]) => {
    parts.push(val !== null ? `${flag} ${val}` : flag);
  });
  return parts.join(' ');
}

/* ===================================================================
   EXEC SYNTAX HIGHLIGHTING
=================================================================== */
function highlightExecCommand(lines) {
  return lines.map(line => {
    if (line.startsWith('#')) {
      return `<span class="sh-comment">${escExec(line)}</span>`;
    }
    if (line.trim() === '') return '';
    if (line.startsWith('bash ')) {
      // bash keyword + script name
      return line.replace(/^(bash)(\s+)(\S+)(.*)/, (_, cmd, sp, script, rest) =>
        `<span class="sh-cmd">${escExec(cmd)}</span>${sp}<span class="sh-section">${escExec(script)}</span>${highlightFlags(rest)}`
      );
    }
    // continuation lines with flags
    return highlightFlags(escExec(line));
  });
}

function highlightFlags(str) {
  // Highlight -flagname value pairs
  return str.replace(/(-[\w_]+)(\s+)([^\s\\-][^\s\\]*)?/g, (match, flag, sp, val) => {
    const flagHtml = `<span class="sh-flag">${flag}</span>`;
    if (val === undefined || val === '') return flagHtml + sp;
    // Placeholders like <...>
    const valClass = val.startsWith('&lt;') ? 'sh-comment' : 'sh-value';
    return `${flagHtml}${sp}<span class="${valClass}">${val}</span>`;
  });
}

function escExec(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ===================================================================
   RENDER EXEC COMMAND
=================================================================== */
function buildExecCommand() {
  if (activeExecPipeline === 'pipeasm') buildPipeasmPreview();
  else if (activeExecPipeline === 'procura') buildProcuraPreview();
  else if (activeExecPipeline === 'pimba') buildPimbaPreview();
  else buildOrganPipePreview();
}

function buildOrganPipePreview() {
  const { flags, dryRun } = buildOrganPipeCommand();
  const pre = $('exec-cmd-pre');
  if (!pre) return;

  const wrapped = $('exec-wrap-toggle') && $('exec-wrap-toggle').checked;
  let allLines = [];

  if (dryRun) {
    // ── Step 1: Dry run ──
    allLines.push('# ── Step 1: Dry Run (recommended) ──────────────────────────');
    allLines.push('# Validates all paths and shows planned jobs without executing.');
    allLines.push('# Also builds Singularity images on first run.');
    allLines.push('');
    allLines.push(...flagsToLines(flags, 'OrganPipe.sh', [['-np', null]]));
    allLines.push('');
    allLines.push('');
    // ── Step 2: Actual run ──
    allLines.push('# ── Step 2: Actual Run ─────────────────────────────────────');
    allLines.push('# Only run after the dry run completes without errors.');
    allLines.push('');
    allLines.push(...flagsToLines(flags, 'OrganPipe.sh'));
  } else {
    allLines.push(...flagsToLines(flags, 'OrganPipe.sh'));
  }

  const highlighted = highlightExecCommand(allLines);
  pre.innerHTML = highlighted.join('\n');

  if (wrapped) pre.classList.add('cmd-wrapped');
  else pre.classList.remove('cmd-wrapped');
}

function buildPipeasmPreview() {
  const { flags, dryRun } = buildPipeasmCommand();
  const pre = $('pipeasm-cmd-pre');
  if (!pre) return;

  const wrapped = $('pipeasm-wrap-toggle') && $('pipeasm-wrap-toggle').checked;
  let allLines = [];

  if (dryRun) {
    // ── Step 1: Dry run ──
    allLines.push('# ── Step 1: Dry Run (recommended) ──────────────────────────');
    allLines.push('# Validates all paths and shows planned jobs without executing.');
    allLines.push('');
    allLines.push(...flagsToLines(flags, 'Pipeasm.sh', [['-np', null]]));
    allLines.push('');
    allLines.push('');
    // ── Step 2: Actual run ──
    allLines.push('# ── Step 2: Actual Run ─────────────────────────────────────');
    allLines.push('# Only run after the dry run completes without errors.');
    allLines.push('');
    allLines.push(...flagsToLines(flags, 'Pipeasm.sh'));
  } else {
    allLines.push(...flagsToLines(flags, 'Pipeasm.sh'));
  }

  const highlighted = highlightExecCommand(allLines);
  pre.innerHTML = highlighted.join('\n');

  if (wrapped) pre.classList.add('cmd-wrapped');
  else pre.classList.remove('cmd-wrapped');
}

function buildProcuraPreview() {
  const { flags, dryRun } = buildProcuraCommand();
  const pre = $('procura-cmd-pre');
  if (!pre) return;

  const wrapped = $('procura-wrap-toggle') && $('procura-wrap-toggle').checked;
  let allLines = [];

  if (dryRun) {
    // ── Step 1: Dry run ──
    allLines.push('# ── Step 1: Dry Run (recommended) ──────────────────────────');
    allLines.push('# Validates all paths and shows planned jobs without executing.');
    allLines.push('');
    allLines.push(...flagsToLines(flags, 'ProCura.sh', [['-np', null]]));
    allLines.push('');
    allLines.push('');
    // ── Step 2: Actual run ──
    allLines.push('# ── Step 2: Actual Run ─────────────────────────────────────');
    allLines.push('# Only run after the dry run completes without errors.');
    allLines.push('');
    allLines.push(...flagsToLines(flags, 'ProCura.sh'));
  } else {
    allLines.push(...flagsToLines(flags, 'ProCura.sh'));
  }

  const highlighted = highlightExecCommand(allLines);
  pre.innerHTML = highlighted.join('\n');

  if (wrapped) pre.classList.add('cmd-wrapped');
  else pre.classList.remove('cmd-wrapped');
}

function buildPimbaPreview() {
  const { flags, dryRun } = buildPimbaCommand();
  const pre = $('pimba-cmd-pre');
  if (!pre) return;

  const wrapped = $('pimba-wrap-toggle') && $('pimba-wrap-toggle').checked;
  let allLines = [];

  if (dryRun) {
    allLines.push('# ── Step 1: Dry Run (recommended) ──────────────────────────');
    allLines.push('# Validates all paths and shows planned Snakemake jobs without executing.');
    allLines.push('');
    allLines.push(...flagsToLines(flags, 'pimba_smk_main.sh'));
    allLines.push('');
    allLines.push('# Note: Add --dry-run inside pimba_smk_main.sh or run Snakemake manually with --dry-run');
    allLines.push('');
    allLines.push('');
    allLines.push('# ── Step 2: Actual Run ─────────────────────────────────────');
    allLines.push('# Only run after the dry run completes without errors.');
    allLines.push('');
    allLines.push(...flagsToLines(flags, 'pimba_smk_main.sh'));
  } else {
    allLines.push(...flagsToLines(flags, 'pimba_smk_main.sh'));
  }

  const highlighted = highlightExecCommand(allLines);
  pre.innerHTML = highlighted.join('\n');

  if (wrapped) pre.classList.add('cmd-wrapped');
  else pre.classList.remove('cmd-wrapped');
}
function getRawExecCommand(pipeline = activeExecPipeline) {
  const isPipeasm = pipeline === 'pipeasm';
  const isProcura = pipeline === 'procura';
  const isPimba   = pipeline === 'pimba';
  let buildFn, scriptName;
  if (isPimba)        { buildFn = buildPimbaCommand;    scriptName = 'pimba_smk_main.sh'; }
  else if (isProcura) { buildFn = buildProcuraCommand;  scriptName = 'ProCura.sh'; }
  else if (isPipeasm) { buildFn = buildPipeasmCommand;  scriptName = 'Pipeasm.sh'; }
  else                { buildFn = buildOrganPipeCommand; scriptName = 'OrganPipe.sh'; }
  const { flags, dryRun } = buildFn();

  // Strip HTML entities for raw export
  const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  let lines = [];
  if (dryRun && !isPimba) {
    lines.push('# ── Step 1: Dry Run ───────────────────────────────────────────');
    lines.push('# Validates paths and shows planned jobs without executing.');
    lines.push('');
    flagsToLines(flags, scriptName, [['-np', null]]).forEach(l => lines.push(decode(l)));
    lines.push('');
    lines.push('');
    lines.push('# ── Step 2: Actual Run ────────────────────────────────────────');
    lines.push('# Run after dry run completes without errors.');
    lines.push('');
    flagsToLines(flags, scriptName).forEach(l => lines.push(decode(l)));
  } else if (dryRun && isPimba) {
    lines.push('# ── Step 1: Dry Run ───────────────────────────────────────────');
    lines.push('# Shows planned Snakemake jobs without executing.');
    lines.push('');
    flagsToLines(flags, scriptName).forEach(l => lines.push(decode(l)));
    lines.push('');
    lines.push('# Note: PIMBA dry-run can be done by running Snakemake manually with --dry-run');
    lines.push('');
    lines.push('');
    lines.push('# ── Step 2: Actual Run ────────────────────────────────────────');
    lines.push('# Run after validation completes without errors.');
    lines.push('');
    flagsToLines(flags, scriptName).forEach(l => lines.push(decode(l)));
  } else {
    flagsToLines(flags, scriptName).forEach(l => lines.push(decode(l)));
  }
  return lines.join('\n');
}

/* ===================================================================
   SMART BATCH HINT — removed sample count, no-op stub kept
=================================================================== */
function initSmartHints() {
  // Sample count input removed — no smart hints needed
}

/* ===================================================================
   EXEC FORM LIVE UPDATE
=================================================================== */
function initExecLiveUpdate() {
  const forms = [$('exec-organpipe-form'), $('exec-pipeasm-form'), $('exec-procura-form'), $('exec-pimba-form')];
  
  forms.forEach(form => {
    if (!form) return;
    form.querySelectorAll('input:not([type="radio"]), textarea, select').forEach(el => {
      el.addEventListener('input', () => {
        // Toggle custom DB path group when PIMBA run mode changes
        if (el.id === 'pimba-run-mode') {
          $('pimba-custom-db-group').classList.toggle('hidden', el.value !== 'Custom');
        }
        buildExecCommand();
      });
    });
    form.querySelectorAll('input[type="radio"]').forEach(el => {
      el.addEventListener('change', () => {
        // OrganPipe toggles
        if (el.name === 'exec-run-mode') {
          const isSlurm = el.value === 'slurm';
          $('exec-slurm-fields').classList.toggle('hidden', !isSlurm);
          $('exec-local-fields').classList.toggle('hidden', isSlurm);
        }
        if (el.name === 'exec-wd-type') {
          $('exec-workdir-group').classList.toggle('hidden', el.value !== 'custom');
          const lbl = $('exec-wd-submit-label');
          if (lbl && el.value === 'submitdir') lbl.textContent = '$SLURM_SUBMIT_DIR';
        }
        if (el.name === 'exec-batch') {
          $('exec-nbatch-group').classList.toggle('hidden', el.value !== 'yes');
        }

        // Pipeasm toggles
        if (el.name === 'pipeasm-run-mode') {
          const isSlurm = el.value === 'slurm';
          $('pipeasm-slurm-fields').classList.toggle('hidden', !isSlurm);
          $('pipeasm-local-fields').classList.toggle('hidden', isSlurm);
        }
        if (el.name === 'pipeasm-wd-type') {
          $('pipeasm-workdir-group').classList.toggle('hidden', el.value !== 'custom');
          const lbl = $('pipeasm-wd-submit-label');
          if (lbl && el.value === 'submitdir') lbl.textContent = '$SLURM_SUBMIT_DIR';
        }

        // ProCura toggles
        if (el.name === 'procura-run-mode') {
          const isSlurm = el.value === 'slurm';
          $('procura-slurm-fields').classList.toggle('hidden', !isSlurm);
          $('procura-local-fields').classList.toggle('hidden', isSlurm);
        }
        if (el.name === 'procura-wd-type') {
          $('procura-workdir-group').classList.toggle('hidden', el.value !== 'custom');
          const lbl = $('procura-wd-submit-label');
          if (lbl && el.value === 'submitdir') lbl.textContent = '$SLURM_SUBMIT_DIR';
        }
        if (el.name === 'procura-mode') {
          const modeHints = {
            '-hapcuration': 'Adds annotation tracks and prepares pretext/ortholog/synteny data for haplotype curation.',
            '-dualcuration': 'Prepares inputs, AGP mappings, and Hi-C maps for dual diploid curation.',
            '-finalgenome': 'Generates final curated hap1/hap2 FASTA assemblies and runs quality assessment reports (GFAstats, etc.).'
          };
          const hintEl = $('procura-mode-hint');
          if (hintEl && modeHints[el.value]) hintEl.textContent = modeHints[el.value];

          // Auto-suggest config filename if default pattern is present
          const cfgInput = $('procura-config');
          if (cfgInput) {
            const current = cfgInput.value.trim();
            if (!current || current.startsWith('config/config_')) {
              const map = {
                '-hapcuration': 'config/config_hapcuration.yaml',
                '-dualcuration': 'config/config_dualcuration.yaml',
                '-finalgenome': 'config/config_finalgenome.yaml'
              };
              if (map[el.value]) {
                cfgInput.value = map[el.value];
                cfgInput.placeholder = map[el.value];
              }
            }
          }
        }

        // PIMBA toggles
        if (el.name === 'pimba-wd-type') {
          $('pimba-workdir-group').classList.toggle('hidden', el.value !== 'custom');
          const lbl = $('pimba-wd-submit-label');
          if (lbl && el.value === 'submitdir') lbl.textContent = '$SLURM_SUBMIT_DIR';
        }

        buildExecCommand();
      });
    });
  });

  // Wrap toggles
  const wrapToggleOP = $('exec-wrap-toggle');
  if (wrapToggleOP) wrapToggleOP.addEventListener('change', buildExecCommand);
  
  const wrapTogglePA = $('pipeasm-wrap-toggle');
  if (wrapTogglePA) wrapTogglePA.addEventListener('change', buildExecCommand);

  const wrapTogglePC = $('procura-wrap-toggle');
  if (wrapTogglePC) wrapTogglePC.addEventListener('change', buildExecCommand);

  const wrapTogglePB = $('pimba-wrap-toggle');
  if (wrapTogglePB) wrapTogglePB.addEventListener('change', buildExecCommand);
}

/* ===================================================================
   EXEC COPY & DOWNLOAD
=================================================================== */
function copyExecCommand(pipeline = activeExecPipeline) {
  const raw = getRawExecCommand(pipeline);
  navigator.clipboard.writeText(raw).then(() => {
    const toastId = pipeline === 'pipeasm' ? 'pipeasm-copy-toast'
      : pipeline === 'procura' ? 'procura-copy-toast'
      : pipeline === 'pimba'   ? 'pimba-copy-toast'
      : 'exec-copy-toast';
    const toast = $(toastId);
    if (!toast) return;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
  });
}

function downloadExecScript(pipeline = activeExecPipeline) {
  const raw  = getRawExecCommand(pipeline);
  const scriptName = pipeline === 'pipeasm' ? 'run_pipeasm.sh'
    : pipeline === 'procura' ? 'run_procura.sh'
    : pipeline === 'pimba'   ? 'run_pimba.sh'
    : 'run_organpipe.sh';
  const blob = new Blob([`#!/bin/bash\n\n${raw}\n`], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = scriptName;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================================================================
   BOOTSTRAP
=================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Submission tab
  initSchedulerToggle();
  initEnvToggle();
  initWorkdirToggle();
  initModuleTags();
  initSuggestions();
  initLiveUpdate();

  // Submission buttons
  $('btn-copy').addEventListener('click', copyScript);
  $('btn-download').addEventListener('click', downloadScript);
  $('btn-reset').addEventListener('click', resetForm);
  $('panel-copy-btn').addEventListener('click', copyScript);

  // Mode switching
  initModeSwitching();
  initPipelineSwitching();

  // Execution tab
  initExecLiveUpdate();
  initSmartHints();

  $('exec-copy-btn')?.addEventListener('click', () => copyExecCommand('organpipe'));
  $('exec-dl-btn')?.addEventListener('click', () => downloadExecScript('organpipe'));
  $('pipeasm-copy-btn')?.addEventListener('click', () => copyExecCommand('pipeasm'));
  $('pipeasm-dl-btn')?.addEventListener('click', () => downloadExecScript('pipeasm'));
  $('procura-copy-btn')?.addEventListener('click', () => copyExecCommand('procura'));
  $('procura-dl-btn')?.addEventListener('click', () => downloadExecScript('procura'));
  $('pimba-copy-btn')?.addEventListener('click', () => copyExecCommand('pimba'));
  $('pimba-dl-btn')?.addEventListener('click', () => downloadExecScript('pimba'));

  // Initial renders
  generateScript();
  buildExecCommand();
});
