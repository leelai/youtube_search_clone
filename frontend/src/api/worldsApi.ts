import type { World } from '../types';

// API base URL - uses Vite proxy in development, direct URL in production
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetch a world by ID
 */
export async function getWorld(id: string): Promise<World> {
  const response = await fetch(`${API_BASE}/api/worlds/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('World not found');
    }
    throw new Error(`Failed to fetch world: ${response.statusText}`);
  }

  return response.json();
}
