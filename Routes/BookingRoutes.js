const express = require("express");
const {
  BookRoom,
  OfflineBooking,
  GetBooking,
  GetBookingById,
  UpdateBookingstatus,
  GetPayment,
  GetPaymentById,
  ValidatePayment,
  CreateAddons,
  UpdateAddon,
  DeleteAddon,
  GetBookingStatusHistory,
  GetBookingByMerchantTransactionId,
  GetMyBooking,
} = require("../Controller/Booking");
const Islogin = require("../Middleware/Islogin");
const BookingRoutes = express.Router();

// Booking Routes
BookingRoutes.get("/mybooking", GetMyBooking);
BookingRoutes.post("/create", BookRoom);
BookingRoutes.post("/offline", Islogin, OfflineBooking);
BookingRoutes.get("/", Islogin, GetBooking);
BookingRoutes.get("/status-history", Islogin, GetBookingStatusHistory);
BookingRoutes.get("/:id", Islogin, GetBookingById);
BookingRoutes.patch("/update-status", Islogin, UpdateBookingstatus);


// Payment Routes
BookingRoutes.get("/payment/all", Islogin, GetPayment);
BookingRoutes.get("/payment/:id", Islogin, GetPaymentById);
BookingRoutes.get("/payment/validate/:merchantTransactionId", ValidatePayment);
BookingRoutes.get(
  "/check/:merchantTransactionId",
  GetBookingByMerchantTransactionId
);

// Addon Routes
BookingRoutes.post("/:bookingId/addon", Islogin, CreateAddons);
BookingRoutes.put("/:bookingId/addon", Islogin, UpdateAddon);
BookingRoutes.delete("/:bookingId/addon", Islogin, DeleteAddon);

module.exports = BookingRoutes;
