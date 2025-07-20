const express = require("express");
const Hotelroutes = express.Router();
const { check } = require("express-validator");
const Islogin = require("../Middleware/Islogin");
const {
  CreateHotel,
  UpdateHotel,
  GetAllHotels,
  GetHotelById,
  DeleteHotel,
} = require("../Controller/Hotel");

const hotelValidation = [
  check("hotelName").notEmpty().withMessage("Hotel name is required"),
  check("propertyType").notEmpty().withMessage("Property type is required"),
  check("description").notEmpty().withMessage("Description is required"),
  check("address").notEmpty().withMessage("Address is required"),
  check("city").notEmpty().withMessage("City is required"),
  check("country").notEmpty().withMessage("Country is required"),
];

// Routes
Hotelroutes.post("/create", Islogin, hotelValidation, CreateHotel);
Hotelroutes.patch("/update/:id", Islogin, UpdateHotel);
Hotelroutes.get("/all", Islogin, GetAllHotels);
Hotelroutes.get("/:id", Islogin, GetHotelById);
Hotelroutes.delete("/:id", Islogin, DeleteHotel);

module.exports = Hotelroutes;
