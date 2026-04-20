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
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Find the user
    const user = await User.findOne({ uid });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Prepare payload for External Daily Summary API
    // Convert Mongoose Map to plain object
    const oldSummaryObj = Object.fromEntries(user.summaryMap || new Map());

    const externalApiUrl = "https://stress-ai-service-n783.onrender.com/daily-summary";
    const externalPayload = {
      user_id: uid,
      date: today,
      messages: [
        {
          role: "user",
          content: body.userMessage || "",
          timestamp: now.toISOString()
        },
        {
          role: "assistant",
          content: aiResponse,
          timestamp: now.toISOString()
        }
      ],
      old_summary: oldSummaryObj
    };

    let updatedAnalysis = null;
    try {
      const extRes = await fetch(externalApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(externalPayload)
      });

      if (extRes.ok) {
        updatedAnalysis = await extRes.json();
      } else {
        console.error("External Daily Summary API failed:", await extRes.text());
      }
    } catch (err) {
      console.error("Error calling External Daily Summary API:", err);
    }

    // 3. Update User Record with cumulative data
    if (updatedAnalysis) {
      // Sync the summary map
      if (updatedAnalysis.summary) {
        Object.entries(updatedAnalysis.summary).forEach(([date, text]) => {
          user.summaryMap.set(date, text);
        });
      }
      
      user.dominantEmotion = updatedAnalysis.dominant_emotion || user.dominantEmotion;
      user.riskTrend = updatedAnalysis.risk_trend || user.riskTrend;
      
      // Update running average stress
      const currentAvg = user.avgStress || 0;
      const count = user.totalAnalysisCount || 0;
      const newScore = body.stressScore !== undefined ? body.stressScore : (updatedAnalysis.avg_stress || 0);
      
      user.avgStress = ((currentAvg * count) + newScore) / (count + 1);
      user.totalAnalysisCount = count + 1;

      await user.save();
    }

    // 4. Create a history record in Summary model (Still keep it for audit)
    const newSummary = await Summary.create({
      userId: user._id,
      aiResponse,
      stressLevel,
      legalAdvice: legalAdvice || ""
    });

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
