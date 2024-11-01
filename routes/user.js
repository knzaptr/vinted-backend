const express = require("express");
const mongoose = require("mongoose");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

const User = require("../models/User");

const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const convertToBase64 = require("../utils/convertToBase64");

const router = express.Router();

/* Sign Up */
router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      return res
        .status(409)
        .json({ message: "This e-mail address is already in use 🤔" });
    } else if (!req.body.username || !req.body.email || !req.body.password) {
      return res.status(400).json({ message: "Missing parameter 😗" });
    }

    const convertedPicture = convertToBase64(req.files.picture);

    const password = req.body.password;
    const salt = uid2(16);
    const hash = SHA256(password + salt).toString(encBase64);
    const token = uid2(64);

    const newUser = new User({
      email: req.body.email,
      account: {
        username: req.body.username,
      },
      newsletter: req.body.newsletter,
      token: token,
      hash: hash,
      salt: salt,
    });

    await newUser.save();

    newUser.account.avatar = await cloudinary.uploader.upload(
      convertedPicture,
      {
        folder: `vinted/users/${newUser.id}`,
      }
    );

    await newUser.save();

    return res.status(201).json({
      _id: newUser._id,
      token: newUser.token,
      account: newUser.account,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/* Log In */
router.post("/user/login", async (req, res) => {
  try {
    const userLogin = await User.findOne({ email: req.body.email });

    if (!userLogin) {
      return res
        .status(400)
        .json({ message: "No account at this e-mail address 🤔" });
    }

    const hashToCompare = SHA256(req.body.password + userLogin.salt).toString(
      encBase64
    );

    if (hashToCompare === userLogin.hash) {
      return res.status(200).json({
        _id: newUser._id,
        token: newUser.token,
        account: newUser.account,
      });
    } else {
      return res.status(400).json({ message: "The password is incorrect 🤔" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
