import { useEffect, useRef } from 'react';
import useChatStore from '../stores/useChatStore';

const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'; // Fallback to synthetic beep if invalid

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Configurar tono tipo "Pop/Ping" de WhatsApp
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.error('Web Audio API no soportada', e);
  }
}

export default function useTabNotification() {
  const unreadCounts = useChatStore(state => state.unreadCounts);
  const totalUnread = Object.values(unreadCounts).reduce((acc, curr) => acc + curr, 0);
  const totalUnreadRef = useRef(totalUnread);

  const originalTitle = useRef(document.title);
  const intervalRef = useRef(null);

  // Efecto para reproducir sonido SOLO cuando el número de mensajes no leídos incrementa
  useEffect(() => {
    if (totalUnread > totalUnreadRef.current) {
      playBeep();
    }
    totalUnreadRef.current = totalUnread;
  }, [totalUnread]);

  // Efecto para parpadear el título de la pestaña
  useEffect(() => {
    if (totalUnread > 0) {
      let isShowingAlert = false;

      intervalRef.current = setInterval(() => {
        if (isShowingAlert) {
          document.title = `(${totalUnread}) Nuevo mensaje...`;
        } else {
          document.title = originalTitle.current;
        }
        isShowingAlert = !isShowingAlert;
      }, 1000);

    } else {
      clearInterval(intervalRef.current);
      document.title = originalTitle.current;
    }

    return () => {
      clearInterval(intervalRef.current);
      document.title = originalTitle.current;
    };
  }, [totalUnread]);
}
