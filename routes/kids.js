var express = require("express");
var router = express.Router();
var uniqid = require("uniqid");
var mongoose = require("mongoose");

//IMPORT DE TOUS LES FICHIERS MODELS
var userModel = require("../models/users");
var kidModel = require("../models/kids");
var notionModel = require("../models/notions");
var challengeModel = require("../models/challenges");
var questionModel = require("../models/questions");

//AJOUT KID
router.post("/addKid", async function (req, res, next) {
  let error = [];
  let result = false;
  let kidId = "";
  let kidInfos = {};

  if (!req.body.userIdFromFront) {
    error.push({
      code: 1,
      label: "précisez un userId (user admin du profil enfant",
    });
  }
  if (!req.body.firstNameFromFront) {
    error.push({ code: 2, label: "préciez le prénom de l'enfant" });
  }
  if (!req.body.gradeFromFront) {
    error.push({ code: 3, label: "précisez le niveau scolaire de l'enfant" });
  }
  if (error.length == 0) {
    //informations additionnelles facultatives (utile notamment pour les tests)
    if (req.body.additionalInfos) {
      kidInfos = JSON.parse(req.body.additionalInfos);
    }

    kidInfos.adminUser = req.body.userIdFromFront;
    kidInfos.grade = req.body.gradeFromFront;
    kidInfos.firstName = req.body.firstNameFromFront;
    //Pour l'affichage des stats, on initialise le nb de jours consécutifs à 0
    if (!kidInfos.consecutiveDaysNb) {
      kidInfos.consecutiveDaysNb = 0;
    }

    var newKid = new kidModel(kidInfos);
    let saveKid = await newKid.save();

    if (saveKid) {
      result = true;
      kidId = saveKid.id;
    }
  }
  res.json({ result, error, kidId });
});

//GET KID BY ID
// router.get("/byID/:kidIdFromFront", async function (req, res, next) {
//   let error = [];
//   let result = false;

//   if (!req.params.kidIdFromFront) {
//     error.push({ code: 1, label: "précisez un kidId" });
//   }

//   let kid = await kidModel.findById(req.params.kidIdFromFront);

//   if (!kid) {
//     error.push({ code: 2, label: "le kid n'existe pas" });
//   } else {
//     result = true;
//   }

//   res.json({ result, error, kid });
// });

//GET KIDS BY USER ID
router.get("/getKidsByUserId", async function (req, res, next) {
  let error = [];
  let result = false;
  let userMail = "";
  let adminKidList = [];
  let relatedKidList = [];
  let kidListToReturn = [];

  console.log("test", req.query);

  if (!req.query.userIdFromFront) {
    error.push({ code: 1, label: "précisez un userId" });
  }
  var user = await userModel.findById(req.query.userIdFromFront);

  if (!user) {
    error.push({ code: 2, label: "le user n'existe pas" });
  } else {
    userMail = user.mail;
  }

  if (error.length == 0) {
    var kidList = await kidModel.find().populate("adminUser").exec();

    if (kidList.length == 0) {
      error.push({
        code: 3,
        label: "il n'existe pas de profil enfant dans la BDD",
      });
    } else {
      //étape 1 : on récupère la liste des kids dont le user est l'admin
      adminKidList = kidList.filter(
        (e) => e.adminUser.id == req.query.userIdFromFront
      );

      adminKidList = adminKidList.map((item, i) => {
        //On ne retourne au front que les données qu'il exploite, les autres servant à la mécanique de conception des défis personnalisés (côté Backend)
        let ob = {
          id: item.id,
          isRelated: false,
          firstName: item.firstName,
          grade: item.grade,
          activatedNotions: item.activatedNotions,
          //On pourra décaler ce sort au moment où on stocke les infos en BDD car l'action ne serait faite qu'une fois et non à chaque fois qu'on fait un get kid
          customWords: item.customWords.sort((a, b) => {
            if (a.label.toLowerCase() < b.label.toLowerCase()) {
              return -1;
            }
            if (a.label.toLowerCase() > b.label.toLowerCase()) {
              return 1;
            }
            return 0;
          }),
          relatedUsers: item.relatedUsers,
          xp: item.xp,
          consecutiveDaysNb: item.consecutiveDaysNb,
        };
        return ob;
      });

      //étape 2 : on récupère la liste des kids dont le user est related
      relatedKidList = kidList.filter((e) =>
        e.relatedUsers.find((i) => i == userMail)
      );

      relatedKidList = relatedKidList.map((item, i) => {
        let ob = {
          id: item.id,
          isRelated: true,
          firstName: item.firstName,
          grade: item.grade,
          activatedNotions: item.activatedNotions,
          customWords: item.customWords.sort((a, b) => {
            if (a.label.toLowerCase() < b.label.toLowerCase()) {
              return -1;
            }
            if (a.label.toLowerCase() > b.label.toLowerCase()) {
              return 1;
            }
            return 0;
          }),
          xp: item.xp,
          consecutiveDaysNb: item.consecutiveDaysNb,
        };
        return ob;
      });

      kidListToReturn = [...adminKidList, ...relatedKidList];
      result = true;
    }
  }

  res.json({ result, error, kidListToReturn });
});

//ROUTE PUT KID ACTIVATED NOTIONS
router.put(
  "/kidActivatedNotions/:kidIdFromFront",
  async function (req, res, next) {
    let error = [];
    let result = false;
    let savedKid = {};

    if (!req.params.kidIdFromFront) {
      error.push({ code: 1, label: "précisez un kidId" });
    }
    if (!req.body.newActivatedNotionsFromFront) {
      error.push({ code: 2, label: "précisez une liste de notion" });
    }

    if (error.length == 0) {
      let newNotionsList = JSON.parse(req.body.newActivatedNotionsFromFront);
      let kid = await kidModel
        .findById(req.params.kidIdFromFront)
        .populate("testedChallenges.challengeId")
        .populate("activatedNotions.notionId")
        .exec();

      if (!kid) {
        error.push({
          code: 4,
          label: "il n'existe pas de kid avec l'id" + req.params.kidIdFromFront,
        });
      } else {
        let tableau = [];
        for (let element of newNotionsList) {
          let kidnotion = kid.activatedNotions.find(
            (e) => e.notionId.id == element.notionId
          );
          if (kidnotion) {
            tableau.push(kidnotion);
          } else {
            tableau.push(element);
          }
        }

        kid.activatedNotions = tableau;
      }

      //Mise à jour de la bdd
      savedKid = await kid.save();
      if (savedKid) {
        result = true;
      }
    }

    res.json({ result, error, savedKid });
  }
);

//ROUTE PUT KID GRADE
router.put("/kidGrade/:kidIdFromFront", async function (req, res, next) {
  let error = [];
  let result = false;
  let savedKid = {};

  if (!req.params.kidIdFromFront) {
    error.push({ code: 1, label: "précisez un kidId" });
  }
  if (!req.body.newKidGradeFromFront) {
    error.push({ code: 2, label: "précisez une classe pour l'enfant" });
  }

  if (error.length == 0) {
    let kid = await kidModel.findById(req.params.kidIdFromFront).exec();

    if (!kid) {
      error.push({
        code: 4,
        label: "il n'existe pas de kid avec l'id" + req.body.kidIdFromFront,
      });
    } else {
      kid.grade = req.body.newKidGradeFromFront;
    }

    //Mise à jour de la bdd
    savedKid = await kid.save();
    if (savedKid) {
      result = true;
    }
  }

  res.json({ result, error, savedKid });
});

// ADD KID CUSTOM WORD
router.put(
  "/addKidCustomWord/:kidIdFromFront",
  async function (req, res, next) {
    let error = [];
    let result = false;
    let savedKid = {};

    if (!req.params.kidIdFromFront) {
      error.push({ code: 1, label: "précisez un kidId" });
    }
    if (!req.body.newCustomWordFromFront) {
      error.push({ code: 2, label: "précisez un mot à ajouter" });
    }

    if (error.length == 0) {
      let newWord = req.body.newCustomWordFromFront;
      let kid = await kidModel.findById(req.params.kidIdFromFront);

      if (!kid) {
        error.push({
          code: 4,
          label: "il n'existe pas de kid avec l'id" + req.params.kidIdFromFront,
        });
      } else {
        let finalWordsList = kid.customWords;
        finalWordsList.push({ label: newWord });
        kid.customWords = finalWordsList;
      }

      //Mise à jour de la bdd
      savedKid = await kid.save();
      if (savedKid) {
        result = true;
      }
    }

    res.json({ result, error, savedKid });
  }
);

// DELETE KID CUSTOM WORD
router.delete(
  "/deleteKidCustomWord/:kidIdFromFront",
  async function (req, res, next) {
    let error = [];
    let result = false;
    let savedKid = {};

    if (!req.params.kidIdFromFront) {
      error.push({ code: 1, label: "précisez un kidId" });
    }
    if (!req.body.customWordToDeleteFromFront) {
      error.push({ code: 2, label: "précisez un mot à supprimer" });
    }

    if (error.length == 0) {
      let wordToDelete = req.body.customWordToDeleteFromFront;
      let kid = await kidModel.findById(req.params.kidIdFromFront);

      if (!kid) {
        error.push({
          code: 4,
          label: "il n'existe pas de kid avec l'id" + req.params.kidIdFromFront,
        });
      } else {
        let currentWordsList = kid.customWords;
        let finalWordsList = currentWordsList.filter(
          (e) => e.label != wordToDelete
        );
        kid.customWords = finalWordsList;
      }

      //Mise à jour de la bdd
      savedKid = await kid.save();
      if (savedKid) {
        result = true;
      }
    }

    res.json({ result, error, savedKid });
  }
);

//ROUTE PUT KID RELATED USERS
router.put("/kidRelatedUsers/:kidIdFromFront", async function (req, res, next) {
  let error = [];
  let result = false;
  let savedKid = {};

  if (!req.params.kidIdFromFront) {
    error.push({ code: 1, label: "précisez un kidId" });
  }
  if (!req.body.newKidRelatedFromFront) {
    error.push({ code: 2, label: "précisez une liste de mails" });
  }

  if (error.length == 0) {
    let kid = await kidModel.findById(req.params.kidIdFromFront).exec();

    if (!kid) {
      error.push({
        code: 4,
        label: "il n'existe pas de kid avec l'id" + req.body.kidIdFromFront,
      });
    } else {
      console.log(
        "liste à mettre à jour ",
        JSON.parse(req.body.newKidRelatedFromFront)
      );
      kid.relatedUsers = JSON.parse(req.body.newKidRelatedFromFront);
    }

    //Mise à jour de la bdd
    savedKid = await kid.save();
    if (savedKid) {
      result = true;
      console.log(savedKid);
    }
  }

  res.json({ result, error, savedKid });
});

//SUPPRESSION KID - A REVOIR - QUI PEUT SUPPRIMER, QUID DES KIDS DONT ON EST RELATED ....
// router.delete("/deleteKid/:kidIdFromFront", async function (req, res, next) {
//   let error = [];
//   let result = false;
//   if (!req.params.kidIdFromFront) {
//     push.error({ code: 1, label: "précisez un id" });
//   } else {
//     const data = await kidModel.deleteOne({ id: req.params.kidIdFromFront });
//     if (data) {
//       result = true;
//     }
//   }
//   res.json({ result, error });
// });

module.exports = router;
