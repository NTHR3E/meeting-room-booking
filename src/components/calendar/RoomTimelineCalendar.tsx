// src/components/calendar/RoomTimelineCalendar.tsx
'use client';

import React, { useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Users,
  Wrench,
  CheckCircle2,
  Radio,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { InitialSlotSelection, RoomOption } from '@/components/booking/BookingModal';

export interface CalendarBookingItem {
  id: string;
  roomId: string;
  title: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  attendeeCount: number;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  user: {
    id: string;
    name: string;
    department: string | null;
  };
}

interface RoomTimelineCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
  rooms: RoomOption[];
  bookings: CalendarBookingItem[];
  onSelectEmptySlot: (slot: InitialSlotSelection) => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 ถึง 18:00

export default function RoomTimelineCalendar({
  selectedDate,
  onDateChange,
  rooms,
  bookings,
  onSelectEmptySlot,
}: RoomTimelineCalendarProps) {
  const now = new Date();

  // คำนวณว่าขณะนี้แต่ละห้องมีสถานะเป็น "ว่าง", "ใช้งานอยู่", หรือ "ปิดปรับปรุง"
  const getRoomLiveStatus = (room: RoomOption): 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' => {
    if (!room.isActive) return 'MAINTENANCE';

    const isCurrentlyOccupied = bookings.some((b) => {
      if (b.roomId !== room.id || b.status !== 'CONFIRMED') return false;
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      const current = now.getTime();
      return current >= start && current < end;
    });

    return isCurrentlyOccupied ? 'OCCUPIED' : 'AVAILABLE';
  };

  // เลื่อนวันก่อนหน้า / ถัดไป
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split('T')[0]);
  };

  // คำนวณตำแหน่งของแถบการจองบน Timeline (08:00 - 19:00 = 11 ชม.)
  const getBookingPositionStyle = (startISO: string, endISO: string) => {
    const start = new Date(startISO);
    const end = new Date(endISO);

    const startDecimal = start.getHours() + start.getMinutes() / 60;
    const endDecimal = end.getHours() + end.getMinutes() / 60;

    const clampedStart = Math.max(8, Math.min(19, startDecimal));
    const clampedEnd = Math.max(8, Math.min(19, endDecimal));

    const leftPercent = ((clampedStart - 8) / 11) * 100;
    const widthPercent = Math.max(((clampedEnd - clampedStart) / 11) * 100, 3.5);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // ตำแหน่งเส้นเวลาปัจจุบัน (Red Live Line)
  const currentTimePercent = useMemo(() => {
    const currentDecimal = now.getHours() + now.getMinutes() / 60;
    if (currentDecimal < 8 || currentDecimal > 19) return null;
    return ((currentDecimal - 8) / 11) * 100;
  }, [now]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/75 shadow-2xl backdrop-blur-xl">
      {/* 1. Calendar Top Bar & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 ring-1 ring-cyan-500/30">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              ตารางการใช้ห้องประชุม (Interactive Room Timeline)
            </h2>
            <p className="text-xs text-slate-400">
              คลิกที่ช่องเวลาว่างของแต่ละห้องเพื่อเปิดหน้าต่างจองได้ทันที
            </p>
          </div>
        </div>

        {/* Status Legend & Date Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Pills */}
          <div className="hidden items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-xs xl:flex">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              ว่าง (คลิกเพื่อจอง)
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5 text-rose-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              ใช้งานอยู่
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              ปิดปรับปรุง
            </span>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 p-1">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="วันก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent px-2 text-xs font-semibold text-white outline-none"
            />
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="วันถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Timeline Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          {/* Time Header Row (08:00 - 18:00) */}
          <div className="grid grid-cols-12 border-b border-slate-800/80 bg-slate-950/50 text-xs font-medium text-slate-400">
            <div className="col-span-3 flex items-center gap-2 border-r border-slate-800/80 px-5 py-3">
              <Layers className="h-4 w-4 text-slate-500" />
              <span>ห้องประชุม / สถานะปัจจุบัน</span>
            </div>
            <div className="col-span-9 grid grid-cols-11">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-r border-slate-800/50 px-2 py-3 text-center font-mono text-[11px] last:border-r-0"
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Room Rows */}
          <div className="divide-y divide-slate-800/70">
            {rooms.map((room) => {
              const liveStatus = getRoomLiveStatus(room);
              const roomBookings = bookings.filter(
                (b) => b.roomId === room.id && b.status === 'CONFIRMED'
              );

              return (
                <div
                  key={room.id}
                  className={`group/row grid grid-cols-12 transition-colors duration-200 ${
                    liveStatus === 'MAINTENANCE'
                      ? 'bg-amber-950/10'
                      : 'hover:bg-slate-800/25'
                  }`}
                >
                  {/* ข้อมูลห้องประชุม + ป้ายสถานะสี */}
                  <div className="col-span-3 flex flex-col justify-between border-r border-slate-800/80 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: room.colorCode }}
                          />
                          <h4 className="font-semibold text-white group-hover/row:text-cyan-300 transition-colors">
                            {room.name}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          ชั้น {room.floor} • ความจุ {room.capacity} คน
                        </p>
                      </div>

                      {/* ป้ายสถานะปัจจุบัน (ว่าง / ใช้งานอยู่ / ปิดปรับปรุง) */}
                      {liveStatus === 'AVAILABLE' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> ว่าง
                        </span>
                      )}
                      {liveStatus === 'OCCUPIED' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
                          <Radio className="h-3 w-3 animate-pulse text-rose-400" /> ใช้งานอยู่
                        </span>
                      )}
                      {liveStatus === 'MAINTENANCE' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                          <Wrench className="h-3 w-3" /> ปิดปรับปรุง
                        </span>
                      )}
                    </div>

                    {/* อุปกรณ์ภายในห้อง */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.amenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* แถบ Timeline 11 ชั่วโมง (08:00 - 18:00) */}
                  <div className="relative col-span-9 grid min-h-[88px] grid-cols-11">
                    {/* เส้นบอกเวลาปัจจุบัน (Live Indicator) */}
                    {currentTimePercent !== null && (
                      <div
                        style={{ left: `${currentTimePercent}%` }}
                        className="pointer-events-none absolute bottom-0 top-0 z-20 w-[2px] bg-rose-500/80 shadow-[0_0_10px_#f43f5e]"
                      />
                    )}

                    {/* กรณีห้องปิดปรับปรุง: แสดงแถบสีเหลืองคาดทั้งแถว */}
                    {liveStatus === 'MAINTENANCE' ? (
                      <div className="col-span-11 flex items-center justify-center bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.06),rgba(245,158,11,0.06)_10px,rgba(245,158,11,0.12)_10px,rgba(245,158,11,0.12)_20px)] text-xs font-medium text-amber-300/80">
                        <Wrench className="mr-2 h-4 w-4" /> ห้องประชุมปิดปรับปรุงชั่วคราว ไม่สามารถจองได้
                      </div>
                    ) : (
                      <>
                        {/* ช่องว่างแต่ละชั่วโมง (Clickable Empty Slots) */}
                        {HOURS.map((hour) => {
                          const startHourStr = `${String(hour).padStart(2, '0')}:00`;
                          const endHourStr = `${String(hour + 1).padStart(2, '0')}:00`;

                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() =>
                                onSelectEmptySlot({
                                  roomId: room.id,
                                  dateStr: selectedDate,
                                  startHour: startHourStr,
                                  endHour: endHourStr,
                                })
                              }
                              className="group/slot relative flex items-center justify-center border-r border-slate-800/40 transition-all duration-200 last:border-r-0 hover:bg-emerald-500/10"
                              title={`คลิกเพื่อจองห้อง ${room.name} เวลา ${startHourStr} - ${endHourStr}`}
                            >
                              <span className="flex scale-75 items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-300 opacity-0 shadow-sm transition-all duration-200 group-hover/slot:scale-100 group-hover/slot:opacity-100">
                                <Plus className="h-3 w-3" /> จอง
                              </span>
                            </button>
                          );
                        })}

                        {/* แถบสีรายการที่ถูกจองแล้ว (Floating Booking Blocks) */}
                        {roomBookings.map((booking) => {
                          const posStyle = getBookingPositionStyle(
                            booking.startTime,
                            booking.endTime
                          );
                          const startTimeFormatted = new Date(
                            booking.startTime
                          ).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          const endTimeFormatted = new Date(
                            booking.endTime
                          ).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          // เช็กว่ารายการจองนี้กำลังดำเนินการอยู่ตอนนี้หรือไม่
                          const isNowActive =
                            now.getTime() >= new Date(booking.startTime).getTime() &&
                            now.getTime() < new Date(booking.endTime).getTime();

                          return (
                            <div
                              key={booking.id}
                              style={posStyle}
                              className={`group/item absolute bottom-2.5 top-2.5 z-10 flex flex-col justify-between overflow-hidden rounded-xl border p-2.5 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:z-30 hover:shadow-2xl ${
                                isNowActive
                                  ? 'border-rose-400/60 bg-gradient-to-r from-rose-600/90 to-pink-600/85 text-white shadow-rose-500/25'
                                  : 'border-cyan-400/50 bg-gradient-to-r from-blue-600/85 to-cyan-600/80 text-white shadow-cyan-500/20'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <p className="truncate text-xs font-bold leading-tight">
                                  {booking.title}
                                </p>
                                {isNowActive && (
                                  <span className="h-2 w-2 shrink-0 animate-ping rounded-full bg-white" />
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-white/90">
                                <span className="truncate font-mono">
                                  {startTimeFormatted} - {endTimeFormatted}
                                </span>
                                <span className="hidden items-center gap-0.5 sm:inline-flex">
                                  <Users className="h-2.5 w-2.5" /> {booking.attendeeCount}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
