export async function importKey(base64Key) {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptMessage(key, nick, text) {
  const payload = JSON.stringify({ n: nick, t: text });
  const encoded = new TextEncoder().encode(payload);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptMessage(key, base64Ciphertext) {
  const combined = Uint8Array.from(atob(base64Ciphertext), (c) =>
    c.charCodeAt(0)
  );
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}
