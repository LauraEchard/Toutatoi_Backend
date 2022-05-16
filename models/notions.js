var mongoose = require("mongoose");

var notionSchema = mongoose.Schema({
  category: String,
  subCategory: String,
  notionName: String,
  refGrade: {
    type: String,
    enum: ["CP", "CE1", "CE2", "CM1", "CM2"],
    default: "CP",
  },
});

module.exports = mongoose.model("notions", notionSchema);
