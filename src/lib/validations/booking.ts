// src/lib/validations/booking.ts
import { z } from 'zod';

const MIN_BOOKING_MINUTES = 15;
const MAX_BOOKING_HOURS = 8;

export const createBookingSchema = z
  .object({
    roomId: z.string().min(1, 'กรุณาเลือกห้องประชุม'),
    userId: z.string().min(1, 'ไม่พบรหัสผู้ใช้งาน'),
    title: z
      .string()
      .trim()
      .min(3, 'หัวข้อการประชุมต้องมีอย่างน้อย 3 ตัวอักษร')
      .max(120, 'หัวข้อการประชุมยาวเกินไป'),
    description: z.string().trim().max(500).optional(),
    attendeeCount: z
      .number()
      .int()
      .min(1, 'จำนวนผู้เข้าร่วมต้องมีอย่างน้อย 1 คน'),
    startTime: z.string().datetime({ message: 'รูปแบบเวลาเริ่มต้นไม่ถูกต้อง (ต้องเป็น ISO 8601)' }),
    endTime: z.string().datetime({ message: 'รูปแบบเวลาสิ้นสุดไม่ถูกต้อง (ต้องเป็น ISO 8601)' }),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    const now = new Date();

    // 1. เช็กว่าเวลาเริ่มต้นต้องไม่เป็นอดีต (อนุโลม Clock Skew ได้ 1 นาที)
    if (start.getTime() < now.getTime() - 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: 'ไม่สามารถจองห้องประชุมย้อนหลังได้',
      });
    }

    // 2. เช็กว่าเวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
      });
      return;
    }

    // 3. เช็กระยะเวลาการจองขั้นต่ำ (15 นาที) และสูงสุด (8 ชั่วโมง)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

    if (durationMinutes < MIN_BOOKING_MINUTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: `ระยะเวลาการจองขั้นต่ำคือ ${MIN_BOOKING_MINUTES} นาที`,
      });
    }

    if (durationMinutes > MAX_BOOKING_HOURS * 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: `ไม่สามารถจองต่อเนื่องเกิน ${MAX_BOOKING_HOURS} ชั่วโมงต่อรายการ`,
      });
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
