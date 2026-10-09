/** Where the game's own server answers: npm start in server/, on port 3000. */
export const SERVER_PORT = 3000;

/**
 * The server's address, on the same computer the game was opened from. On
 * the computer itself that is localhost; on a phone that opened the game at
 * http://192.168.1.23:4200/ it is 192.168.1.23. A fixed "localhost" sent a
 * phone looking for the server on the phone itself, so signing in from a
 * phone on the home Wi-Fi (npm run play:network) could never work.
 */
export function serverUrl(path: string, place: { protocol: string; hostname: string } = window.location): string {
  // An IPv6 address goes in brackets in a URL: http://[::1]:3000
  const host = place.hostname.includes(':') ? `[${place.hostname}]` : place.hostname;
  return `${place.protocol}//${host}:${SERVER_PORT}${path}`;
}
