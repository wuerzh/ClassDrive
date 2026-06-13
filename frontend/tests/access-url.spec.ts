import { describe, expect, it } from "vitest";
import { formatAccessUrl } from "@/utils/access-url";

describe("formatAccessUrl", () => {
  it("uses http by default for the packaged local server", () => {
    expect(formatAccessUrl("192.168.1.24", "80")).toBe("http://192.168.1.24/");
    expect(formatAccessUrl("192.168.1.24", "777")).toBe("http://192.168.1.24:777/");
  });

  it("preserves https when the current page is served over https", () => {
    expect(formatAccessUrl("classdrive.example.edu", "443", "https:")).toBe("https://classdrive.example.edu/");
    expect(formatAccessUrl("classdrive.example.edu", "8443", "https:")).toBe("https://classdrive.example.edu:8443/");
  });
});
