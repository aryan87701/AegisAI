import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    uid: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: "",
    },
    age: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      default: "",
    },
    maritalStatus: {
      type: String,
      default: "",
    },
    profilePicUrl: {
      type: String,
      default: "",
    },
    secretKey: {
      type: String,
      default: "",
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    trustedContacts: {
  type: [String],
  default: []
},
emergencyMessage: {
  type: String,
  default: "I need help. Please reach me."
}
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
