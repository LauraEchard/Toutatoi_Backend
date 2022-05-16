var mongoose = require("mongoose");

var userSchema = mongoose.Schema({
  mail: String,
  code: Number,
  codeExpDate: Date,
});

module.exports = mongoose.model("users", userSchema);
