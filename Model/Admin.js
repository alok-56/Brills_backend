const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    Name: {
      type: String,
      required: true,
    },
    Email: {
      type: String,
      required: true,
      unique: true,
    },
    Password: {
      type: String,
      required: true,
    },
    Hotel: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Hotel",
    },
    Permission: {
      type: [],
      required: true,
    },
    Blocked: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true }
);

const Adminmodel = mongoose.model("Admin", AdminSchema);
module.exports = Adminmodel;
