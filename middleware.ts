import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next (static files)
         * - favicon
         * - images
         * - Supabase auth
         */
        "/((?!_next/static|_next/image|favicon.ico|auth/v1).*)",
    ],
};
