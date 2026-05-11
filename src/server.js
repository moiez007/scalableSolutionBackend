require('dotenv').config();

const app = require('./app');
const connectDatabase = require('./config/db');
const env = require('./config/env');

async function startServer() {
  try {
    await connectDatabase();

    app.listen(env.port, () => {
      process.stdout.write(`Server running on port ${env.port}\n`);
    });
  } catch (error) {
    process.stderr.write(`Startup failed: ${error.message}\n`);
    process.exit(1);
  }
}

startServer();
