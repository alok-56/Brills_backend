const mongoose = require("mongoose");

const HotelSchema = new mongoose.Schema(
  {
    hotelName: { type: String, required: true },
    propertyType: { type: String, required: true },
    brand: { type: String },

    description: { type: String, required: true },
    starRating: { type: Number, min: 1, max: 5 },
    languagesSpoken: [String],

    // Location Info
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    country: { type: String, required: true },
    postalCode: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    nearbyAttractions: [String],

    // Contact
    contactName: { type: String },
    email: { type: String },
    phone: { type: String },
    website: { type: String },

    // Facilities
    facilities: [String],
    accessibilityFeatures: [String],

    // Images
    images: {
      hotel: [{ url: String, caption: String }],
      rooms: [{ url: String, roomType: String }],
      facilities: [{ url: String, caption: String }],
      document: [{ url: String, caption: String }],
    },

    // Policies
    policies: {
      checkIn: { type: String },
      checkOut: { type: String },
      cancellationPolicy: { type: String },
      smokingPolicy: { type: String },
      petPolicy: { type: String },
      ageRestriction: { type: String },
      childrenPolicy: { type: String },
    },

    // Payment Info
    acceptedPaymentMethods: [String],
    currency: { type: String },
    taxDetails: {
      taxPercentage: { type: Number },
      taxIncluded: { type: Boolean },
    },

    // Safety
    covidMeasures: [String],
    fireSafety: { type: Boolean },
    firstAidKit: { type: Boolean },
    security24h: { type: Boolean },
  },
  { timestamps: true }
);

const HotelModel = mongoose.model("Hotel", HotelSchema);
module.exports = HotelModel;
