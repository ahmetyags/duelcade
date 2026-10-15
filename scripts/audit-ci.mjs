import { spawnSync } from 'node:child_process';

// These advisories have no compatible upstream fix and are limited to Expo's
// build tooling (Metro glob parsing and signing certificate helpers). Keep
// their exact IDs visible here so new or runtime advisories still fail CI.
const allowedAdvisories = new Set([
  'GHSA-vfj7-8cjw-p6xm',
  'GHSA-86w9-cpqp-85rv',
]);

const audit = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

if (!audit.stdout) {
  process.stderr.write(audit.stderr || 'npm audit did not return a report.\n');
  process.exit(1);
}

const report = JSON.parse(audit.stdout);
const blocking = [];
const allowed = [];

for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const advisory of vulnerability.via ?? []) {
    if (typeof advisory === 'string') continue;
    if (advisory.severity !== 'high' && advisory.severity !== 'critical') continue;
    const id = new URL(advisory.url).pathname.split('/').filter(Boolean).at(-1);
    if (id && allowedAdvisories.has(id)) allowed.push(id);
    else blocking.push(`${advisory.name}: ${advisory.title} (${advisory.url})`);
  }
}

if (blocking.length > 0) {
  process.stderr.write(`Blocking audit findings:\n${blocking.map((item) => `- ${item}`).join('\n')}\n`);
  process.exit(1);
}

console.log(`Audit passed; ${new Set(allowed).size} documented build-time advisories remain allowlisted.`);
