import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Summary from "@/models/Response.model";

export async function generateSummaryForUser(uid: string, dateKey: string) {
  try {
    await dbConnect();
    const user = await User.findOne({ uid });
    if (!user) return null;

    // 1. Identify Today/Specific Day Window
    const targetDate = new Date(dateKey);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const activities = await Summary.find({
      userId: user._id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: 1 });

    if (activities.length === 0) return null;

    // 2. Prepare data for External AI
    const messages = activities.map(act => ({
      role: "assistant",
      content: act.aiResponse,
      timestamp: act.createdAt.toISOString()
    }));

    const oldSummaryObj = Object.fromEntries(user.summaryMap || new Map());
    
    const externalApiUrl = "https://stress-ai-service-n783.onrender.com/daily-summary";
    const payload = {
      user_id: user.uid,
      date: dateKey,
      messages: messages,
      old_summary: oldSummaryObj
    };

    const res = await fetch(externalApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.summary) {
        Object.entries(data.summary).forEach(([d, t]) => {
          user.summaryMap.set(d, t as string);
        });
        user.dominantEmotion = data.dominant_emotion || user.dominantEmotion;
        user.riskTrend = data.risk_trend || user.riskTrend;
        
        if (data.avg_stress !== undefined) {
          const currentAvg = user.avgStress || 0;
          const count = user.totalAnalysisCount || 0;
          user.avgStress = ((currentAvg * count) + data.avg_stress) / (count + 1);
          user.totalAnalysisCount = count + 1;
        }

        await user.save();
        return data;
      }
    }
  } catch (err) {
    console.error(`❌ [Internal] Error generating summary for ${uid}:`, err);
  }
  return null;
}

export async function generateAllUserSummaries() {
  console.log("🕒 [Cron] Starting Midnight Summary Generation...");
  try {
    await dbConnect();
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split("T")[0];

    const users = await User.find({});
    for (const user of users) {
      if (user.summaryMap && user.summaryMap.has(dateKey)) continue;
      await generateSummaryForUser(user.uid, dateKey);
    }
    console.log("🕒 [Cron] Midnight Summary Generation Completed.");
  } catch (error) {
    console.error("❌ [Cron] Fatal error in daily summary job:", error);
  }
}
