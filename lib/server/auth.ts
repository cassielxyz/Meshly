import { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/security/crypto";

export class AuthError extends Error{constructor(){super("Unauthorized");this.name="AuthError";}}
export async function requireRequestUser(request:NextRequest){const token=request.cookies.get("meshly_session")?.value;if(!token)throw new AuthError();try{return await verifySessionToken(token);}catch{throw new AuthError();}}
