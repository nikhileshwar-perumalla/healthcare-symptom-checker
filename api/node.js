import serverless from 'serverless-http';
import { init } from '../node-backend/src/app.js';

let handlerPromise;

export default async function handler(req, res) {
  if (!handlerPromise) {
    const app = await init();
    handlerPromise = serverless(app);
  }
  const h = await handlerPromise;
  return h(req, res);
}
