// src/hooks/useRealtimeBookings.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { CalendarBookingItem } from '@/components/calendar/RoomTimelineCalendar';

export type RealtimeToastType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'MEETING_REMINDER';

export interface RealtimeToastItem {
  id: string;
  type: RealtimeToastType;
  title: string;
  message: string;
  roomName?: string;
  startTime?: string;
  minutesLeft?: number;
  createdAt: Date;
  isRead: boolean;
}

interface UseRealtimeBookingsOptions {
  currentUserId: string;
  selectedDate: string;
  initialBookings?: CalendarBookingItem[];
}

export function useRealtimeBookings({
  currentUserId,
  selectedDate,
  initialBookings = [],
}: UseRealtimeBookingsOptions) {
  const [bookings, setBookings] = useState<CalendarBookingItem[]>(initialBookings);
  const [toasts, setToasts] = useState<RealtimeToastItem[]>([]);
  const [notifications, setNotifications] = useState<RealtimeToastItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>('default');

  // เก็บ ID ของการประชุมที่แจ้งเตือนล่วงหน้า 15 นาทีไปแล้ว เพื่อไม่ให้แจ้งเตือนซ้ำ
  const remindedBookingIdsRef = useRef<Set<string>>(new Set());

  // 1. ตรวจสอบและขอสิทธิ์ Web Push / Browser Notification
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const requestPushPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    return permission;
  }, []);

  // ฟังก์ชันยิง Native Browser Notification (แสดงแม้ผู้ใช้สลับแท็บไปหน้าอื่น)
  const triggerBrowserNotification = useCallback(
    (title: string, body: string, tag?: string) => {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(title, {
            body,
            tag,
            icon: '/favicon.ico',
          });
        } catch {
          // Fallback เฉพาะ In-app toast หากเบราว์เซอร์บล็อก
        }
      }
    },
    []
  );

  // 2. ฟังก์ชันเพิ่ม Toast Pop-up และเก็บเข้าประวัติ Notification Bell
  const pushToast = useCallback(
    (item: Omit<RealtimeToastItem, 'id' | 'createdAt' | 'isRead'>) => {
      const newToast: RealtimeToastItem = {
        ...item,
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date(),
        isRead: false,
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 4)); // แสดงซ้อนกันสูงสุด 4 อัน
      setNotifications((prev) => [newToast, ...prev].slice(0, 30));

      // ตั้งเวลาปิด Toast อัตโนมัติ (แจ้งเตือนก่อนประชุมให้อยู่นานขึ้น 10 วินาที)
      const duration = item.type === 'MEETING_REMINDER' ? 10000 : 5500;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, duration);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  // 3. ดึงข้อมูลตารางการจองเมื่อเปลี่ยนวันที่ (หรือ Reconnect)
  const refreshBookings = useCallback(async () => {
    try {
      const startISO = new Date(`${selectedDate}T00:00:00`).toISOString();
      const endISO = new Date(`${selectedDate}T23:59:59`).toISOString();
      const res = await fetch(`/api/bookings?start=${startISO}&end=${endISO}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setBookings(json.data);
        }
      }
    } catch {
      // ใช้ข้อมูลใน State ปัจจุบันหากออฟไลน์
    }
  }, [selectedDate]);

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  // 4. เชื่อมต่อ Socket.io เพื่อรับการเปลี่ยนแปลงแบบ Real-time โดยไม่ต้อง Refresh หน้าเว็บ
  useEffect(() => {
    const socket: Socket = io({
      path: '/api/socket/io',
      addTrailingSlash: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('user:join', currentUserId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Event 1: มีผู้ใช้งานจองห้องประชุมใหม่ -> อัปเดตปฏิทินและแดชบอร์ดทันที
    socket.on(
      'booking:created',
      (payload: { booking: CalendarBookingItem; message: string }) => {
        const { booking, message } = payload;

        setBookings((prev) => {
          // ป้องกันการเพิ่มซ้ำ (Deduplication กรณีเป็นคนกดจองเอง)
          if (prev.some((b) => b.id === booking.id)) return prev;
          return [...prev, booking].sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
        });

        pushToast({
          type: 'BOOKING_CREATED',
          title: 'มีการจองห้องประชุมใหม่',
          message:
            message ||
            `${booking.user.name} จองห้องสำหรับ "${booking.title}"`,
          roomName: (booking as any).room?.name,
          startTime: booking.startTime,
        });
      }
    );

    // Event 2: มีการยกเลิกการจอง -> ลบออกจากปฏิทินและคืนค่าห้องว่างทันที
    socket.on(
      'booking:cancelled',
      (payload: {
        bookingId: string;
        title?: string;
        roomName?: string;
        cancelledBy?: string;
      }) => {
        setBookings((prev) => prev.filter((b) => b.id !== payload.bookingId));

        pushToast({
          type: 'BOOKING_CANCELLED',
          title: 'ยกเลิกการจองห้องประชุม',
          message: payload.title
            ? `การประชุม "${payload.title}" ถูกยกเลิก ห้องว่างพร้อมใช้งานแล้ว`
            : 'มีรายการจองถูกยกเลิก สถานะห้องว่างถูกอัปเดตแล้ว',
          roomName: payload.roomName,
        });
      }
    );

    // Event 3: แจ้งเตือนล่วงหน้า 15 นาทีจาก Server Cron Trigger
    socket.on(
      'booking:reminder',
      (payload: {
        bookingId: string;
        title: string;
        roomName: string;
        startTime: string;
        minutesLeft: number;
      }) => {
        if (remindedBookingIdsRef.current.has(payload.bookingId)) return;
        remindedBookingIdsRef.current.add(payload.bookingId);

        const alertMsg = `อีก ${payload.minutesLeft} นาทีจะเริ่มประชุม "${payload.title}" ที่ห้อง ${payload.roomName}`;

        pushToast({
          type: 'MEETING_REMINDER',
          title: 'แจ้งเตือนก่อนเริ่มประชุม (15 นาที)',
          message: alertMsg,
          roomName: payload.roomName,
          startTime: payload.startTime,
          minutesLeft: payload.minutesLeft,
        });

        triggerBrowserNotification(
          `⏰ ใกล้เริ่มประชุม: ${payload.title}`,
          alertMsg,
          `reminder-${payload.bookingId}`
        );
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [currentUserId, pushToast, triggerBrowserNotification]);

  // 5. Client-side Watchdog Timer (สำรองกรณีไม่ได้รัน Server Cron)
  // ตรวจสอบทุก 30 วินาทีว่ามีการประชุมใดกำลังจะเริ่มในอีก <= 15 นาทีหรือไม่
  useEffect(() => {
    const checkUpcomingMeetings = () => {
      const now = Date.now();

      bookings.forEach((booking) => {
        if (booking.status !== 'CONFIRMED') return;
        if (remindedBookingIdsRef.current.has(booking.id)) return;

        const startMs = new Date(booking.startTime).getTime();
        const diffMinutes = Math.ceil((startMs - now) / (1000 * 60));

        // หากเหลือเวลาระหว่าง 1 ถึง 15 นาทีก่อนเริ่มประชุม
        if (diffMinutes > 0 && diffMinutes <= 15) {
          remindedBookingIdsRef.current.add(booking.id);

          const roomName = (booking as any).room?.name || 'ห้องประชุมที่จองไว้';
          const alertMsg = `อีก ${diffMinutes} นาทีจะเริ่ม "${booking.title}" ณ ${roomName}`;

          pushToast({
            type: 'MEETING_REMINDER',
            title: 'แจ้งเตือนก่อนเริ่มประชุม!',
            message: alertMsg,
            roomName,
            startTime: booking.startTime,
            minutesLeft: diffMinutes,
          });

          triggerBrowserNotification(
            `⏰ อีก ${diffMinutes} นาทีเริ่มประชุม`,
            alertMsg,
            `reminder-${booking.id}`
          );
        }
      });
    };

    checkUpcomingMeetings();
    const intervalId = setInterval(checkUpcomingMeetings, 30 * 1000);
    return () => clearInterval(intervalId);
  }, [bookings, pushToast, triggerBrowserNotification]);

  // ฟังก์ชันเพิ่มการจองแบบ Optimistic ทันทีที่ผู้ใช้กดจองใน Modal สำเร็จ
  const addBookingOptimistic = useCallback(
    (newBooking: CalendarBookingItem) => {
      setBookings((prev) => {
        if (prev.some((b) => b.id === newBooking.id)) return prev;
        return [...prev, newBooking].sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
      });

      pushToast({
        type: 'BOOKING_CREATED',
        title: 'จองห้องประชุมสำเร็จ',
        message: `บันทึกตาราง "${newBooking.title}" เรียบร้อยแล้ว`,
        roomName: (newBooking as any).room?.name,
        startTime: newBooking.startTime,
      });
    },
    [pushToast]
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    bookings,
    toasts,
    notifications,
    unreadCount,
    isConnected,
    pushPermission,
    requestPushPermission,
    dismissToast,
    markAllNotificationsAsRead,
    addBookingOptimistic,
    refreshBookings,
  };
}
