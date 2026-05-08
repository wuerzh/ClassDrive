import { describe, expect, it } from "vitest";
import { getPasswordComplexityError } from "@/utils/password-strength";

describe("password strength guard", () => {
  it("rejects very short and trivial sequence passwords", () => {
    expect(getPasswordComplexityError("12345")).toBe("密码至少 6 位");
    expect(getPasswordComplexityError("123456")).toBe("密码过于简单，请换一个不连续、不重复的密码");
    expect(getPasswordComplexityError("654321")).toBe("密码过于简单，请换一个不连续、不重复的密码");
    expect(getPasswordComplexityError("111111")).toBe("密码过于简单，请换一个不连续、不重复的密码");
    expect(getPasswordComplexityError("abcdef")).toBe("密码过于简单，请换一个不连续、不重复的密码");
  });

  it("allows numeric passwords that are not simple repeated or sequential values", () => {
    expect(getPasswordComplexityError("938271")).toBe("");
    expect(getPasswordComplexityError("520839")).toBe("");
  });
});
