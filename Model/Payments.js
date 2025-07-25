const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    merchantTransactionId: {
      type: String,
      required: true,
      unique: true,
    },

    paymentMethod: {
      type: String,
    },

    tax: {
      type: Number,
      default: 0,
    },

    addOnsAmount: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    amountPaid: {
      type: Number,
      default: 0,
    },

    pendingAmount: {
      type: Number,
      default: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    transactionTime: {
      type: Date,
      default: Date.now,
    },

    gatewayResponse: {
      code: { type: String },
      message: { type: String },
      raw: { type: mongoose.Schema.Types.Mixed },
    },
  },
  { timestamps: true }
);

const PaymentModel = mongoose.model("Payments", PaymentSchema);
module.exports = PaymentModel;
