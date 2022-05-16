var mongoose = require("mongoose");

var questionSchema = mongoose.Schema({
  notionId: { type: mongoose.Schema.Types.ObjectId, ref: "notions" },
  questionLabel: String,
  answerLabel: String,
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "challenges" },
});

module.exports = mongoose.model("questions", questionSchema);
