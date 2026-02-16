#!/usr/bin/env node
/**
 * OpenClaw Wizard — Development Launcher
 *
 * Starts the Vite dev server + backend (if Rust available).
 * No Rust? Frontend still works with hot-reload, API calls will fail gracefully.
 *
 * Usage:  node dev.mjs          # starts on port 5173
 *         node dev.mjs --open   # also opens browser
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { exec, spawn, execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(__dirname, 'frontend');
const backendDir = resolve(__dirname, 'backend');
const BACKEND_PORT = 3030;
const shouldOpen = process.argv.includes('--open');

// Resolve vite from frontend/node_modules
const require = createRequire(resolve(frontendDir, 'package.json'));
const { createServer } = require('vite');

function hasCargo() {
  try {
    execSync('cargo --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function startBackend() {
  console.log('  → Starting backend (cargo run)...');
  const backend = spawn('cargo', ['run'], {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backend.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (line) console.log(`  [backend] ${line}`);
  });

  backend.stderr.on('data', (data) => {
    const line = data.toString().trim();
    // Filter out cargo compile noise, show important stuff
    if (line.includes('Compiling')) {
      process.stdout.write(`\r  [backend] Compiling...`);
    } else if (line.includes('Finished') || line.includes('Running') || line.includes('ERROR') || line.includes('WARN')) {
      console.log(`\n  [backend] ${line}`);
    }
  });

  backend.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n  [backend] Exited with code ${code}`);
    }
  });

  // Clean up on exit
  process.on('exit', () => backend.kill());
  process.on('SIGINT', () => { backend.kill(); process.exit(); });
  process.on('SIGTERM', () => { backend.kill(); process.exit(); });

  return backend;
}

async function main() {
  console.log('');
  console.log('  🐾  OpenClaw Wizard (dev mode)');
  console.log('  ──────────────────────────────');

  // Try to start backend
  const rustAvailable = hasCargo();
  if (rustAvailable) {
    startBackend();
  } else {
    console.log('');
    console.log('  ⚠  Rust not found — running frontend only.');
    console.log('     API calls will fail. Install Rust from https://rustup.rs');
    console.log('     or start the backend separately.');
  }

  const server = await createServer({
    root: frontendDir,
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${BACKEND_PORT}`,
          changeOrigin: true,
        },
        '/ws': {
          target: `ws://127.0.0.1:${BACKEND_PORT}`,
          ws: true,
        },
      },
    },
  });

  await server.listen();
  const port = server.httpServer?.address()?.port || 5173;
  const url = `http://localhost:${port}`;

  console.log('');
  console.log(`  ➜  UI:      ${url}`);
  if (rustAvailable) {
    console.log(`  ➜  Backend: http://127.0.0.1:${BACKEND_PORT} (starting...)`);
  }
  console.log('  ➜  Press Ctrl+C to stop');
  console.log('');

  if (shouldOpen) {
    const cmd = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} ${url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
