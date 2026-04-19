import mongoose from "mongoose";

const moodEntrySchema = new mongoose.Schema(
  {
    emoji:     { type: String, required: true },
    source:    { type: String, enum: ["manual", "ai"], required: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    _id: false, // ✅ No _id per history entry — saves space + avoids issues
  }
);

const moodIndicatorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // ✅ Use Map type — handles emoji keys safely in MongoDB
    // Accessed as: mood.counts.get("😄") in Mongoose
    // Serialized as plain object in .lean() or .toJSON()
    counts: {
      type: Map,
      of: Number,
      default: () => ({
        "😄": 0,
        "🙂": 0,
        "😐": 0,
        "😕": 0,
        "😢": 0,
        "😭": 0,
      }),
    },

    history: {
      type: [moodEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Index for fast date-range history queries
moodIndicatorSchema.index({ userId: 1, "history.timestamp": -1 });

const MoodIndicator =
  mongoose.models.MoodIndicator ||
  mongoose.model("MoodIndicator", moodIndicatorSchema);

export default MoodIndicator;