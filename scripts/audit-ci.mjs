import { spawnSync } from 'node:child_process';

// These image-size advisories currently affect every published version. Metro
// only processes repository-owned assets during builds, so keep them visible
// while allowing CI to reject every other high or critical advisory.
const allowedAdvisories = new Set([
  'GHSA-w3rx-r6r6-pgpr',
  'GHSA-5p2g-fcmc-qvqq',
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
