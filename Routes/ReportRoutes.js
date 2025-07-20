const express = require("express");
const Islogin = require("../Middleware/Islogin");
const {
  GetRoomOccupancyReport,
  getCounts,
  getRevenueVsBooking,
  getDailyBookings,
  getBookingSummary,
} = require("../Controller/Report");

const ReportRoutes = express.Router();

ReportRoutes.get("/room-occupancy", Islogin, GetRoomOccupancyReport);
ReportRoutes.get("/dashboard/counts", Islogin, getCounts);
ReportRoutes.get("/analytics/revenue-booking", Islogin, getRevenueVsBooking);
ReportRoutes.get("/room-analytics/daily-bookings", Islogin, getDailyBookings);
ReportRoutes.get("/booking-summary", Islogin, getBookingSummary);

module.exports = ReportRoutes;
