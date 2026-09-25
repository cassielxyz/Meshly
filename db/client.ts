import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let cached:ReturnType<typeof drizzle<typeof schema>>|undefined;
export function getDb(){if(cached)return cached;const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is required");const client=postgres(url,{prepare:false,max:5,ssl:process.env.NODE_ENV==="production"?"require":undefined});cached=drizzle(client,{schema});return cached;}
