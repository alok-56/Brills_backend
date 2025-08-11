const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },

    roomId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rooms",
        required: true,
      },
    ],

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    number: {
      type: Number,
    },

    userInfo: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String },
        age: { type: Number },
        gender: { type: String },
      },
    ],

    guests: {
      adults: { type: Number, required: true },
      children: { type: Number, default: 0 },
    },

    checkInDate: {
      type: Date,
      required: true,
    },

    checkOutDate: {
      type: Date,
      required: true,
    },

    stayDuration: {
      type: Number,
    },

    bookingType: {
      type: String,
      enum: ["Online", "Offline", "Agent"],
      default: "Online",
    },

    addOns: [
      {
        serviceName: String,
        cost: Number,
      },
    ],
    bookingsource: {
      type: String,
      enum: [
        "walkin",
        "website",
        "booking.com",
        "agoda",
        "expedia",
        "makemytrip",
        "oyo",
      ],
    },

    couponCode: { type: String },
    discountAmount: { type: Number, default: 0 },

    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    pendingAmount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },

    paymentDetails: {
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payments",
      },
      method: { type: String },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
    },

    status: {
      type: String,
      enum: [
        "collectPayment",
        "assignRoom",
        "pending",
        "cancelled",
        "failed",
        "booked",
        "checkin",
        "checkout",
        "noshow",
      ],
      default: "pending",
    },

    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    RoomNo: [],
    cancellation: {
      isCancelled: { type: Boolean, default: false },
      cancelledBy: { type: String },
      cancelDate: { type: Date },
      cancelFee: { type: Number, default: 0 },
      refundAmount: { type: Number, default: 0 },
      refundStatus: {
        type: String,
        enum: ["pending", "refunded", "not_applicable"],
        default: "not_applicable",
      },
    },
  },
  { timestamps: true }
);

const BookingModel = mongoose.model("Booking", BookingSchema);
module.exports = BookingModel;
