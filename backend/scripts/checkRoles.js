require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({
    email: { $in: ['younis@efficience.fr', 'maarzoukrayan3@gmail.com'] }
  }).select('name email role');
  users.forEach(u => console.log(u.email, '->', u.role));
  await mongoose.disconnect();
}
check();
