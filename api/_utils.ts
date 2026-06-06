import { Agent } from 'undici';

/**
 * Shared undici Agent configured to force HTTP/1.1.
 * This resolves ALPN negotiation failures encountered with Cloudflare Tunnels
 * when using HTTP/2 in serverless environments.
 */
export const sharedAgent = new Agent({
  allowH2: false,
});
