#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const https = require('node:https');

const apply = process.argv.includes('--apply');
const branch = getArgValue('--branch') || 'master';
const requiredChecks = getArgValues('--check');
const checks = requiredChecks.length > 0 ? requiredChecks : ['Build and unit tests'];
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const repo = getRepository();

const operations = [
  {
    method: 'PATCH',
    path: `/repos/${repo.owner}/${repo.name}`,
    body: {
      delete_branch_on_merge: true,
      allow_auto_merge: true
    },
    summary: 'Enable automatic deletion of merged branches and auto-merge support.'
  },
  {
    method: 'PUT',
    path: `/repos/${repo.owner}/${repo.name}/branches/${branch}/protection`,
    body: {
      required_status_checks: {
        strict: true,
        contexts: checks
      },
      enforce_admins: true,
      required_pull_request_reviews: {
        required_approving_review_count: 0,
        dismiss_stale_reviews: false,
        require_code_owner_reviews: false,
        require_last_push_approval: false
      },
      restrictions: null,
      required_conversation_resolution: true,
      allow_force_pushes: false,
      allow_deletions: false
    },
    summary: `Protect ${branch}: require PRs, fresh status checks, no required approvals, resolved conversations, and no force pushes/deletions.`
  }
];

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  printPlan();

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply and GITHUB_TOKEN or GH_TOKEN to update GitHub.');
    return;
  }

  if (!token) {
    throw new Error('Missing GITHUB_TOKEN or GH_TOKEN. The token needs repository administration permission.');
  }

  for (const operation of operations) {
    await request(operation);
    console.log(`Applied: ${operation.summary}`);
  }
}

function printPlan() {
  console.log(`Repository: ${repo.owner}/${repo.name}`);
  console.log(`Target branch: ${branch}`);
  console.log(`Required checks: ${checks.join(', ')}`);
  console.log('');

  for (const operation of operations) {
    console.log(`- ${operation.summary}`);
  }
}

function getRepository() {
  const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);

  if (!match) {
    throw new Error(`Cannot parse GitHub owner/repo from origin remote: ${remoteUrl}`);
  }

  return { owner: match[1], name: match[2] };
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function getArgValues(name) {
  const values = [];

  for (let index = 0; index < process.argv.length; index++) {
    if (process.argv[index] === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
    }
  }

  return values;
}

function request(operation) {
  const payload = JSON.stringify(operation.body);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: operation.path,
      method: operation.method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'qrcodegenerator-repo-config',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
          return;
        }

        reject(new Error(`${operation.method} ${operation.path} failed with ${res.statusCode}: ${data}`));
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
