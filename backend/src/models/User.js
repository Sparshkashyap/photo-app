const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: false,
    },

    passwordHash: {
      type: String,
      required: false,
    },

    provider: {
      type: String,
      enum: [
        "local",
        "google",
        "facebook",
        "instagram",
      ],
      default: "local",
    },

    providerId: {
      type: String,
      default: null,
    },

    currentSessionId: {
      type: String,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.model("User", userSchema);