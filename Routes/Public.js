const express = require("express");
const { body } = require("express-validator");
const {
  CreateContactUs,
  GetAllContactUs,
  createB2BContact,
  getAllB2BContacts,
} = require("../Controller/Public");

const publicrouter = express.Router();

publicrouter.post(
  "/contact-us",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
  ],
  CreateContactUs
);

publicrouter.get("/contact-us", GetAllContactUs);

publicrouter.post(
  "/b2b",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("companyName").notEmpty().withMessage("Company name is required"),
  ],
  createB2BContact
);

publicrouter.get("/b2b", getAllB2BContacts);

module.exports = publicrouter;
