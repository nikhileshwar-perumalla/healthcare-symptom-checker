import { init } from '../node-backend/src/app.js';

let appPromise;

export default async function handler(req, res) {
  if (!appPromise) {
    appPromise = init();
  }
  const app = await appPromise;
  // Express apps are request handlers: (req, res) => void
  return app(req, res);
}
