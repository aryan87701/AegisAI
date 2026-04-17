import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  messages: [
    {
      message: {
        type: String,
        required: true
      },

      sender: {
        type: String,
        enum: ["user", "bot"],
        required: true
      },

      emotion: String,

      isFlagged: {
        type: Boolean,
        default: false
      },

      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ]

}, {
  timestamps: true
});

const chatModel = mongoose.model("Chat", chatSchema);

export default chatModel;