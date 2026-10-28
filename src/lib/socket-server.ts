// src/lib/socket-server.ts
import { Server as SocketIOServer } from 'socket.io';

// เก็บ Instance ของ Socket.io ไว้ใน globalThis เพื่อให้ Next.js API Routes เรียกใช้งานได้
declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

export type BookingRealtimePayload = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  attendeeCount: number;
  room: {
    id: string;
    name: string;
    colorCode: string;
    floor: string;
  };
  user: {
    id: string;
    name: string;
    department: string | null;
  };
};

export const SOCKET_EVENTS = {
  BOOKING_CREATED: 'booking:created',
  BOOKING_CANCELLED: 'booking:cancelled',
  MEETING_REMINDER: 'booking:reminder',
  NOTIFICATION_NEW: 'notification:new',
} as const;

/**
 * ส่ง Event แบบ Real-time ไปยังไคลเอนต์ทุกคนที่กำลังเปิดหน้า Calendar หรือ Dashboard
 */
export function emitRealtimeEvent<T>(event: string, payload: T, roomChannel?: string) {
  const io = globalThis.io;
  if (!io) {
    console.warn(`[Socket.io] Instance not initialized. Skipped emitting "${event}".`);
    return;
  }

  if (roomChannel) {
    io.to(roomChannel).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}
