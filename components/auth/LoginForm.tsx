"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";

import {
    Card,
    CardContent,
    CardHeader,
    CardDescription,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const schema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginForm() {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { isSubmitting, errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        const auth = getAuth(app);

        try {
            await signInWithEmailAndPassword(auth, data.email, data.password);
            router.push("/dashboard");
        } catch (error: unknown) {
            console.error("Error signing in", error);
            alert("Error signing in: " + (error as Error).message);
        }
    };

    return (
        <Card className="w-full border-zinc-200/50 shadow-sm">
            <CardHeader>
                <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
                <CardDescription>
                    Enter your email and password to access your account.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email"
                            type="email"
                            placeholder="name@example.com" 
                            {...register("email")} 
                            className="border-zinc-200 bg-white"
                        />
                        {errors.email && (
                            <p className="text-sm text-red-500 font-medium">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                            id="password"
                            type="password"
                            placeholder="Enter your password" 
                            {...register("password")} 
                            className="border-zinc-200 bg-white"
                        />
                        {errors.password && (
                            <p className="text-sm text-red-500 font-medium">{errors.password.message}</p>
                        )}
                    </div>

                    <Button 
                        type="button"
                        onClick={handleSubmit(onSubmit)}
                        className="w-full bg-[#B21563] hover:bg-[#911050] text-[#f4f4f5] font-medium shadow-sm transition-all" 
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Signing in..." : "Login"}
                    </Button>
                </form>
            </CardContent>

            <CardFooter className="justify-center text-sm text-zinc-500 pt-2 border-t border-zinc-100">
                Don&apos;t have an account?
                <button
                    onClick={() => router.push("/authpage?mode=signup")}
                    className="ml-1 font-medium text-zinc-900 hover:underline"
                >
                    Sign up
                </button>
            </CardFooter>
        </Card>
    );
}
