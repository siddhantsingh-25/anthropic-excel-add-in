import { SHA256, enc } from "crypto-js";

function generateRandomString(length: number): string {
  const validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += validChars.charAt(randomValues[i] % validChars.length);
  }
  return result;
}

export function generateCodeVerifier(): string {
  return generateRandomString(128);
}

export function generateCodeChallenge(codeVerifier: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a SHA-256 hash of the code verifier
      const hash = SHA256(codeVerifier);

      // Convert the hash to base64
      const base64 = hash.toString(enc.Base64);

      // Convert base64 to base64url by replacing '+' with '-', '/' with '_', and stripping '='
      const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      resolve(base64url);
    } catch (err) {
      reject(err);
    }
  });
}
