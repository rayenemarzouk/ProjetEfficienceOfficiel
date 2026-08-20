const mongoose = require('mongoose');
const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur de connexion MongoDB: ${error.message}`);
    console.error(error);
    // Exit only in production so development servers (nodemon) keep running for debugging
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
module.exports = connectDB;