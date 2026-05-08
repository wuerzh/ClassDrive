const weakPasswordMessage = "密码过于简单，请换一个不连续、不重复的密码";

const commonTrivialPasswords = new Set([
  "000000",
  "111111",
  "123123",
  "123456",
  "1234567",
  "12345678",
  "654321",
  "abcdef",
  "abc123",
  "password",
  "qwerty",
]);

function isRepeatedValue(value: string): boolean {
  const chars = Array.from(value);
  return chars.length > 1 && chars.every((char) => char === chars[0]);
}

function isSingleStepSequence(value: string): boolean {
  const chars = Array.from(value.toLowerCase());
  if (chars.length < 3) {
    return false;
  }
  const codePoints = chars.map((char) => char.codePointAt(0) ?? 0);
  const firstStep = codePoints[1] - codePoints[0];
  if (Math.abs(firstStep) !== 1) {
    return false;
  }
  return codePoints.every((codePoint, index) => index === 0 || codePoint - codePoints[index - 1] === firstStep);
}

export function getPasswordComplexityError(password: string): string {
  const trimmed = password.trim();
  if (Array.from(trimmed).length < 6) {
    return "密码至少 6 位";
  }
  const normalized = trimmed.toLowerCase();
  if (commonTrivialPasswords.has(normalized) || isRepeatedValue(trimmed) || isSingleStepSequence(trimmed)) {
    return weakPasswordMessage;
  }
  return "";
}
