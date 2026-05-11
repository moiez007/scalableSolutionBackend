const mongoose = require('mongoose');
const env = require('./env');

async function connectDatabase() {
  await mongoose.connect(env.mongodbUri);
}

module.exports = connectDatabase;
