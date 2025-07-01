// init-db.js
import { initDB } from './db/db.js';

initDB().then(() => {
  console.log('✅ Database initialized.');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Failed to initialize DB:', err);
  process.exit(1);
});
