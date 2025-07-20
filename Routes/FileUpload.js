const express = require("express");
const { body } = require("express-validator");
const Islogin = require("../Middleware/Islogin");
const upload = require("../Middleware/FileUpload");
const {
  Uploadsingle,
  Uploadmultiple,
  deleteImageFromCloudinary,
} = require("../Controller/FileUpload/file");
const FileRouter = express.Router();

FileRouter.post("/single", upload.single("Image"), Islogin, Uploadsingle);

FileRouter.post(
  "/multiple",
  upload.fields([{ name: "Image", maxCount: 30 }]),
  Islogin,
  Uploadmultiple
);

FileRouter.delete("/delete", Islogin, deleteImageFromCloudinary);

module.exports = FileRouter;
