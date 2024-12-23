const express = require("express");
const mongoose = require("mongoose");
const userRouter = require("./routes/user");
const offerRouter = require("./routes/offer");

require("dotenv").config();
const cloudinary = require("cloudinary").v2; // On n'oublie pas le `.v2` à la fin

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const app = express();
app.use(express.json());
app.use(userRouter);
app.use(offerRouter);

mongoose.connect("mongodb://localhost:27017/Vinted");
app.get("/", (req, res) => {
  return res.status(200).json({ message: "Welcome to Vinted 😇" });
});
app.all("*", (req, res) => {
  return res.status(404).json({ error: "This route does not exist 🤔" });
});

app.listen(3000, () => {
  console.log("Server started 🚀");
});
