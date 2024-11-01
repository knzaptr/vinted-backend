const express = require("express");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
const isAuthenticated = require("../middlewares/isAuthenticated");

const convertToBase64 = require("../utils/convertToBase64");
const cloudinary = require("cloudinary").v2;
const Offer = require("../models/Offer");

const router = express.Router();

const fields = {
  title: "product_name",
  description: "product_description",
  price: "product_price",
  condition: "ETAT",
};

/* Publier une annonce */
router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const { title, description, price, condition, city, brand, size, color } =
        req.body;

      if (
        !title ||
        !description ||
        !price ||
        !condition ||
        !city ||
        !brand ||
        !size ||
        !color ||
        !req.files.picture
      ) {
        return res.status(400).json("Veuillez remplir tous les champs 😠");
      }

      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: Number(price),
        product_details: [
          { ETAT: condition },
          { EMPLACEMENT: city },
          { MARQUE: brand },
          { TAILLE: size },
          { COULEUR: color },
        ],
        owner: req.user.id,
      });

      if (Array.isArray(req.files.picture)) {
        for (const image of req.files.picture) {
          const convertedPicture = convertToBase64(image);

          newOffer.product_image.push(
            await cloudinary.uploader.upload(convertedPicture, {
              folder: `vinted/offers/${newOffer.id}`,
            })
          );
        }
      } else {
        const convertedPicture = convertToBase64(req.files.picture);

        newOffer.product_image.push(
          await cloudinary.uploader.upload(convertedPicture, {
            folder: `vinted/offers/${newOffer.id}`,
          })
        );
      }

      await newOffer.save();

      return res.json(
        await Offer.find(newOffer).populate("owner", "account id")
      );
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/* Permettre aux créateurs des annonces de pouvoir les modifier */
router.put(
  "/offer/:offerId",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const offerToUpdate = await Offer.findOne({
        _id: req.params.offerId,
        owner: req.user.id,
      });

      const { title, description, price, condition, city, brand, size, color } =
        req.body;

      if (
        !title ||
        !description ||
        !price ||
        !condition ||
        !city ||
        !brand ||
        !size ||
        !color ||
        !req.files.picture
      ) {
        return res.status(400).json("Veuillez remplir tous les champs 😠");
      } else if (price === "0" || Number(price) > 100000) {
        return res
          .status(400)
          .json("Le prix doit être compris entre 1 et 100000 euros !");
      }

      offerToUpdate.product_name = title;
      offerToUpdate.product_description = description;
      offerToUpdate.product_price = Number(price);
      offerToUpdate.product_details = [
        { ETAT: condition },
        { EMPLACEMENT: city },
        { MARQUE: brand },
        { TAILLE: size },
        { COULEUR: color },
      ];

      await cloudinary.api.delete_resources_by_prefix(
        "vinted/offers/" + offerToUpdate.id
      );

      if (Array.isArray(req.files.picture)) {
        for (const image of req.files.picture) {
          const convertedPicture = convertToBase64(image);

          offerToUpdate.product_image.push(
            await cloudinary.uploader.upload(convertedPicture, {
              folder: `vinted/offers/${offerToUpdate.id}`,
            })
          );
        }
      } else {
        const convertedPicture = convertToBase64(req.files.picture);

        offerToUpdate.product_image.push(
          await cloudinary.uploader.upload(convertedPicture, {
            folder: `vinted/offers/${offerToUpdate.id}`,
          })
        );
      }
      console.log(offerToUpdate.product_details);

      await offerToUpdate.save();

      return res.json("modifier");
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/* Supprimer une annonce */
router.delete("/offer/:offerId", isAuthenticated, async (req, res) => {
  try {
    const offerToDelete = await Offer.findOne({
      _id: req.params.offerId,
      owner: req.user.id,
    });

    for (const image of offerToDelete.product_image) {
      cloudinary.api.delete_resources([image.public_id], {
        type: "upload",
        resource_type: "image",
      });
    }
    cloudinary.api.delete_folder("vinted/offers/" + req.params.offerId);
    await Offer.deleteOne(offerToDelete);

    return res.status(200).json("Supprimer!");
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/* Récupérer un tableau contenant l'ensemble des annonces */
router.get("/offers", async (req, res) => {
  try {
    let title = new RegExp(req.query.title, "i");
    let priceMin = req.query.priceMin || 0;
    let priceMax = req.query.priceMax || 100000;
    let page = req.query.page || 1;
    let sort = {};
    if (req.query.sort === "price-desc") {
      sort.product_price = "desc";
    } else if (req.query.sort === "price-asc") {
      sort.product_price = "asc";
    }

    console.log(sort);

    const filters = {
      product_name: title,
      product_price: { $lte: priceMax, $gte: priceMin },
    };

    const nbOfferPerPage = 2;
    let nbOfferToSkip = Number(nbOfferPerPage) * (page - 1);

    const offersToDisplay = await Offer.find(filters)
      .populate("owner", "account.username account.avatar.secure_url")
      .limit(nbOfferPerPage)
      .skip(nbOfferToSkip)
      .sort(sort);

    return res.status(200).json({
      count: await Offer.countDocuments(filters),
      offers: offersToDisplay,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/* Récupérer les détails concernant une annonce */
router.get("/offers/:offerId", async (req, res) => {
  try {
    return res
      .status(200)
      .json(
        await Offer.findById(req.params.offerId).populate(
          "owner",
          "account.username account.avatar"
        )
      );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
