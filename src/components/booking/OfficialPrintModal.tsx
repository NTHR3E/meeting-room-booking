// src/components/booking/OfficialPrintModal.tsx
'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
import { CalendarBookingItem } from '@/components/calendar/RoomTimelineCalendar';
import { RoomOption } from '@/components/booking/BookingModal';

interface OfficialPrintModalProps {
  booking: CalendarBookingItem | null;
  rooms: RoomOption[];
  onClose: () => void;
}

const OFFICIAL_ROOM_NAMES = [
  'หอประชุมอดิเรกสาร',
  'ห้องประชุมสักทอง',
  'ห้องประชุมหน้าห้องผู้อำนวยการ',
  'ห้องประชุม (กาแฟ)',
  'อาคารโดมเอนกประสงค์',
  'ห้องคอมพิวเตอร์กลาง (ห้องโสต)',
];

const OFFICIAL_EQUIPMENT = [
  'เครื่องฉายภาพ (Projector)',
  'ระบบเสียง',
  'ไมโครโฟน',
  'เครื่องปรับอากาศ',
  'อินเทอร์เน็ต',
];

export default function OfficialPrintModal({
  booking,
  rooms,
  onClose,
}: OfficialPrintModalProps) {
  if (!booking) return null;

  const room = rooms.find((r) => r.id === booking.roomId);
  const roomName = room?.name || (booking as any).room?.name || '';
  const details = (booking as any).formDetails || {};

  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);

  const startDay = startDate.getDate();
  const startMonth = startDate.toLocaleDateString('th-TH', { month: 'long' });
  const startYearBE = startDate.getFullYear() + 543;

  const endDay = endDate.getDate();
  const endMonth = endDate.toLocaleDateString('th-TH', { month: 'long' });
  const endYearBE = endDate.getFullYear() + 543;

  const startTimeStr = startDate.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTimeStr = endDate.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const equipmentList: string[] = details.equipmentList || OFFICIAL_EQUIPMENT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
      <div className="relative my-8 w-full max-w-3xl rounded-2xl bg-white p-8 text-black shadow-2xl print:m-0 print:max-w-none print:rounded-none print:p-4 print:shadow-none">
        {/* ปุ่มควบคุมด้านบน (ซ่อนเวลาสั่ง Print) */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              ตัวอย่างใบคำขออนุญาตใช้ห้องประชุม (สำหรับพิมพ์ / บันทึก PDF)
            </h3>
            <p className="text-xs text-slate-500">
              อ้างอิงตามแบบฟอร์มทางการ วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500"
            >
              <Printer className="h-4 w-4" /> พิมพ์ใบคำขอ / บันทึก PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* เนื้อหาแบบฟอร์มราชการตาม PDF */}
        <div className="space-y-3 text-[13px] leading-relaxed font-serif">
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold">แบบคำขออนุญาตใช้ห้องประชุม</h2>
            <h3 className="text-sm font-bold">
              วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
            </h3>
          </div>

          <div className="text-right">
            เขียนวันที่ {startDay} {startMonth} พ.ศ. {startYearBE}
          </div>

          <div>
            <strong>เรื่อง</strong> ขออนุญาตใช้ห้องประชุม
          </div>
          <div>
            <strong>เรียน</strong> ผู้อำนวยการวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
          </div>

          <div className="grid grid-cols-1 gap-1.5 pt-1">
            <div>
              ข้าพเจ้า{' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {booking.user.name}
              </span>{' '}
              ตำแหน่ง{' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {details.position || 'ครู / เจ้าหน้าที่'}
              </span>
            </div>
            <div>
              หน่วยงาน / สาขาวิชา{' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {booking.user.department || details.department || 'วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์'}
              </span>{' '}
              หมายเลขโทรศัพท์{' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {details.phone || '08X-XXX-XXXX'}
              </span>
            </div>
          </div>

          <div className="pt-1">
            <p className="font-bold">มีความประสงค์ขออนุญาตใช้ห้องประชุม</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {OFFICIAL_ROOM_NAMES.map((rName) => {
                const isSelected = roomName === rName;
                return (
                  <div key={rName} className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>{rName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div>
              เพื่อใช้ในการดำเนินงาน เรื่อง{' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {booking.title}
              </span>
            </div>
            <div>
              กำหนดการใช้งานวันที่{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {startDay}
              </span>{' '}
              เดือน{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {startMonth}
              </span>{' '}
              พ.ศ.{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {startYearBE}
              </span>{' '}
              ถึงวันที่{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {endDay}
              </span>{' '}
              เดือน{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {endMonth}
              </span>{' '}
              พ.ศ.{' '}
              <span className="border-b border-dotted border-black px-2 font-semibold">
                {endYearBE}
              </span>
            </div>
            <div>
              ตั้งแต่เวลา{' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {startTimeStr}
              </span>{' '}
              น. ถึงเวลา{' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {endTimeStr}
              </span>{' '}
              น. จำนวนผู้เข้าใช้ (โดยประมาณ){' '}
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {booking.attendeeCount}
              </span>{' '}
              คน
            </div>
          </div>

          <div className="pt-1">
            <p className="font-bold">ครุภัณฑ์/อุปกรณ์/สิ่งอำนวยความสะดวกที่ขอใช้</p>
            <div className="mt-1.5 flex flex-wrap gap-4">
              {OFFICIAL_EQUIPMENT.map((eq) => {
                const isChecked = equipmentList.includes(eq);
                return (
                  <div key={eq} className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                      {isChecked ? '✓' : ''}
                    </span>
                    <span>{eq}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-6">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                  {details.extraChairsCount > 0 ? '✓' : ''}
                </span>
                <span>
                  โต๊ะ/เก้าอี้เพิ่มเติม{' '}
                  <span className="border-b border-dotted border-black px-3 font-semibold">
                    {details.extraChairsCount || '-'}
                  </span>{' '}
                  ตัว
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                  {details.otherEquipment ? '✓' : ''}
                </span>
                <span>
                  อื่น ๆ{' '}
                  <span className="border-b border-dotted border-black px-4">
                    {details.otherEquipment || '............................................'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <p className="pt-1">
            ข้าพเจ้าขอรับรองว่าจะดูแลรักษาทรัพย์สินของทางราชการ และปฏิบัติตามระเบียบของวิทยาลัยโดยเคร่งครัด
          </p>

          {/* ตารางลงนาม 4 ช่องตาม PDF */}
          <div className="mt-4 grid grid-cols-2 border border-black text-center text-xs">
            {/* ช่อง 1: ผู้ยื่นคำขอ */}
            <div className="border-b border-r border-black p-4 space-y-2">
              <p className="font-bold">ผู้ยื่นคำขอ</p>
              <p className="pt-4">ลงชื่อ .......................................................</p>
              <p>({booking.user.name})</p>
              <p>
                วันที่ {startDay} / {startMonth} / {startYearBE}
              </p>
            </div>

            {/* ช่อง 2: หัวหน้างาน/ผู้รับรอง */}
            <div className="border-b border-black p-4 space-y-2">
              <p className="font-bold">หัวหน้างาน/ผู้รับรอง</p>
              <p className="pt-4">ลงชื่อ .......................................................</p>
              <p>(นายเอกราช เขียวทอง)</p>
              <p>หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร</p>
              <p>วันที่ .......................................................</p>
            </div>

            {/* ช่อง 3: เจ้าหน้าที่ผู้ตรวจสอบห้อง */}
            <div className="border-r border-black p-4 space-y-2">
              <p className="font-bold">เจ้าหน้าที่ผู้ตรวจสอบห้อง</p>
              <p className="pt-4">ลงชื่อ .......................................................</p>
              <p>(นายวัชรพงศ์ โสภา)</p>
              <p>เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร</p>
              <div className="flex justify-center gap-4 pt-1">
                <span>☑ พร้อมใช้งาน</span>
                <span>☐ ไม่พร้อมใช้งาน</span>
              </div>
              <p className="text-left">หมายเหตุ .......................................................</p>
            </div>

            {/* ช่อง 4: ผู้พิจารณา */}
            <div className="p-4 space-y-2">
              <p className="font-bold">ผู้พิจารณา</p>
              <p className="pt-4">ลงชื่อ .......................................................</p>
              <p>(นายชาตรี เริงชัยภูมิ)</p>
              <p>รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน</p>
              <p className="pt-2">วันที่ .......................................................</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
