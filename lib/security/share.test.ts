import { describe,expect,it } from "vitest";
import { createShareToken,hashSharePassword,hashShareToken,verifySharePassword } from "./share";
describe("share security",()=>{it("creates non-reversible token hashes",()=>{const token=createShareToken();expect(token.length).toBeGreaterThan(20);expect(hashShareToken(token)).not.toContain(token);});it("verifies password hashes",()=>{const hash=hashSharePassword("correct horse battery staple");expect(verifySharePassword("correct horse battery staple",hash)).toBe(true);expect(verifySharePassword("wrong",hash)).toBe(false);});});
