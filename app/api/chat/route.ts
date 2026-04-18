import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Chat from "@/models/Chats.model";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    await dbConnect();

    // 1. Find the user by Firebase UID
    const user = await User.findOne({ uid });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Find the chat record for this user
    const chat = await Chat.findOne({ userId: user._id });

    return NextResponse.json({ 
      messages: chat ? chat.messages : [] 
    });

  } catch (error: any) {
    console.error("GET /api/chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, message, sender, timestamp } = body;

    if (!uid || !message || !sender) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    // 1. Find the user
    const user = await User.findOne({ uid });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Update or Create the chat record
    const updatedChat = await Chat.findOneAndUpdate(
      { userId: user._id },
      { 
        $push: { 
          messages: { 
            message, 
            sender, 
            timestamp: timestamp ? new Date(timestamp) : new Date() 
          } 
        } 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, chat: updatedChat });

  } catch (error: any) {
    console.error("POST /api/chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
