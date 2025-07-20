const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    menuname: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    isavailable:{
      type:Boolean,
      default:true
    },
    Category:{
       type: String,
      
    }
  },
  { timestamps: true }
);

const Menumodel = mongoose.model("Menu", MenuSchema);
module.exports = Menumodel;
