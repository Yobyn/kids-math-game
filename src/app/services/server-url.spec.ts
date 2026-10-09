import { serverUrl } from './server-url';

describe('the game server\'s address', () => {
  it('is on the computer the game was opened from, so a phone on the Wi-Fi finds it too', () => {
    expect(serverUrl('/api/auth', { protocol: 'http:', hostname: 'localhost' })).toBe('http://localhost:3000/api/auth');
    expect(serverUrl('/api/auth', { protocol: 'http:', hostname: '192.168.1.23' })).toBe('http://192.168.1.23:3000/api/auth');
    expect(serverUrl('/api/progress', { protocol: 'http:', hostname: 'mypc.local' })).toBe('http://mypc.local:3000/api/progress');
  });

  it('writes an IPv6 address the way a URL needs it', () => {
    expect(serverUrl('/api/auth', { protocol: 'http:', hostname: '::1' })).toBe('http://[::1]:3000/api/auth');
  });

  it('follows the page in the test browser too: localhost', () => {
    expect(serverUrl('/api/auth')).toBe(`${window.location.protocol}//${window.location.hostname}:3000/api/auth`);
  });
});
