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
    if (req.body.additionalInfos) {
      kidInfos = JSON.parse(req.body.additionalInfos);
    }

    kidInfos.adminUser = req.body.userIdFromFront;
    kidInfos.grade = req.body.gradeFromFront;
    kidInfos.firstName = req.body.firstNameFromFront;

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
router.get("/byID/:kidIdFromFront", async function (req, res, next) {
  let error = [];
  let result = false;

  if (!req.params.kidIdFromFront) {
    error.push({ code: 1, label: "précisez un kidId" });
  }

  let kid = await kidModel.findById(req.params.kidIdFromFront);

  if (!kid) {
    error.push({ code: 2, label: "le kid n'existe pas" });
  } else {
    result = true;
  }

  res.json({ result, error, kid });
});

//SUPPRESSION KID
router.delete("/deleteKid/:kidIdFromFront", async function (req, res, next) {
  let error = [];
  let result = false;
  if (!req.params.kidIdFromFront) {
    push.error({ code: 1, label: "précisez un id" });
  } else {
    const data = await kidModel.deleteOne({ id: req.params.kidIdFromFront });
    if (data) {
      result = true;
    }
  }
  res.json({ result, error });
});

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
        label: "il n'existe pas de profils enfant dans la BDD",
      });
    } else {
      console.log("la list ", kidList[2].adminUser.id);
      for (let element of kidList) {
        console.log("totu", element.adminUser.id, "  ", element.firstName);
      }

      adminKidList = kidList.filter(
        (e) => e.adminUser.id == req.query.userIdFromFront
      );

      adminKidList = adminKidList.map((item, i) => {
        console.log("liste non triée", item.customWords);
        let sortedCustomWords = item.customWords.sort(function (a, b) {
          return a.label - b.label;
        });
        console.log("liste triée ", i, sortedCustomWords);
        let ob = {
          id: item.id,
          isRelated: false,
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
          relatedUsers: item.relatedUsers,
          xp: item.xp,
          consecutiveDaysNb: item.consecutiveDaysNb,
        };
        return ob;
      });

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

// ROUTE GET ALL NOTIONS FROM BDD
router.get("/getAllNotionsFromBdd", async function (req, res, next) {
  let allNotions = await notionModel.find();

  res.json({ allNotions });
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

    let finalNotions = [];

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
router.put("/KidGrade/:kidIdFromFront", async function (req, res, next) {
  let error = [];
  let result = false;
  let savedKid = {};

  if (!req.params.kidIdFromFront) {
    error.push({ code: 1, label: "précisez un kidId" });
  }
  if (!req.body.newKidGradeFromFront) {
    error.push({ code: 2, label: "précisez une classe pour l'enfant" });
  }

  let finalNotions = [];

  if (error.length == 0) {
    let kid = await kidModel
      .findById(req.params.kidIdFromFront)
      .populate("testedChallenges.challengeId")
      .populate("activatedNotions.notionId")
      .exec();

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
router.put("/KidRelatedUsers/:kidIdFromFront", async function (req, res, next) {
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
    let kid = await kidModel
      .findById(req.params.kidIdFromFront)
      .populate("testedChallenges.challengeId")
      .populate("activatedNotions.notionId")
      .exec();

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

module.exports = router;
