var express = require("express");
var router = express.Router();

//IMPORT DE TOUS LES FICHIERS MODELS
var userModel = require("../models/users");
var kidModel = require("../models/kids");
var notionModel = require("../models/notions");
var challengeModel = require("../models/challenges");
var questionModel = require("../models/questions");
const x = require("uniqid");
const questions = require("../models/questions");

/* GET home page. */
router.get("/", function (req, res, next) {
  console.log();
  res.render("index", { title: "Express" });
});

//ROUTE GET CHALLENGE OF THE DAY
router.get("/getChallengeOfTheDay", async function (req, res, next) {
  let error = [];
  let result = false;
  let challenge = "";
  let questions = [];

  if (!req.query.kidIdFromFront) {
    error.push({ code: 1, label: "précisez un kidId" });
  }

  if (error.length == 0) {
    let kid = await kidModel
      .findById(req.query.kidIdFromFront)
      .populate("testedChallenges.challengeId")
      .populate("activatedNotions.notionId")
      .exec();

    // Récupération de la liste des énoncés qui n'ont pas déjà été interrogés //
    let allChallenges = await challengeModel.find();
    console.log("allChallenge ", allChallenges);
    let kidTestedChallenges = kid.testedChallenges;
    if (kidTestedChallenges.length < allChallenges.length) {
      for (let element of kidTestedChallenges) {
        allChallenges = allChallenges.filter(
          (e) => e.id !== element.challengeId.id
        );
      }
    }

    // Récupération d'un énoncé au hasard parmi ceux qui n'ont pas déjà été interrogés//
    let randomNbChallenge = Math.floor(Math.random() * allChallenges.length);
    challenge = allChallenges[randomNbChallenge];
    console.log("finalChallenge ", challenge);

    // Récupération des questions correspondant à des notions actives, spécifiques à l'énoncé ET génériques //
    var allQuestions = await questionModel
      .find()
      .populate("challengeId")
      .populate("notionId")
      .exec();
    let kidActivatedNotions = kid.activatedNotions;

    // ETAPE 1 : récupérer toutes les questions des notions activées

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
      (e) => e.challengeId.id === challenge.id
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

    //Etape 3 : ajout des éventuels questions de vocabulaire
    if (kid.customWords.length > 0) {
      for (let word of kid.customWords) {
        availableQuestions.push({
          questionLabel: `comment écris-tu ${word.label}?`,
          wordId: word.id,
        });
      }
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
    questions = finalQuestions;
  }

  res.json({
    error,
    result,
    challenge,
    questions,
  });
});

//ROUTE POST RESULTS OF THE DAY
router.post("/resultsOfTheDay", async function (req, res) {
  let error = [];
  let result = false;
  let savedKid = {};

  if (!req.body.kidIdFromFront) {
    error.push({ code: 1, label: "précisez un kidId" });
  }
  if (!req.body.challengeIdFromFront) {
    error.push({ code: 2, label: "précisez un challengeId" });
  }
  if (!req.body.resultListFromFront) {
    error.push({ code: 3, label: "précisez la liste de résultats" });
  }

  if (error.length == 0) {
    let kid = await kidModel
      .findById(req.body.kidIdFromFront)
      .populate("testedChallenges.challengeId")
      .populate("activatedNotions.notionId")
      .exec();

    if (!kid) {
      error.push({
        code: 4,
        label: "il n'existe pas de kid avec l'id" + req.body.kidFromFront,
      });
    } else {
      //1.Mise à jour de la propriété kid.consecutiveDaysNb
      let date = new Date();
      //CQL : Quid du changement d'heure ?
      date.setHours(2, 0, 0, 0);
      console.log("date du jour", date);

      date = date.setDate(date.getDate() - 1);
      console.log("date de veille", new Date(date));

      if (kid.lastChallengeDate - date < 0) {
        kid.consecutiveDaysNb = 1;
      } else {
        if (kid.lastChallengeDate - date == 0) {
          kid.consecutiveDaysNb = kid.consecutiveDaysNb + 1;
        }
      }

      //2.Mise à jour de la propriété kid.lastChallengeDate
      //CQL POURQUOI IMPOSSIBLE DE REUTILISER LA DATE Précédente UTILISEE POUR DEF CONSEC DAYS
      let newdate = new Date();
      newdate.setHours(2, 0, 0, 0);
      kid.lastChallengeDate = newdate;

      //3.Mise à jour de la prop kid.testedChallenges
      kid.testedChallenges = kid.testedChallenges.filter(
        (e) => e.challengeId.id != req.body.challengeIdFromFront
      );
      kid.testedChallenges.push({
        challengeId: req.body.challengeIdFromFront,
        lastTestDate: newdate,
      });

      //4.Mise à jour de la prop kid.xp
      let datemin = new Date();
      datemin = datemin.setDate(datemin.getDate() - 90);

      kid.xp = kid.xp.filter((e) => e.date - datemin >= 0);

      let count = 0;
      let resultList = JSON.parse(req.body.resultListFromFront);
      for (let element of resultList) {
        count = count + element.result;
      }

      count = 2 * count;

      console.log("la diff ", kid.xp);
      let xpOfTheDay = kid.xp.find((e) => e.date - newdate == 0);
      if (xpOfTheDay) {
        console.log("je suis là");
        xpOfTheDay.xpNb = xpOfTheDay.xpNb + count;
      } else {
        count = count + (kid.consecutiveDaysNb % 365);
        kid.xp.push({ date: newdate, xpNb: count });
      }

      //5.Mise à jour de la prop kid.activatedNotions et customWords
      for (let element of resultList) {
        if (element.questionId.charAt(0) != "_") {
          //On est dans le cas d'une notion
          let question = await questionModel
            .findById(element.questionId)
            .populate("notionId")
            .exec();

          console.log("notion de la question ", question.notionId.id);
          console.log(kid.activatedNotions[0].notionId.id);

          let activatedNotion = kid.activatedNotions.find(
            (e) => e.notionId.id == question.notionId.id
          );

          if (!activatedNotion) {
            error.push({
              code: 5,
              label: "pas de notion activée pour cette question",
            });
          } else {
            activatedNotion.lastTestDate = newdate;
          }
          if (activatedNotion.testNb) {
            activatedNotion.average =
              (activatedNotion.average * activatedNotion.testNb +
                element.result) /
              (activatedNotion.testNb + 1);
            activatedNotion.testNb++;
          } else {
            activatedNotion.average = element.result;
            activatedNotion.testNb = 1;
          }
        }

        //On est dans le cas d'un customWord
        else {
          let wordId = element.questionId.slice(1);
          console.log("wordId ", wordId);
          let customWord = kid.customWords.find((e) => e.id == wordId);

          if (!customWord) {
            error.push({
              code: 6,
              label: "pas de mot enregistré pour cette question",
            });
          } else {
            customWord.lastTestDate = newdate;
          }
          if (customWord.testNb) {
            customWord.average =
              (customWord.average * customWord.testNb + element.result) /
              (customWord.testNb + 1);
            customWord.testNb++;
          } else {
            customWord.average = element.result;
            customWord.testNb = 1;
          }
        }
      }

      savedKid = await kid.save();
      if (savedKid) {
        result = true;
      }
    }
  }

  res.json({ error, result, savedKid });
});

module.exports = router;
