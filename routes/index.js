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

/* GET Challenge of the day. */
router.get("/getChallengeOfTheDay", async function (req, res, next) {
  
var kid = await kidModel.findById(req.query.kidIdFromFront).populate('testedChallenges.challengeId').populate('activatedNotions.notionId').exec(); 

// Récupération de la liste des énoncés qui n'ont pas déjà été interrogés //
var allChallenges = await challengeModel.find();
var kidTestedChallenges = kid.testedChallenges
for (let element of kidTestedChallenges) {
  allChallenges = allChallenges.filter(e => e.id !== element.challengeId.id)
}
console.log("déja interrogé =>", kidTestedChallenges)
console.log("available =>", allChallenges)

// Récupération d'un énoncé au hasard parmi ceux qui n'ont pas déjà été interrogés//
let randomNbChallenge = Math.floor(Math.random() * allChallenges.length)
let finalChallenge = allChallenges[randomNbChallenge]
console.log("final challenge au hasard =>", finalChallenge)

// Récupération des questions activées, spécifiques à l'énoncé ET génériques //
var allQuestions = await questionModel.find().populate('challengeId').populate('notionId').exec();
let kidActivatedNotions = kid.activatedNotions;

// Filtre pour récupérer les questions avec une notion activée //
let intermediaryQuestions = []
for (let element of kidActivatedNotions) {
  intermediaryQuestions.push(allQuestions.filter(e => e.notionId.id == element.notionId.id))
}
console.log("filtre activatedNotions =>", intermediaryQuestions)

// Filtre pour récupérer les questions spécifiques à l'énoncé ET génériques //

// Récupération de 5 questions au hasard//

  res.json({reponse: "blabla"});
});

module.exports = router;
