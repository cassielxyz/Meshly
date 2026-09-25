import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({ok:true,service:"meshly-web",time:new Date().toISOString(),oauthConfigured:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_REDIRECT_URI),databaseConfigured:Boolean(process.env.DATABASE_URL)});}
