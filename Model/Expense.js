const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    expenseName: {
      type: String,
      required: true,
    },

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },

    category: {
      type: String,
      enum: [
        "Utilities",
        "Maintenance",
        "Salaries",
        "Supplies",
        "Marketing",
        "Transportation",
        "Rent",
        "Other",
      ],
      default: "Other",
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank Transfer", "Card", "UPI", "Cheque"],
      default: "Cash",
    },

    expenseDate: {
      type: Date,
      required: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
      required: true,
    },

    notes: {
      type: String,
    },

    attachmentUrl: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Approved",
    },
  },
  { timestamps: true }
);

const ExpenseModel = mongoose.model("Expense", ExpenseSchema);
module.exports = ExpenseModel;
