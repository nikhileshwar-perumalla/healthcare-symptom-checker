import http from 'http';
import app, { init } from './app.js';

const port = process.env.PORT || 8000;

init()
  .then(() => {
    const server = http.createServer(app);
    server.listen(port, () => {
      console.log(`Node backend listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
