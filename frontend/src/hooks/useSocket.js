import { useEffect } from 'react';

export default function useSocket(token) {
  useEffect(() => {
    if (!token) return;
  }, [token]);
}
