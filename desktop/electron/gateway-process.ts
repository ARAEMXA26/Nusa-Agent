import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { app } from 'electron';

let gatewayProcess: ChildProcess | null = null;
const GATEWAY_PORT = 4141;
const HEALTH_URL = `http://127.0.0.1:${GATEWAY_PORT}/health`;

export function fixSystemPath(): void {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (process.platform === 'darwin') {
    const extraPaths = [
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      '/usr/local/sbin',
      path.join(home, '.hermes', 'bin'),
      path.join(home, '.local', 'bin'),
      path.join(home, '.cargo', 'bin'),
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
    ];
    const current = (process.env.PATH || '').split(path.delimiter);
    const combined = Array.from(new Set([...extraPaths, ...current])).filter(Boolean);
    process.env.PATH = combined.join(path.delimiter);
  } else if (process.platform === 'linux') {
    const extraPaths = [
      '/usr/local/bin',
      '/usr/bin',
      path.join(home, '.local', 'bin'),
      path.join(home, '.cargo', 'bin'),
    ];
    const current = (process.env.PATH || '').split(path.delimiter);
    const combined = Array.from(new Set([...extraPaths, ...current])).filter(Boolean);
    process.env.PATH = combined.join(path.delimiter);
  }
}

export function isGatewayRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function findGatewayWorkingDir(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'gateway'),
    path.join(__dirname, '../../gateway'),
    path.join(process.cwd(), 'gateway'),
    path.join(app.getAppPath(), '..', 'gateway'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'nusa', 'main.py'))) {
      return dir;
    }
  }
  return null;
}

function findPythonBinary(gatewayDir: string | null): string | null {
  // Check virtualenv inside gatewayDir first
  if (gatewayDir) {
    const venvPython = process.platform === 'win32'
      ? path.join(gatewayDir, '.venv', 'Scripts', 'python.exe')
      : path.join(gatewayDir, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPython)) {
      return venvPython;
    }
  }

  // Check system python candidates
  const candidates = process.platform === 'win32'
    ? ['python.exe', 'py.exe']
    : [
        '/opt/homebrew/bin/python3',
        '/usr/local/bin/python3',
        '/usr/bin/python3',
        'python3',
        'python',
      ];

  for (const cmd of candidates) {
    if (cmd.startsWith('/') || cmd.includes('\\')) {
      if (fs.existsSync(cmd)) return cmd;
    } else {
      // Relative command — look up in PATH
      const paths = (process.env.PATH || '').split(path.delimiter);
      for (const p of paths) {
        const full = path.join(p, cmd);
        if (fs.existsSync(full)) return full;
      }
    }
  }

  return null;
}

export async function startGatewayProcess(): Promise<void> {
  fixSystemPath();

  const alreadyRunning = await isGatewayRunning();
  if (alreadyRunning) {
    console.log('[Gateway] Server already active on port', GATEWAY_PORT);
    return;
  }

  console.log('[Gateway] Spawning local Gateway process...');

  const isPackaged = app.isPackaged;
  const binaryName = process.platform === 'win32' ? 'nusa-gateway.exe' : 'nusa-gateway';
  const packagedBinary = path.join(process.resourcesPath, 'gateway', binaryName);

  let command: string | null = null;
  let args: string[] = [];
  let cwd: string = process.cwd();

  if (isPackaged && fs.existsSync(packagedBinary)) {
    command = packagedBinary;
    cwd = path.dirname(packagedBinary);
  } else {
    const gatewayDir = findGatewayWorkingDir();
    const pythonBin = findPythonBinary(gatewayDir);

    if (pythonBin && gatewayDir) {
      command = pythonBin;
      args = ['-m', 'uvicorn', 'nusa.main:app', '--host', '127.0.0.1', '--port', String(GATEWAY_PORT)];
      cwd = gatewayDir;
    }
  }

  if (!command) {
    console.warn('[Gateway] No local Python interpreter or compiled Gateway binary found. Gateway must be started independently.');
    return;
  }

  try {
    console.log(`[Gateway] Starting: ${command} ${args.join(' ')} in ${cwd}`);
    gatewayProcess = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      detached: false,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    gatewayProcess.stdout?.on('data', (data) => {
      console.log(`[Gateway stdout]: ${data}`.trim());
    });

    gatewayProcess.stderr?.on('data', (data) => {
      console.warn(`[Gateway stderr]: ${data}`.trim());
    });

    gatewayProcess.on('exit', (code, signal) => {
      console.log(`[Gateway] Exited with code ${code}, signal ${signal}`);
      gatewayProcess = null;
    });

    // Wait up to 5 seconds for health endpoint to become ready
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isGatewayRunning()) {
        console.log('[Gateway] Successfully verified health endpoint on port', GATEWAY_PORT);
        break;
      }
    }
  } catch (err) {
    console.error('[Gateway] Failed to spawn process:', err);
  }
}

export function stopGatewayProcess(): void {
  if (gatewayProcess && !gatewayProcess.killed) {
    console.log('[Gateway] Gracefully terminating child process...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(gatewayProcess.pid), '/f', '/t']);
      } else {
        gatewayProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.error('[Gateway] Error killing process:', err);
    }
    gatewayProcess = null;
  }
}
