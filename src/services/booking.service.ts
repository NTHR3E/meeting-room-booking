// src/services/booking.service.ts
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CreateBookingInput } from '@/lib/validations/booking';

export class BookingConflictError extends Error {
  public conflictingBooking: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    bookedBy: string;
  };

  constructor(
    message: string,
    conflictingBooking: {
      id: string;
      title: string;
      startTime: Date;
      endTime: Date;
      bookedBy: string;
    }
  ) {
    super(message);
    this.name = 'BookingConflictError';
    this.conflictingBooking = conflictingBooking;
  }
}

export class BookingRuleError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'BookingRuleError';
    this.statusCode = statusCode;
  }
}

// ข้อมูลห้องประชุมและ In-Memory Store สำหรับโหมดทดสอบทันทีโดยไม่ต้องตั้งค่า PostgreSQL
const FALLBACK_ROOMS = [
  {
    id: 'room-orbit-1',
    name: 'Orbit Boardroom A',
    capacity: 16,
    floor: '12A',
    colorCode: '#06B6D4',
    isActive: true,
  },
  {
    id: 'room-nebula-2',
    name: 'Nebula Creative Hub',
    capacity: 8,
    floor: '12A',
    colorCode: '#8B5CF6',
    isActive: true,
  },
  {
    id: 'room-gravity-3',
    name: 'Gravity Focus Pod',
    capacity: 6,
    floor: '14',
    colorCode: '#10B981',
    isActive: true,
  },
  {
    id: 'room-zenith-4',
    name: 'Zenith Auditorium',
    capacity: 30,
    floor: '15',
    colorCode: '#F59E0B',
    isActive: false,
  },
];

declare global {
  // eslint-disable-next-line no-var
  var inMemoryBookings: any[] | undefined;
}

export function getInMemoryBookings() {
  if (!globalThis.inMemoryBookings) {
    const todayStr = new Date().toISOString().split('T')[0];
    globalThis.inMemoryBookings = [
      {
        id: 'bk-demo-1',
        roomId: 'room-orbit-1',
        userId: 'usr-1',
        title: 'Architecture Design Review',
        description: 'ทบทวนโครงสร้างระบบจองห้องประชุม',
        startTime: new Date(`${todayStr}T09:00:00`),
        endTime: new Date(`${todayStr}T11:00:00`),
        attendeeCount: 10,
        status: 'CONFIRMED',
        room: FALLBACK_ROOMS[0],
        user: {
          id: 'usr-1',
          name: 'คุณธนภัทร (Senior Architect)',
          email: 'thanapat@company.com',
          department: 'Engineering',
        },
      },
      {
        id: 'bk-demo-2',
        roomId: 'room-nebula-2',
        userId: 'usr-2',
        title: 'UX/UI Sprint Sync',
        description: 'สรุปดีไซน์หน้า Dashboard & Calendar',
        startTime: new Date(`${todayStr}T13:00:00`),
        endTime: new Date(`${todayStr}T15:00:00`),
        attendeeCount: 6,
        status: 'CONFIRMED',
        room: FALLBACK_ROOMS[1],
        user: {
          id: 'usr-2',
          name: 'คุณพิมพ์ชนก (Product Design)',
          email: 'pimchanok@company.com',
          department: 'Design',
        },
      },
    ];
  }
  return globalThis.inMemoryBookings;
}

/**
 * สร้างการจองใหม่พร้อมป้องกัน Double Booking
 * (รองรับทั้ง PostgreSQL Serializable Transaction และ In-Memory Fallback สำหรับรันเทสทันที)
 */
export async function createBookingWithLock(input: CreateBookingInput) {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);

  // หากยังไม่ได้ตั้งค่า DATABASE_URL ให้ทำงานผ่าน In-Memory Engine ที่ใช้ Logic เดียวกัน 100%
  if (!process.env.DATABASE_URL) {
    const room = FALLBACK_ROOMS.find((r) => r.id === input.roomId);
    if (!room) {
      throw new BookingRuleError('ไม่พบห้องประชุมที่ระบุ', 404);
    }
    if (!room.isActive) {
      throw new BookingRuleError(`ห้องประชุม "${room.name}" ปิดปรับปรุงชั่วคราว`, 400);
    }
    if (input.attendeeCount > room.capacity) {
      throw new BookingRuleError(
        `จำนวนผู้เข้าร่วม (${input.attendeeCount} คน) เกินความจุของห้อง ${room.name} (สูงสุด ${room.capacity} คน)`,
        400
      );
    }

    const store = getInMemoryBookings();
    const conflicting = store.find(
      (b) =>
        b.roomId === input.roomId &&
        b.status === 'CONFIRMED' &&
        new Date(b.startTime) < endTime &&
        new Date(b.endTime) > startTime
    );

    if (conflicting) {
      throw new BookingConflictError(
        `ห้อง "${room.name}" ถูกจองแล้วในช่วงเวลาดังกล่าว`,
        {
          id: conflicting.id,
          title: conflicting.title,
          startTime: new Date(conflicting.startTime),
          endTime: new Date(conflicting.endTime),
          bookedBy: conflicting.user.name,
        }
      );
    }

    const newBooking = {
      id: `bk-${Date.now().toString(36)}`,
      roomId: input.roomId,
      userId: input.userId,
      title: input.title,
      description: input.description,
      attendeeCount: input.attendeeCount,
      startTime,
      endTime,
      status: 'CONFIRMED' as const,
      room,
      user: {
        id: input.userId,
        name: 'คุณธนวัฒน์ (ผู้จอง)',
        email: 'tanawatmahaporn14@gmail.com',
        department: 'Management',
      },
    };

    store.push(newBooking);

    const notification = {
      id: `notif-${Date.now()}`,
      userId: input.userId,
      bookingId: newBooking.id,
      type: 'BOOKING_CREATED' as const,
      message: `จองห้อง ${room.name} หัวข้อ "${newBooking.title}" สำเร็จ`,
      isRead: false,
      createdAt: new Date(),
    };

    return { booking: newBooking, notification };
  }

  // กรณีเชื่อมต่อ PostgreSQL: ใช้ Serializable Transaction เต็มรูปแบบ
  return await prisma.$transaction(
    async (tx) => {
      const room = await tx.room.findUnique({
        where: { id: input.roomId },
      });

      if (!room) {
        throw new BookingRuleError('ไม่พบห้องประชุมที่ระบุ', 404);
      }

      if (!room.isActive) {
        throw new BookingRuleError(`ห้องประชุม "${room.name}" ปิดปรับปรุงชั่วคราว`, 400);
      }

      if (input.attendeeCount > room.capacity) {
        throw new BookingRuleError(
          `จำนวนผู้เข้าร่วม (${input.attendeeCount} คน) เกินความจุของห้อง ${room.name} (สูงสุด ${room.capacity} คน)`,
          400
        );
      }

      const conflicting = await tx.booking.findFirst({
        where: {
          roomId: input.roomId,
          status: 'CONFIRMED',
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } },
          ],
        },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { startTime: 'asc' },
      });

      if (conflicting) {
        throw new BookingConflictError(
          `ห้อง "${room.name}" ถูกจองแล้วในช่วงเวลาดังกล่าว`,
          {
            id: conflicting.id,
            title: conflicting.title,
            startTime: conflicting.startTime,
            endTime: conflicting.endTime,
            bookedBy: conflicting.user.name,
          }
        );
      }

      const newBooking = await tx.booking.create({
        data: {
          roomId: input.roomId,
          userId: input.userId,
          title: input.title,
          description: input.description,
          attendeeCount: input.attendeeCount,
          startTime,
          endTime,
          status: 'CONFIRMED',
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              colorCode: true,
              floor: true,
              capacity: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId: input.userId,
          bookingId: newBooking.id,
          type: 'BOOKING_CREATED',
          message: `จองห้อง ${newBooking.room.name} หัวข้อ "${newBooking.title}" สำเร็จ`,
        },
      });

      return { booking: newBooking, notification };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}
