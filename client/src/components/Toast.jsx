import { useRef, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  };
  return [toast, showToast];
}

export default function Toast({ message }) {
  if (!message) return null;
  return <div className="app-toast">{message}</div>;
}
