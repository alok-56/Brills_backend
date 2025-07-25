const mongoose = require("mongoose");

const CashSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["booking", "expense"],
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

const Cashmodel = mongoose.model("Cash", CashSchema);
module.exports = Cashmodel;
