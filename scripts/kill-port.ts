import { execSync } from 'node:child_process';
import { loadProfileEnv } from './load-profile-env.js';

export function loadEnvPorts(): { api: number; web: number } {
  loadProfileEnv();
  return {
    api: Number(process.env.PORT ?? 3003),
    web: Number(process.env.VITE_PORT ?? 5173),
  };
}

export function pidsListeningOnPort(port: number): number[] {
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

export function stopPort(port: number, label: string): void {
  const pids = pidsListeningOnPort(port);
  for (const pid of pids) {
    if (killPid(pid)) {
      console.log(`Stopped ${label} (port ${port}, PID ${pid})`);
    }
  }
}

export function pause(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* wait for OS to release ports */
  }
}
