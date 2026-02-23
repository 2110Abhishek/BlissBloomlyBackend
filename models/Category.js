//models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  icon: String,
  count: { type: Number, default: 0 },
  image: String
});

module.exports = mongoose.model('Category', categorySchema);
