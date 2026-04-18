"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import EvidenceSection from "@/components/dashboard/EvidenceSection";
import ChatbotSection from "@/components/dashboard/ChatbotSection";

interface UserRecord {
    name?: string;
    profilePicUrl?: string;
    secretKey?: string;
    isProfileComplete?: boolean;
}

export default function DashboardPage() {
    const router = useRouter();
    const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [enteredKey, setEnteredKey] = useState("");
    const [keyError, setKeyError] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        const auth = getAuth(app);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/authpage");
                return;
            }

            try {
                // 🔥 GET TOKEN
                const token = await user.getIdToken();

                const res = await fetch("/api/auth/me", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error("Failed to fetch user");

                const data = await res.json();

                if (!data.user.isProfileComplete) {
                    router.push("/profile");
                    return;
                }

                setUserRecord(data.user);

                if (data.user.secretKey) {
                    setShowKeyModal(true);
                }
            } catch (error) {
                console.error(error);
                router.push("/authpage");
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleVerifyKey = () => {
        if (userRecord && enteredKey === userRecord.secretKey) {
            setShowKeyModal(false);
        } else {
            setKeyError(true);
        }
    };

    const handleLogout = async () => {
        const auth = getAuth(app);
        await signOut(auth);
        router.push("/authpage");
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                Loading Dashboard...
            </div>
        );
    }

    if (!userRecord) return null;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

            {/* SECRET KEY MODAL */}
            <Dialog open={showKeyModal}>
                <DialogContent className="sm:max-w-md [&>button]:hidden">
                    <DialogHeader>
                        <DialogTitle>Authentication Required</DialogTitle>
                        <DialogDescription>
                            Enter your secret key
                        </DialogDescription>
                    </DialogHeader>

                    <Input
                        type="password"
                        value={enteredKey}
                        onChange={(e) => {
                            setEnteredKey(e.target.value);
                            setKeyError(false);
                        }}
                        placeholder="Secret key"
                        className={keyError ? "border-red-500" : ""}
                    />

                    {keyError && <p className="text-red-500">Wrong key</p>}

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={handleLogout}>
                            Logout
                        </Button>
                        <Button onClick={handleVerifyKey}>
                            Verify
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* HEADER */}
            <header className="flex justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={userRecord.profilePicUrl} />
                        <AvatarFallback>
                            {userRecord.name?.charAt(0) || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="font-bold">AegisAI</h1>
                        <p className="text-sm">Welcome {userRecord.name}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={() =>
                            setTheme(theme === "dark" ? "light" : "dark")
                        }
                    >
                        {theme === "dark" ? <Sun /> : <Moon />}
                    </Button>

                    <Button onClick={handleLogout}>Logout</Button>
                </div>
            </header>

            {/* TABS */}
            <Tabs defaultValue="evidence">
                <TabsList>
                    <TabsTrigger value="evidence">Evidence</TabsTrigger>
                    <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
                </TabsList>

                <TabsContent value="evidence">
                    <EvidenceSection />
                </TabsContent>

                <TabsContent value="chatbot">
                    <ChatbotSection />
                </TabsContent>
            </Tabs>
        </div>
    );
}