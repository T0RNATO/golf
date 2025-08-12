import {defineConfig} from "vite";

export default defineConfig({
    plugins: [
        {
            name: 'reload-main-entry',
            handleHotUpdate({ server }) {
                server.ws.send({ type: 'full-reload', path: '*' });
            }
        }
    ]
});