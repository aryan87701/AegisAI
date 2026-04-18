import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const { uid, contacts, message } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const user = await User.findOneAndUpdate(
      { uid },
      {
        trustedContacts: contacts,
        emergencyMessage: message
      },
      { new: true, upsert: true } // create if not exists
    );

    return NextResponse.json({
      success: true,
      user
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}