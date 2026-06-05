/**
 * Stop host processes bound to the prod API and web ports (orphaned bun/vite from prior runs).
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function loadEnvPorts(): { api: number; web: number } {
  let apiPort = 3003;
  let webPort = 5173;

  const envPath = resolve(root, '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const portMatch = line.match(/^PORT=(\d+)\s*$/);
      if (portMatch) apiPort = Number(portMatch[1]);
      const viteMatch = line.match(/^VITE_PORT=(\d+)\s*$/);
      if (viteMatch) webPort = Number(viteMatch[1]);
    }
  }

  return {
    api: Number(process.env.PORT ?? apiPort),
    web: Number(process.env.VITE_PORT ?? webPort),
  };
}

function pidsListeningOnPort(port: number): number[] {
  if (process.platform === 'win32') {
    try {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      const pids = new Set<number>();
      for (const line of out.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5 || parts[3] !== 'LISTENING') continue;
        const localPort = Number(parts[1].split(':').at(-1));
        if (localPort !== port) continue;
        pids.add(Number(parts[4]));
      }
      return [...pids].filter((pid) => pid > 4);
    } catch {
      return [];
    }
  }

  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: 'utf8' });
    return out
      .trim()
      .split(/\s+/)
      .map((s) => Number(s))
      .filter((pid) => pid > 0);
  } catch {
    return [];
  }
}

function killPid(pid: number): boolean {
  if (pid === process.pid) return false;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

function stopPort(port: number, label: string): void {
  const pids = pidsListeningOnPort(port);
  if (pids.length === 0) return;

  for (const pid of pids) {
    if (killPid(pid)) {
      console.log(`Stopped ${label} (port ${port}, PID ${pid})`);
    }
  }
}

function pause(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* wait for OS to release ports */
  }
}

const { api, web } = loadEnvPorts();
stopPort(api, 'API');
stopPort(web, 'web');
pause(500);
