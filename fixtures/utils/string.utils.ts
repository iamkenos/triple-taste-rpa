export const EscapeSequence = {
  LF: ["\n", "[KC_LF]"],
  CR: ["\r", "[KC_CR]"],
  QT: ["'", "[KC_QT]"],
  DBQT: ["\"", "[KC_DBQT]"]
};

export function escapeJsonRestricted(str: string): string {
  for (const [char, replacement] of Object.values(EscapeSequence)) {
    str = str.replaceAll(char, replacement);
  }
  return str;
}

export function unescapeJsonRestricted(str: string): string {
  for (const [char, replacement] of Object.values(EscapeSequence)) {
    str = str.replaceAll(replacement, char);
  }
  return str;
}
