const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    Number: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const Usermodel = mongoose.model("Users", UserSchema);
module.exports = Usermodel;
