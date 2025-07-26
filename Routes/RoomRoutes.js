const express = require("express");
const { check } = require("express-validator");
const Islogin = require("../Middleware/Islogin");
const {
  createRoom,
  getAllRooms,
  searchAvailableRoomTypes,
  getRoomById,
  updateRoom,
  deleteRoom,
  getAvailableRoomNumbers,
} = require("../Controller/Rooms");

const Roomroutes = express.Router();

// Validation middleware for creating/updating room
const roomValidation = [
  check("hotelId").notEmpty().withMessage("Hotel ID is required"),
  check("roomType").notEmpty().withMessage("Room type is required"),
  check("price").isNumeric().withMessage("Price must be a number"),
  check("availability")
    .isInt({ min: 0 })
    .withMessage("Availability must be a non-negative integer"),
];

// Routes
Roomroutes.post("/create", Islogin, roomValidation, createRoom);
Roomroutes.get("/all", Islogin, getAllRooms);
Roomroutes.get("/search", searchAvailableRoomTypes);
Roomroutes.get("/:id", Islogin, getRoomById);
Roomroutes.patch("/update/:id", Islogin, updateRoom);
Roomroutes.delete("/delete/:id", Islogin, deleteRoom);
Roomroutes.get("/available/room", Islogin, getAvailableRoomNumbers);

module.exports = Roomroutes;
