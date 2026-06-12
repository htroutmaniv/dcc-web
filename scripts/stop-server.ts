import { loadEnvPorts, pause, stopPort } from './kill-port.js';

const { api } = loadEnvPorts();
stopPort(api, 'API');
pause(500);
