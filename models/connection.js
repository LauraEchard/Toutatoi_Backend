var mongoose = require("mongoose");
var options = {
  connectTimeoutMS: 5000,
  useUnifiedTopology: true,
  useNewUrlParser: true,
};
mongoose.connect(
  "mongodb+srv://dev:azerty@cluster0.fzjnx.mongodb.net/toutatoi?retryWrites=true&w=majority",
  options,
  function (err) {
    err ? console.log(err) : console.log("connected to the DB !!");
  }
);

module.exports = mongoose;
