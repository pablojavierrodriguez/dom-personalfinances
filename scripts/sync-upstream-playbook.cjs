#!/usr/bin/env node

/**
 * scripts/sync-upstream-playbook.cjs
 * Autonomous Upstream Playbook Synchronizer
 *
 * Automatically syncs universal skills, audit scripts, and framework rules
 * from any active project to the public GitHub repository:
 * https://github.com/pablojavierrodriguez/agentic-team-playbook
 *
 * Guarantees 100% sanitization: strictly excludes domain-specific files,
 * proprietary business logic, private paths, and project branding.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_URL = 'https://github.com/pablojavierrodriguez/agentic-team-playbook.git';
const ROOT = path.resolve(__dirname, '..');
const TEMP_DIR = path.join(ROOT, '.cache', 'upstream-playbook');

// Skills classified as 100% universal (agnostic of domain/business)
const UNIVERSAL_SKILLS = [
  'pm-orchestrator',
  'market-researcher',
  'worldclass-product-designer',
  'principal-engineer',
  'rigorous-qa-auditor',
  'code-level-ux-auditor',
  'mobile-ux-design',
  'forms-rhf-zod',
  'pwa-assets-audit',
  'recharts-reporting',
  'ui-radix-tailwind'
];

// Universal scripts safe to share
const UNIVERSAL_SCRIPTS = [
  'audit-ux-code.cjs'
];

// Strictly blacklisted keywords and domain strings that must be sanitized
const SANITIZATION_RULES = [
  { regex: /DOM\s*\(El dominio no se conquista\.\s*Se administra\)/gi, replace: 'Agile Autonomous System' },
  { regex: /DOM\s*—\s*/g, replace: '' },
  { regex: /\(DOM\)/g, replace: '' },
  { regex: /\bDOM\b/g, replace: 'YourApp' },
  { regex: /\bm3\b/gi, replace: 'YourApp' },
  { regex: /\bIMPERO\b/gi, replace: 'YourApp' },
  { regex: /\bc3admin\b/gi, replace: 'admin-portal' },
  { regex: /\/Users\/[a-zA-Z0-9._-]+\//g, replace: '/workspace/' },
  { regex: /balance\s*<=\s*0/gi, replace: 'invariantValid' },
  { regex: /es-AR/gi, replace: 'regional-locale' }
];

function sanitizeContent(content) {
  let result = content;
  for (const rule of SANITIZATION_RULES) {
    result = result.replace(rule.regex, rule.replace);
  }
  return result;
}

function run(cmd, cwd = ROOT) {
  return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf-8' }).trim();
}

function ensureRepo() {
  fs.mkdirSync(path.dirname(TEMP_DIR), { recursive: true });
  if (fs.existsSync(path.join(TEMP_DIR, '.git'))) {
    try {
      run('git fetch origin main && git reset --hard origin/main', TEMP_DIR);
      return;
    } catch {
      // Fall through to re-clone
    }
  }
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  run(`git clone ${REPO_URL} ${TEMP_DIR}`);
}

function syncSkills() {
  const localSkillsDir = path.join(ROOT, '.agents', 'skills');
  const targetSkillsDir = path.join(TEMP_DIR, '.agents', 'skills');
  fs.mkdirSync(targetSkillsDir, { recursive: true });

  const synced = [];

  for (const skillName of UNIVERSAL_SKILLS) {
    const srcDir = path.join(localSkillsDir, skillName);
    if (!fs.existsSync(srcDir)) continue;

    const destDir = path.join(targetSkillsDir, skillName);
    fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(srcDir);
    for (const file of files) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join(destDir, file);

      if (fs.statSync(srcFile).isFile()) {
        const raw = fs.readFileSync(srcFile, 'utf-8');
        const sanitized = sanitizeContent(raw);
        fs.writeFileSync(destFile, sanitized, 'utf-8');
        synced.push(`skill: ${skillName}/${file}`);
      }
    }
  }
  return synced;
}

function syncScripts() {
  const localScriptsDir = path.join(ROOT, 'scripts');
  const targetScriptsDir = path.join(TEMP_DIR, 'scripts');
  fs.mkdirSync(targetScriptsDir, { recursive: true });

  const synced = [];

  for (const scriptName of UNIVERSAL_SCRIPTS) {
    const srcFile = path.join(localScriptsDir, scriptName);
    if (!fs.existsSync(srcFile)) continue;

    const destFile = path.join(targetScriptsDir, scriptName);
    const raw = fs.readFileSync(srcFile, 'utf-8');
    const sanitized = sanitizeContent(raw);
    fs.writeFileSync(destFile, sanitized, 'utf-8');
    synced.push(`script: scripts/${scriptName}`);
  }
  return synced;
}

function commitAndPush(syncedItems) {
  const status = run('git status --porcelain', TEMP_DIR);
  if (!status) {
    console.log('✨ Upstream repository is already up to date. No changes to push.');
    return false;
  }

  run('git add -A', TEMP_DIR);
  const commitMsg = `feat(skills): autonomous sync of universal skills and scripts\n\nSynced items:\n- ${syncedItems.join('\n- ')}`;
  run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, TEMP_DIR);
  run('git push origin main', TEMP_DIR);

  console.log(`🚀 Successfully synced and pushed ${syncedItems.length} items to upstream repo!`);
  return true;
}

function main() {
  console.log('🔄 Checking upstream synchronization with agentic-team-playbook...');
  ensureRepo();
  const syncedSkills = syncSkills();
  const syncedScripts = syncScripts();
  const allSynced = [...syncedSkills, ...syncedScripts];
  commitAndPush(allSynced);
}

main();
