// Preflight for `npm run publish`. Checks everything the Marketplace cares
// about before you spend a token on a failed upload.
//
//   npm run check

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

let failed = 0;
let warned = 0;

const ok = (m) => console.log(`  ok    ${m}`);
const warn = (m) => {
  console.log(`  warn  ${m}`);
  warned++;
};
const bad = (m) => {
  console.log(`  FAIL  ${m}`);
  failed++;
};

console.log(`\nPreflight for ${pkg.publisher}.${pkg.name}@${pkg.version}\n`);

console.log('Manifest');
for (const field of [
  'name', 'displayName', 'description', 'version',
  'publisher', 'license', 'icon', 'repository', 'engines', 'categories'
]) {
  if (pkg[field]) ok(field);
  else bad(`${field} is missing, the Marketplace requires it`);
}

// The Marketplace silently truncates past five.
const kw = pkg.keywords || [];
if (kw.length > 5) bad(`${kw.length} keywords, the cap is 5`);
else ok(`${kw.length}/5 keywords`);

if (/^0\./.test(pkg.version)) {
  warn(`version ${pkg.version} is pre-1.0, which is fine but permanent once published`);
}

console.log('\nFiles');
for (const f of ['README.md', 'CHANGELOG.md', 'LICENSE', pkg.icon]) {
  if (fs.existsSync(path.join(ROOT, f))) ok(f);
  else bad(`${f} is missing`);
}

// Icon must be a 128x128 PNG. Read the IHDR directly rather than trusting
// the extension.
try {
  const buf = fs.readFileSync(path.join(ROOT, pkg.icon));
  const isPng = buf.slice(1, 4).toString('ascii') === 'PNG';
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (!isPng) bad(`${pkg.icon} is not a PNG`);
  else if (w < 128 || h < 128) bad(`${pkg.icon} is ${w}x${h}, needs to be at least 128x128`);
  else ok(`${pkg.icon} is ${w}x${h} PNG`);
} catch (err) {
  bad(`could not read ${pkg.icon}: ${err.message}`);
}

// Relative image paths break on the Marketplace listing, which renders the
// README off-site. vsce rewrites them when `repository` is set, but only for
// paths it can resolve.
console.log('\nREADME');
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const relImages = [...readme.matchAll(/!\[[^\]]*\]\((?!https?:)([^)]+)\)/g)].map((m) => m[1]);
if (relImages.length === 0) ok('no relative image links');
else warn(`${relImages.length} relative image link(s), will be rewritten against the repo: ${relImages.join(', ')}`);

console.log('\nPackaging');
try {
  execFileSync('npx', ['--yes', '@vscode/vsce', 'package', '--out', '/tmp/preflight.vsix'], {
    cwd: ROOT,
    stdio: 'pipe'
  });
  const size = fs.statSync('/tmp/preflight.vsix').size;
  ok(`packages cleanly (${(size / 1024 / 1024).toFixed(2)} MB)`);
  if (size > 50 * 1024 * 1024) bad('over the 50 MB Marketplace limit');
  fs.unlinkSync('/tmp/preflight.vsix');
} catch (err) {
  bad(`vsce package failed: ${String(err.stderr || err.message).trim().split('\n').pop()}`);
}

function head(url) {
  return new Promise((resolve) => {
    https
      .get(url, { timeout: 15000 }, (res) => {
        res.resume();
        resolve(res.statusCode);
      })
      .on('error', () => resolve(0))
      .on('timeout', function () {
        this.destroy();
        resolve(0);
      });
  });
}

(async () => {
  console.log('\nMarketplace');
  const code = await head(`https://marketplace.visualstudio.com/publishers/${pkg.publisher}`);
  const registered = code === 200;
  if (registered) ok(`publisher "${pkg.publisher}" exists`);
  else if (code === 404) bad(`publisher "${pkg.publisher}" is not registered yet`);
  else warn(`could not reach the Marketplace (HTTP ${code || 'no response'})`);

  let authed = false;
  try {
    execFileSync('npx', ['--yes', '@vscode/vsce', 'verify-pat', pkg.publisher], { stdio: 'pipe' });
    authed = true;
    ok('a valid PAT is stored');
  } catch {
    bad('no valid PAT stored');
  }

  console.log(`\n${failed} failing, ${warned} warning${warned === 1 ? '' : 's'}\n`);

  if (failed === 0) {
    console.log('Ready. Run: npm run publish\n');
    return;
  }

  console.log('To finish, in a browser:\n');
  if (!registered) {
    console.log(`  1. Create the publisher "${pkg.publisher}"`);
    console.log('     https://marketplace.visualstudio.com/manage');
    console.log('     The id must match the "publisher" field in package.json.\n');
  }
  if (!authed) {
    console.log('  2. Create an Azure DevOps Personal Access Token');
    console.log('     https://dev.azure.com  ->  User settings  ->  Personal access tokens');
    console.log('     Organization: All accessible organizations   <- easy to get wrong');
    console.log('     Scopes: Custom defined  ->  Marketplace  ->  Manage\n');
    console.log(`  3. In your terminal:  npx @vscode/vsce login ${pkg.publisher}`);
    console.log('     Paste the token there. Do not paste it into a chat.\n');
  }
  console.log('Then rerun: npm run check\n');
  process.exitCode = 1;
})();
