import { randomInt } from "node:crypto";

// Drive submission PINs: exactly 6 digits, shown as "482 915" (two boxes of 3).
export const PIN_LENGTH = 6;

// Students may type spaces or hyphens between the groups; drop everything
// that is not a digit before checking.
export function normalisePin(input: string): string {
  return input.replace(/\D/g, "");
}

export function isPinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

// "482915" -> "482 915"
export function formatPin(pin: string): string {
  return `${pin.slice(0, 3)} ${pin.slice(3)}`;
}

// For the admin side. Leading zeros are allowed ("004211").
// The caller retries on a unique-constraint clash.
export function generatePin(): string {
  return String(randomInt(0, 10 ** PIN_LENGTH)).padStart(PIN_LENGTH, "0");
}

// The one rule for whether a PIN opens its drive: the drive is open and the
// admin has the PIN switched on. A closed drive never accepts its PIN.
export function pinOpensDrive(drive: {
  status: "DRAFT" | "OPEN" | "CLOSED";
  pinEnabled: boolean;
  submissionPin: string | null;
}): boolean {
  return (
    drive.status === "OPEN" && drive.pinEnabled && drive.submissionPin !== null
  );
}
