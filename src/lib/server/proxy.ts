import type { RequestHandler } from '@sveltejs/kit';

const KITE_API_BASE = 'https://kite.kagi.com/api';

export function createProxy(endpoint: string): RequestHandler {
  return async ({ request, params, url }) => {
    try {
      // Build the target URL
      let targetPath = endpoint;
      
      // Replace route parameters
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          targetPath = targetPath.replace(`[${key}]`, String(value));
        });
      }
      
      // Append query parameters
      const targetUrl = new URL(`${KITE_API_BASE}${targetPath}`);
      url.searchParams.forEach((value, key) => {
        targetUrl.searchParams.append(key, value);
      });
      
      // Create proxy request with same method, headers, and body
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' 
          ? await request.blob() 
          : undefined
      });
      
      // Remove host header to avoid conflicts
      proxyRequest.headers.delete('host');
      
      // Make the request to kite.kagi.com
      const response = await fetch(proxyRequest);
      
      // Create a new headers object and remove problematic encoding headers
      const headers = new Headers(response.headers);
      headers.delete('content-encoding');
      headers.delete('transfer-encoding');
      
      // Read the response body as a buffer to ensure proper handling
      const body = await response.arrayBuffer();
      
      // Return the response with the same status and modified headers
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(JSON.stringify({ error: 'Proxy request failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

// Convenience functions for common HTTP methods
export const GET = (endpoint: string) => createProxy(endpoint);
export const POST = (endpoint: string) => createProxy(endpoint);
export const PUT = (endpoint: string) => createProxy(endpoint);
export const DELETE = (endpoint: string) => createProxy(endpoint);
export const PATCH = (endpoint: string) => createProxy(endpoint);