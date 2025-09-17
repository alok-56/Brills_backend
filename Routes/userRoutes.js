const express = require("express");
const Islogin = require("../Middleware/Islogin");
const {
  GetAllUserHotels,
  GetUserHotelById,
  getAllUserRoomsByHotelid,
} = require("../Controller/User");
const { Getalllogs } = require("../Controller/Public");

const UserwebRoutes = express.Router();

UserwebRoutes.get("/hotels", GetAllUserHotels);
UserwebRoutes.get("/hotels/:id", GetUserHotelById);
UserwebRoutes.get("/logs", Islogin,Getalllogs);

module.exports = UserwebRoutes;
