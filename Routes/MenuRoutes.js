const express = require("express");
const Islogin = require("../Middleware/Islogin");
const {
  createMenu,
  updateMenu,
  getAllMenus,
  deleteMenu,
} = require("../Controller/Menu");
const MenuRoutes = express.Router();

MenuRoutes.post("/create", Islogin, createMenu);
MenuRoutes.patch("/update/:id", Islogin, updateMenu);
MenuRoutes.get("/all", Islogin, getAllMenus);
MenuRoutes.delete("/:id", Islogin, deleteMenu);

module.exports = MenuRoutes;
