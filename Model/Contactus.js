const mongoose = require("mongoose");

const ContactUsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    subject: {
      type: String,
    },
    message: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const contactmodel = mongoose.model("ContactUs", ContactUsSchema);
module.exports = contactmodel;
