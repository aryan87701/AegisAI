import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Summary from "@/models/Response.model";
import { generateSummaryForUser } from "@/lib/cron-handler";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, aiResponse, stressLevel, legalAdvice, triggerSummary } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing UID" }, { status: 400 });
    }

    await dbConnect();
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Find the user
    const user = await User.findOne({ uid });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let updatedAnalysis = null;
    
    // 2. Handle Manual Summary Trigger (Live Sync)
    if (triggerSummary) {
      updatedAnalysis = await generateSummaryForUser(uid, today);
    }

    // 3. Save individual message analysis (if provided)
    let newSummary = null;
    if (aiResponse && stressLevel) {
      newSummary = await Summary.create({
        userId: user._id,
        aiResponse,
        stressLevel,
        legalAdvice: legalAdvice || ""
      });

      // Update basic stress metrics even if not triggering full summary
      if (!triggerSummary) {
        const currentAvg = user.avgStress || 0;
        const count = user.totalAnalysisCount || 0;
        const newScore = body.stressScore !== undefined ? body.stressScore : 0;
        
        user.avgStress = ((currentAvg * count) + newScore) / (count + 1);
        user.totalAnalysisCount = count + 1;
        user.riskTrend = body.riskTrend || user.riskTrend;
        await user.save();
      }
    }

    return NextResponse.json({ 
      success: true, 
      summary: newSummary,
      cumulative: {
        summary: user.summaryMap,
        avgStress: user.avgStress,
        dominantEmotion: user.dominantEmotion,
        riskTrend: user.riskTrend
      }
    });

  } catch (error: any) {
    console.error("POST /api/chat/analysis error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
