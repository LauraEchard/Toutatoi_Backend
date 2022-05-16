var mongoose = require("mongoose");

var challengeSchema = mongoose.Schema({
  funFact: String,
});

module.exports = mongoose.model("challenges", challengeSchema);
