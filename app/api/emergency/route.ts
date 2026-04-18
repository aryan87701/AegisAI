import { NextResponse } from "next/server";
import mongoose from "mongoose";
import twilio from "twilio";
import User from "@/models/User";

const client = twilio(
  process.env.TWILIO_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: Request) {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const { action, location, uid } = await req.json();
    console.log("EMERGENCY REQUEST:", { action, location, uid });

    const user = await User.findOne({ uid });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (action === "call") {
      return NextResponse.json({
        type: "call",
        number: "112"
      });
    }

    if (action === "sms") {
      const contacts = user.trustedContacts || [];
      console.log("USER CONTACTS:", contacts);
      const message =
        user.emergencyMessage ||
        "I may need help. Please check on me.";

      if (contacts.length === 0) {
        return NextResponse.json(
          { error: "No contacts saved" },
          { status: 400 }
        );
      }

      const finalMessage = `
${message}

📍 Location:
${location}
      `;

      for (const number of contacts) {
        await client.messages.create({
          body: finalMessage,
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: number
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}