import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Summary from "@/models/Response.model";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, aiResponse, stressLevel, legalAdvice } = body;

    if (!uid || !aiResponse || !stressLevel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    // 1. Find the user
    const user = await User.findOne({ uid });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Create a new analysis summary record
    const newSummary = await Summary.create({
      userId: user._id,
      aiResponse,
      stressLevel,
      legalAdvice: legalAdvice || ""
    });

    return NextResponse.json({ success: true, summary: newSummary });

  } catch (error: any) {
    console.error("POST /api/chat/analysis error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
