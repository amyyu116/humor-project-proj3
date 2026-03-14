// c:\Users\amyyu\Downloads\S26 HW\humor-project-hw\app\login\page.tsx

"use client";

import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
    const supabase = createClient();

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                flexDirection: "column",
                gap: "20px",
            }}
        >
            <h1>Login</h1>
            <button
                onClick={signInWithGoogle}
                style={{
                    padding: "10px 20px",
                    fontSize: "16px",
                    cursor: "pointer",
                    backgroundColor: "#4285F4",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                }}
            >
                Sign in with Google
            </button>
        </div>
    );
}
