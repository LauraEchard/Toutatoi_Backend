const fs = require("fs");
const mongoose = require("mongoose");

// Load models
const Question = require("./models/questions");

// Connect to DB
const options = {
  connectTimeoutMS: 5000,
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

mongoose.connect(
  "mongodb+srv://dev:azerty@cluster0.fzjnx.mongodb.net/toutatoi?retryWrites=true&w=majority",
  options,
  (err) => {
    err && console.log(err);
    !err && console.log(`Connected to the database !`);
  }
);

// Read JSON files
const questions = JSON.parse(
  fs.readFileSync(`${__dirname}/data/questions.json`, "utf-8")
);

// Import into DB
const importData = async () => {
  try {
    await Question.create(questions);
    console.log("Data Imported...");
    process.exit();
  } catch (error) {
    console.error(error);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await Question.deleteMany();
    console.log("Data Destroyed...");
    process.exit();
  } catch (error) {
    console.error(error);
  }
};

if (process.argv[2] === "-import") {
  importData();
} else if (process.argv[2] === "-delete") {
  deleteData();
}
