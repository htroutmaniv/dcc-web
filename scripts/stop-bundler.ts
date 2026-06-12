import { loadEnvPorts, pause, stopPort } from './kill-port.js';

const { web } = loadEnvPorts();
stopPort(web, 'Vite');
pause(500);
