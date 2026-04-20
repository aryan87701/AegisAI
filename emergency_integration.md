# Emergency Integration Guide: Cumulative Summary System

This document explains how to fetch and use the cumulative emotional wellbeing summary for the emergency SMS system.

## Data Source
The summary data is stored in the `User` model in MongoDB and is updated after every chat message.

### MongoDB Schema Fields (User Model)
- `summaryMap`: A Map (Object) where keys are dates (`YYYY-MM-DD`) and values are the summaries for that day.
- `dominantEmotion`: The user's most frequent emotional state.
- `avgStress`: Current average stress score (0-100).
- `riskTrend`: The trajectory of the user's stress (e.g., "Increasing", "Stable").

## How to Fetch the Data

### 1. From the Backend (Node.js/Next.js)
If you are working in an API route, fetch the user by their UID:

```javascript
import User from "@/models/User";

const user = await User.findOne({ uid: "user_uid_here" });
const summaryMap = user.summaryMap; // This is a Map
const latestDate = Object.keys(Object.fromEntries(summaryMap)).sort().reverse()[0];
const latestSummary = summaryMap.get(latestDate);
```

### 2. From the Frontend
The summary is available in the `userRecord` object if you are inside a component that receives it (like the Dashboard).

## Formatting for SMS
When sending an emergency SMS, you can format the data like this:

```javascript
const message = `
🚨 AEGIS AI EMERGENCY ALERT
User: ${user.name}
Latest Summary (${latestDate}): ${latestSummary}
Overall Mood: ${user.dominantEmotion}
Stress Level: ${user.avgStress.toFixed(0)}%
Trend: ${user.riskTrend}
`.trim();
```

## AI Service Synchronization
The summary is automatically synchronized with the AI service at:
`POST https://stress-ai-service-n783.onrender.com/daily-summary`

Your teammate (the one handling this part) has ensured that this endpoint returns the updated `summary` map, which our backend then persists.

---
**Note**: If you need to trigger a manual summary refresh, you can call the `/api/chat/analysis` endpoint with the latest message logs.
