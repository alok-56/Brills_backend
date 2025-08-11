const { validationResult } = require("express-validator");
const AppErr = require("../Helper/AppError");
const contactmodel = require("../Model/Contactus");
const B2BContact = require("../Model/B2B");

const CreateContactUs = async (req, res, next) => {
  try {
    const err = validationResult(req);
    if (!err.isEmpty()) {
      return next(new AppErr(err.errors[0].msg, 403));
    }

    const { name, email, phone, subject, message } = req.body;

    const newContact = await contactmodel.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    return res.status(201).json({
      status: true,
      code: 200,
      message: "Message submitted successfully",
      data: newContact,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

const GetAllContactUs = async (req, res, next) => {
  try {
    const contacts = await contactmodel.find().sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Messages fetched successfully",
      data: contacts,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// Create a new B2B Contact
const createB2BContact = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: errors.array()[0].msg,
      });
    }

    const newContact = await B2BContact.create(req.body);

    return res.status(201).json({
      status: true,
      code: 201,
      message: "B2B contact created successfully",
      data: newContact,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      code: 500,
      message: error.message,
    });
  }
};

// Get all B2B Contacts
const getAllB2BContacts = async (req, res) => {
  try {
    const contacts = await B2BContact.find().sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      code: 200,
      message: "B2B contacts fetched successfully",
      data: contacts,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      code: 500,
      message: error.message,
    });
  }
};

module.exports = {
  CreateContactUs,
  GetAllContactUs,
  createB2BContact,
  getAllB2BContacts,
};
