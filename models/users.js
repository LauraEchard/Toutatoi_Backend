var mongoose = require("mongoose");

var userSchema = mongoose.Schema({
  mail: String,
  code: String,
  codeExpDate: Date,
});

module.exports = mongoose.model("users", userSchema);
