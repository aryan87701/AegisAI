import  mongoose from "mongoose";

const summarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  aiResponse: {
    type: String,
    required: true,
    trim: true
  },

  stressLevel: {
    type: String,
    enum: ["low", "medium", "high"],
    required: true
  },

  legalAdvice: {
    type: String // AI can suggest steps if abuse detected
  }

}, {
  timestamps: true
});

const summaryModel = mongoose.model("Summary", summarySchema);

export default summaryModel;