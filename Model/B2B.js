const mongoose = require("mongoose");

const B2BContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    companyName: { type: String, required: true },
    companyWebsite: { type: String },
    subject: { type: String },
    message: { type: String },
    industry: { type: String },
    companySize: { type: String },
  },
  { timestamps: true }
);

const B2BContact = mongoose.model("B2BContact", B2BContactSchema);
module.exports = B2BContact;
