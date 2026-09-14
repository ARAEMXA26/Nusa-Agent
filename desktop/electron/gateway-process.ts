import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';
import { app } from 'electron';

let gatewayProcess: ChildProcess | null = null;
const GATEWAY_PORT = 4141;
const HEALTH_URL = `http://127.0.0.1:${GATEWAY_PORT}/health`;

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

export async function startGatewayProcess(): Promise<void> {
  const alreadyRunning = await isGatewayRunning();
  if (alreadyRunning) {
    console.log('[Gateway] Server already active on port', GATEWAY_PORT);
    return;
  }

  console.log('[Gateway] Spawning local Gateway process...');

  const isPackaged = app.isPackaged;
  let command: string;
  let args: string[] = [];

  if (isPackaged) {
    // In packaged app, look in process.resourcesPath
    const binaryName = process.platform === 'win32' ? 'nusa-gateway.exe' : 'nusa-gateway';
    command = path.join(process.resourcesPath, 'gateway', binaryName);
  } else {
    // Development fallback: use local virtualenv
    const venvPython = process.platform === 'win32'
      ? path.join(__dirname, '../../gateway/.venv/Scripts/python.exe')
      : path.join(__dirname, '../../gateway/.venv/bin/python');
    
    command = venvPython;
    args = ['-m', 'uvicorn', 'nusa.main:app', '--host', '127.0.0.1', '--port', String(GATEWAY_PORT)];
  }

  try {
    gatewayProcess = spawn(command, args, {
      cwd: isPackaged ? process.resourcesPath : path.join(__dirname, '../../gateway'),
      stdio: 'pipe',
      detached: false,
    });

    gatewayProcess.stdout?.on('data', (data) => {
      console.log(`[Gateway stdout]: ${data}`);
    });

    gatewayProcess.stderr?.on('data', (data) => {
      console.warn(`[Gateway stderr]: ${data}`);
    });

    gatewayProcess.on('exit', (code, signal) => {
      console.log(`[Gateway] Exited with code ${code}, signal ${signal}`);
      gatewayProcess = null;
    });
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
