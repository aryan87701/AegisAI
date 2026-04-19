import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import MoodIndicator from "@/models/MoodIndicator.model";

const VALID_EMOJIS = ["😄", "🙂", "😐", "😕", "😢", "😭"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ uid });
    if (!user) {
      // ✅ Return empty data for new users — don't 404
      return NextResponse.json({
        counts: { "😄": 0, "🙂": 0, "😐": 0, "😕": 0, "😢": 0, "😭": 0 },
        history: [],
      });
    }

    const mood = await MoodIndicator.findOne({ userId: user._id }).lean();

    if (!mood) {
      return NextResponse.json({
        counts: { "😄": 0, "🙂": 0, "😐": 0, "😕": 0, "😢": 0, "😭": 0 },
        history: [],
      });
    }

    // ✅ Fix Bug 1: Filter last 30 days instead of slicing 50
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0); // start of day

    const recentHistory = (mood.history ?? [])
      .filter((entry: any) => new Date(entry.timestamp) >= thirtyDaysAgo)
      .map((entry: any) => ({
        emoji: entry.emoji,
        source: entry.source,
        timestamp: entry.timestamp,
      }));

    // ✅ Fix Bug 2: Safely serialize counts (handles Map or plain object)
    let counts: Record<string, number> = {
      "😄": 0, "🙂": 0, "😐": 0, "😕": 0, "😢": 0, "😭": 0
    };

    if (mood.counts) {
      // If it's a Mongoose Map, convert it
      const rawCounts = mood.counts instanceof Map
        ? Object.fromEntries(mood.counts)
        : mood.counts;

      for (const emoji of VALID_EMOJIS) {
        counts[emoji] = Number(rawCounts[emoji] ?? 0);
      }
    }

    return NextResponse.json({
      counts,
      history: recentHistory,
    });

  } catch (error: any) {
    console.error("GET /api/mood error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, emoji, source } = body;

    if (!uid || !emoji || !source) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!VALID_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    if (!["manual", "ai"].includes(source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ uid });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Fix Bug 3: Use $inc with escaped emoji key path
    const emojiKey = `counts.${emoji}`;

    const updatedMood = await MoodIndicator.findOneAndUpdate(
      { userId: user._id },
      {
        $inc: { [emojiKey]: 1 },
        $push: {
          history: {
            emoji,
            source,
            timestamp: new Date(),
          },
        },
      },
      {
        upsert: true,
        new: true,           // ✅ Keep new:true for now (returnDocument is Mongoose 7+)
        setDefaultsOnInsert: true,
      }
    );

    // Safely serialize the updated counts
    const rawCounts = updatedMood.counts instanceof Map
      ? Object.fromEntries(updatedMood.counts)
      : updatedMood.counts;

    const counts: Record<string, number> = {};
    for (const e of VALID_EMOJIS) {
      counts[e] = Number(rawCounts[e] ?? 0);
    }

    return NextResponse.json({ success: true, counts });

  } catch (error: any) {
    console.error("POST /api/mood error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}