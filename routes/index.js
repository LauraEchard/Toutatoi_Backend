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
  var kid = await kidModel
    .findById(req.query.kidIdFromFront)
    .populate("testedChallenges.challengeId")
    .populate("activatedNotions.notionId")
    .exec();

  // Récupération de la liste des énoncés qui n'ont pas déjà été interrogés //
  var allChallenges = await challengeModel.find();
  var kidTestedChallenges = kid.testedChallenges;
  for (let element of kidTestedChallenges) {
    allChallenges = allChallenges.filter(
      (e) => e.id !== element.challengeId.id
    );
  }

  // Récupération d'un énoncé au hasard parmi ceux qui n'ont pas déjà été interrogés//
  let randomNbChallenge = Math.floor(Math.random() * allChallenges.length);
  let finalChallenge = allChallenges[randomNbChallenge];

  // Récupération des questions correspondant à des notions actives, spécifiques à l'énoncé ET génériques //
  var allQuestions = await questionModel
    .find()
    .populate("challengeId")
    .populate("notionId")
    .exec();
  let kidActivatedNotions = kid.activatedNotions;

  // ETAPE 1 : récupérer toutes les questions des notions activées (OK ça fonctionne)

  let intermediaryQuestions = [];
  for (let element of kidActivatedNotions) {
    var filtre = allQuestions.filter(
      (e) => e.notionId.id == element.notionId.id
    );
    for (var i = 0; i < filtre.length; i++) {
      intermediaryQuestions.push(filtre[i]);
    }
  }

  // ETAPE 2 : récupérer les questions du challenge + les questions génériques (En cours)

  let availableQuestions = [];

  let specificQuestions = intermediaryQuestions.filter((e) => e.challengeId);
  console.log("spectificQuestions =>", specificQuestions.length);

  let finalChallengeQuestions = specificQuestions.filter(
    (e) => e.challengeId.id === finalChallenge.id
  );
  console.log("finalChallengeQuestions =>", finalChallengeQuestions.length);

  let genericQuestions = intermediaryQuestions.filter((e) => !e.challengeId);
  console.log("genericQuestions =>", genericQuestions.length);

  for (var i = 0; i < genericQuestions.length; i++) {
    availableQuestions.push(genericQuestions[i]);
  }
  for (var i = 0; i < finalChallengeQuestions.length; i++) {
    availableQuestions.push(finalChallengeQuestions[i]);
  }

  console.log("availableQuestions =>", availableQuestions.length);

  // // Récupération de 5 questions au hasard //
  let finalQuestions = [];
  for (let i = 0; i < 5; i++) {
    var randomNbQuestions = Math.floor(
      Math.random() * availableQuestions.length
    );
    finalQuestions.push(availableQuestions[randomNbQuestions]);
    availableQuestions.splice(randomNbQuestions, 1);
  }

  res.json({ challenge: finalChallenge, questions: finalQuestions });
});

module.exports = router;
