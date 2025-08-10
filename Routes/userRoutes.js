const express = require("express");
const Islogin = require("../Middleware/Islogin");
const {
  GetAllUserHotels,
  GetUserHotelById,
  getAllUserRoomsByHotelid,
} = require("../Controller/User");

const UserwebRoutes = express.Router();

UserwebRoutes.get("/hotels", GetAllUserHotels);
UserwebRoutes.get("/hotels/:id", GetUserHotelById);

module.exports = UserwebRoutes;
