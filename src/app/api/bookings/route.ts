// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createBookingSchema } from '@/lib/validations/booking';
import {
  BookingConflictError,
  BookingRuleError,
  createBookingWithLock,
  getInMemoryBookings,
} from '@/services/booking.service';
import { emitRealtimeEvent, SOCKET_EVENTS } from '@/lib/socket-server';
import {
  appendBookingToGoogleSheet,
  GOOGLE_WORKSPACE_CONFIG,
} from '@/services/google-sync.service';

/**
 * GET /api/bookings?start=2026-10-01T00:00:00Z&end=2026-10-31T23:59:59Z&roomId=optional
 * ดึงรายการจองห้องประชุมสำหรับแสดงผลบน Calendar (Day / Week / Month)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const roomId = searchParams.get('roomId');

    const whereClause: Prisma.BookingWhereInput = {
      status: 'CONFIRMED',
    };

    // กรองตามช่วงเวลาที่เปิดดูในปฏิทิน (Overlap กับหน้าต่างปฏิทิน)
    if (startParam && endParam) {
      const startDate = new Date(startParam);
      const endDate = new Date(endParam);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'พารามิเตอร์ start หรือ end ไม่ใช่รูปแบบวันที่ที่ถูกต้อง' },
          { status: 400 }
        );
      }

      whereClause.AND = [
        { startTime: { lt: endDate } },
        { endTime: { gt: startDate } },
      ];
    }

    if (roomId && roomId !== 'ALL') {
      whereClause.roomId = roomId;
    }

    if (!process.env.DATABASE_URL) {
      const bookings = getInMemoryBookings();
      return NextResponse.json({ data: bookings }, { status: 200 });
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        room: {
          select: { id: true, name: true, colorCode: true, floor: true, capacity: true },
        },
        user: {
          select: { id: true, name: true, department: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ data: bookings }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/bookings] Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตารางการจอง' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * สร้างรายการจองใหม่ + ตรวจสอบเวลาทับซ้อน + Broadcast ผ่าน Socket.io แบบเรียลไทม์
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate ข้อมูลขาเข้าและเงื่อนไขเวลาด้วย Zod
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'ข้อมูลการจองไม่ถูกต้อง',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 2. เรียก Service จองห้องภายใต้ Serializable Transaction
    const { booking, notification } = await createBookingWithLock(parsed.data);

    // 3. ยิง Real-time Event ผ่าน Socket.io ไปยังทุกไคลเอนต์ที่เปิดหน้าเว็บอยู่
    emitRealtimeEvent(SOCKET_EVENTS.BOOKING_CREATED, {
      booking,
      message: `${booking.user.name} จองห้อง ${booking.room.name} (${booking.title})`,
      timestamp: new Date().toISOString(),
    });

    // ยิงแจ้งเตือนเข้า Channel ส่วนตัวของผู้จอง (หรือผู้เกี่ยวข้อง)
    emitRealtimeEvent(
      SOCKET_EVENTS.NOTIFICATION_NEW,
      notification,
      `user:${booking.userId}`
    );

    // 4. ซิงก์รายการจองลง Google Sheet อัตโนมัติ (Non-blocking เพื่อไม่ให้ API ช้า)
    const sheetSync = await appendBookingToGoogleSheet({
      id: booking.id,
      title: booking.title,
      roomName: booking.room.name,
      floor: booking.room.floor,
      bookedBy: booking.user.name,
      department: booking.user.department || 'General',
      startTime: booking.startTime,
      endTime: booking.endTime,
      attendeeCount: booking.attendeeCount,
      status: booking.status,
    });

    return NextResponse.json(
      {
        message: 'จองห้องประชุมและซิงก์ลง Google Sheets สำเร็จ',
        data: booking,
        googleWorkspace: {
          synced: sheetSync.synced,
          spreadsheetUrl: GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_URL,
          driveFolderUrl: GOOGLE_WORKSPACE_CONFIG.DRIVE_FOLDER_URL,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // กรณีเวลาทับซ้อนกับการจองอื่น (Double Booking Detected) -> HTTP 409 Conflict
    if (error instanceof BookingConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'DOUBLE_BOOKING_CONFLICT',
          conflictingBooking: error.conflictingBooking,
        },
        { status: 409 }
      );
    }

    // กรณีผิดกฎของห้องประชุม (เช่น คนเกินความจุ หรือห้องปิดปรับปรุง)
    if (error instanceof BookingRuleError) {
      return NextResponse.json(
        { error: error.message, code: 'BOOKING_RULE_VIOLATION' },
        { status: error.statusCode }
      );
    }

    // กรณีเกิด Concurrent Serialization Conflict ในระดับ Database (รหัส P2034 ของ Prisma)
    // หรือติด Exclusion Constraint (รหัส 23P01 ของ PostgreSQL)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2034' || error.code === 'P2002')
    ) {
      return NextResponse.json(
        {
          error: 'มีผู้ใช้งานท่านอื่นกำลังทำรายการจองห้องและเวลานี้พร้อมกับคุณ กรุณาลองใหม่อีกครั้ง',
          code: 'CONCURRENT_BOOKING_LOCK',
        },
        { status: 409 }
      );
    }

    console.error('[POST /api/bookings] Unexpected Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
