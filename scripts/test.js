const { spawn } = require('node:child_process');
const puppeteer = require('puppeteer');

async function main() {
  process.env.CHROME_BIN = process.env.CHROME_BIN || await puppeteer.executablePath();

  const child = spawn('npx', ['ng', 'test', '--watch=false', '--browsers=ChromeHeadlessCI'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
