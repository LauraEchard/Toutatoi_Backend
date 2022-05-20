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

    if (!kidList) {
      error.push({
        code: 3,
        label: "il n'existe pas de profils enfant dans la BDD",
      });
    } else {
      adminKidList = kidList.filter(
        (e) => e.adminUser.id == req.query.userIdFromFront
      );

      relatedKidList = kidList.filter((e) =>
        e.relatedUsers.find((i) => i == userMail)
      );

      result = true;
    }
  }

  res.json({ result, error, adminKidList, relatedKidList });
});

// ROUTE GET ALL NOTIONS FROM BDD
router.get("/getAllNotionsFromBdd", async function (req, res, next) {
  let allNotions = await notionModel.find();

  res.json({ allNotions });
});

//GET KID ACTIVATED NOTIONS BY KID ID
router.get("/getKidActivatedNotions", async function (req, res, next) {
  let error = [];
  let result = false;
  let kidActivatedNotions = [];

  if (!req.query.kidIdFromFront) {
    error.push({ code: 1, label: "précisez un kidId" });
  }

  let kid = await kidModel.findById(req.query.kidIdFromFront);

  if (!kid) {
    error.push({ code: 2, label: "le kid n'existe pas" });
  } else {
    kidActivatedNotions = kid.activatedNotions;
    result = true;
  }

  res.json({ result, error, kidActivatedNotions });
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
          label: "il n'existe pas de kid avec l'id" + req.body.kidIdFromFront,
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

module.exports = router;
