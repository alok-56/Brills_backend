const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true,
  },
  roomType: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  maxOccupancy: { type: Number },
  bedType: { type: String },
  sizeSqm: { type: Number },
  amenities: [String],
  images: [
    {
      url: { type: String, required: true },
      caption: { type: String },
    },
  ],
  refundable: { type: Boolean, default: false },
  availability: { type: Number, default: 0 },
  roomno: [],
});

const Roommodal = mongoose.model("Rooms", RoomSchema);
module.exports = Roommodal;
