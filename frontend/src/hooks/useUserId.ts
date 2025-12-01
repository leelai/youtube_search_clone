import { useState, useEffect } from 'react';

const USER_ID_KEY = 'worlds_search_user_id';

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Custom hook to get or create a persistent user ID
 * Stores in localStorage for session persistence
 */
export function useUserId(): string {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Try to get existing user ID from localStorage
    let id = localStorage.getItem(USER_ID_KEY);
    
    // If not found, generate a new one
    if (!id) {
      id = generateUUID();
      localStorage.setItem(USER_ID_KEY, id);
    }
    
    setUserId(id);
  }, []);

  return userId;
}

