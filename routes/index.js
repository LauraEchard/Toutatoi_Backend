var express = require("express");
var router = express.Router();

//IMPORT DE TOUS LES FICHIERS MODELS
var userModel = require("../models/users");
var kidModel = require("../models/kids");
var notionModel = require("../models/notions");
var challengeModel = require("../models/challenges");
var questionModel = require("../models/questions");

/* GET home page. */
router.get("/", function (req, res, next) {
  console.log();
  res.render("index", { title: "Express" });
});

module.exports = router;
