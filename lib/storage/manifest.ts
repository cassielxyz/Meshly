import { z } from "zod";

export const chunkSchema=z.object({part:z.number().int().nonnegative(),accountId:z.string().min(1),driveFileId:z.string().min(1),offset:z.number().int().nonnegative(),size:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/i)});
export const manifestSchema=z.object({version:z.literal(1),fileId:z.string().min(1),name:z.string().min(1),logicalPath:z.string().min(1),size:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/i),chunks:z.array(chunkSchema).min(1)}).superRefine((value,ctx)=>{const chunks=[...value.chunks].sort((a,b)=>a.part-b.part);let cursor=0;for(let i=0;i<chunks.length;i++){const c=chunks[i];if(c.part!==i)ctx.addIssue({code:"custom",message:"Chunk part indexes must be contiguous"});if(c.offset!==cursor)ctx.addIssue({code:"custom",message:"Chunk offsets must be contiguous"});cursor+=c.size;}if(cursor!==value.size)ctx.addIssue({code:"custom",message:"Chunk sizes must equal logical file size"});});
export type MeshlyManifest=z.infer<typeof manifestSchema>;
export function validateManifest(input:unknown){return manifestSchema.parse(input);}
