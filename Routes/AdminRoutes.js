const express = require("express");
const Adminroutes = express.Router();
const { check } = require("express-validator");

const Islogin = require("../Middleware/Islogin");
const {
  CreateAdmin,
  LoginAdmin,
  UpdateAdmin,
  GetAllAdmin,
  GetOwnProfile,
  GetAdminById,
  DeleteAdmin,
} = require("../Controller/Admin");

// Validation Middleware
const adminValidation = [
  check("Name").notEmpty().withMessage("Name is required"),
  check("Email").isEmail().withMessage("Valid email is required"),
  check("Password").notEmpty().withMessage("Password is required"),
  check("Permission").isArray().withMessage("Permission must be an array"),
];

// Login Validation
const loginValidation = [
  check("Email").isEmail().withMessage("Valid email is required"),
  check("Password").notEmpty().withMessage("Password is required"),
];

// Routes
Adminroutes.post("/register", adminValidation, CreateAdmin);
Adminroutes.post("/login", loginValidation, LoginAdmin);
Adminroutes.patch("/update/:id", Islogin, adminValidation, UpdateAdmin);
Adminroutes.get("/all", Islogin, GetAllAdmin);
Adminroutes.get("/profile", Islogin, GetOwnProfile);
Adminroutes.get("/:id", Islogin, GetAdminById);
Adminroutes.delete("/delete/:id", Islogin, DeleteAdmin);

module.exports = Adminroutes;
