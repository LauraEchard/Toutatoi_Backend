var mongoose = require("mongoose");

//SOUS-DOCUMENTS PR
var wordSchema = mongoose.Schema({
  label: String,
  lastTestDate: Date,
  average: Number,
  testNb: Number,
});

var xpSchema = mongoose.Schema({
  date: Date,
  xpNb: Number,
});

var activatedNotionSchema = mongoose.Schema({
  notionId: { type: mongoose.Schema.Types.ObjectId, ref: "notions" },
  lastTestDate: Date,
  average: Number,
  testNb: Number,
});

//SCHEMA PRINCIPAL
var kidSchema = mongoose.Schema({
  adminUser: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  relatedUsers: [String],
  firstName: String,
  grade: {
    type: String,
    enum: ["CP", "CE1", "CE2", "CM1", "CM2"],
    default: "CP",
  },
  activatedNotions: [activatedNotionSchema],
  customWords: [wordSchema],
  xp: [xpSchema],
  consecutiveDaysNb: Number,
  lastChallengeDate: Date,
  testedChallenges: [
    {
      challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "challenges" },
      lastTestDate: Date,
    },
  ],
});

module.exports = mongoose.model("kids", kidSchema);
