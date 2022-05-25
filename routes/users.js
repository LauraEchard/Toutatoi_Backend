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

//Durée de validité du code de confirmation permettant au user de se connecter (en minutes)
var confCodeDuration = 10;

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

//ROUTE SUBMITMAIL
//Dans le parcours connexion/inscription, lorsque le user soumet son mail, on doit lui générer et envoyer un code de confirmation
router.post("/submitMail", async function (req, res, next) {
  let error = [];
  let result = false;
  let userId = "";
  let code = "";

  //deux propriétés attendues : isNew ("true" pour inscription / "false" pour sign-in) et mailFromFront
  if (!req.body.isNew) {
    error.push({
      code: 1,
      label: "précisez si l'utilisateur se connecte ou créée un compte",
    });
  }
  if (!req.body.mailFromFront) {
    error.push({ code: 2, label: "précisez un email" });
  }

  if (error.length == 0) {
    const data = await userModel.findOne({
      mail: req.body.mailFromFront,
    });

    if (req.body.isNew === "false" && !data) {
      error.push({
        code: 3,
        label: "l'utilisateur n'existe pas",
      }); /*il faudra afficher l'overlay pour confirmer la création de compte (RGPD)*/
    } else {
      //génération du code de confirmation et envoi par mail
      code = uniqid();

      if (req.body.isNew === "true" && !data) {
        var newUser = new userModel({
          mail: req.body.mailFromFront,
          code: code,
          codeExpDate: new Date(
            new Date().getTime() + confCodeDuration * 60000
          ),
        });

        let saveUser = await newUser.save();

        if (saveUser) {
          result = true;
          userId = saveUser.id;
        }
      } else {
        let saveUser = await userModel.updateOne(
          { mail: req.body.mailFromFront },
          {
            code: code,
            codeExpDate: new Date(
              new Date().getTime() + confCodeDuration * 60000
            ),
          }
        );

        if (saveUser) {
          result = true;
          userId = data.id;
        }
      }
    }
  }

  res.json({ result, error, userId, code });
});

//ROUTE SUBMITCONFIRMATIONCODE
router.post("/submitConfirmationCode", async function (req, res, next) {
  let error = [];
  let result = false;
  let userId = "";
  let newCode = "";

  if (!req.body.userIdFromFront || !req.body.confCodeFromFront) {
    error.push({ code: 1, label: "précisez les propriétés front" });
  }

  if (error.length == 0) {
    userId = req.body.userIdFromFront;
    code = req.body.confCodeFromFront;
    const user = await userModel.findById(userId);

    if (!user) {
      error.push({ code: 2, label: "l'utilisateur n'existe pas" });
    } else {
      if (user.code != code) {
        error.push({ code: 3, label: "Le code est incorrect" });
      } else {
        if (new Date() <= user.codeExpDate) {
          result = true;
        } else {
          let saveUser = await userModel.updateOne(
            { id: userId },
            {
              code: uniqid(),
              codeExpDate: new Date(
                new Date().getTime() + confCodeDuration * 60000
              ),
            }
          );
          if (saveUser) {
            //AJOUT MAIL A ENVOYER
            error.push({
              code: 4,
              label: "Code expiré. Nous vous avons renvoyé un mail",
            });
            newCode = saveUser.code;
          }
        }
      }
    }
  }
  res.json({ result, error, userId, newCode });
});

//SUPPRESSION USER - ATTENTION SI LE USER A DES PROFILS ENFANT DONT IL EST L'ADMIN + RELATED
router.delete("/Account/:userId", async function (req, res, next) {
  let error = [];
  let result = false;
  if (!req.params.userId) {
    push.error({ code: 1, label: "précisez un id" });
  } else {
    const data = await userModel.deleteOne({ id: req.params.userId });
    if (data) {
      result = true;
    }
  }
  res.json({ result, error });
});

//GET USER BY CODE
router.get("/getUserByCode", async function (req, res, next) {
  let error = [];
  let result = false;
  let userId = "";

  if (!req.query.codeFromFront) {
    error.push({ code: 1, label: "pas de code de vérification" });
  }
  var user = await userModel.find({ code: req.query.codeFromFront });

  if (user.length == 0) {
    error.push({
      code: 2,
      label: "aucun utilisateur ne correspond au code de vérification",
    });
  } else {
    userId = user[0]._id;
    result = true;
  }

  res.json({ result, userId, error });
});

module.exports = router;
