import { loadEnvPorts, pause, stopPort } from './kill-port.js';

const { api, web } = loadEnvPorts();
stopPort(api, 'API');
stopPort(web, 'web');
pause(500);
