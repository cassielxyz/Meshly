import { NextRequest, NextResponse } from "next/server";
export async function POST(request:NextRequest){const response=NextResponse.redirect(new URL("/login",request.url),303);response.cookies.set("meshly_session","",{path:"/",maxAge:0,httpOnly:true});return response;}
