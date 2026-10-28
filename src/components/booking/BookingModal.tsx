// src/components/booking/BookingModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building2,
} from 'lucide-react';

export interface RoomOption {
  id: string;
  name: string;
  capacity: number;
  floor: string;
  amenities: string[];
  colorCode: string;
  isActive: boolean;
}

export interface InitialSlotSelection {
  roomId: string;
  dateStr: string;   // YYYY-MM-DD
  startHour: string; // เช่น "09:00"
  endHour: string;   // เช่น "10:00"
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RoomOption[];
  existingBookings?: any[];
  initialSlot: InitialSlotSelection | null;
  currentUserId: string;
  onBookingSuccess: (newBooking: any) => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  rooms,
  existingBookings = [],
  initialSlot,
  currentUserId,
  onBookingSuccess,
}: BookingModalProps) {
  const [roomId, setRoomId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('10:00');
  const [attendeeCount, setAttendeeCount] = useState(4);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictDetail, setConflictDetail] = useState<{
    title: string;
    bookedBy: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  useEffect(() => {
    if (initialSlot) {
      setRoomId(initialSlot.roomId);
      setDateStr(initialSlot.dateStr);
      setStartHour(initialSlot.startHour);
      setEndHour(initialSlot.endHour);
      setErrorMsg(null);
      setConflictDetail(null);
    }
  }, [initialSlot, isOpen]);

  if (!isOpen) return null;

  const selectedRoom = rooms.find((r) => r.id === roomId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setConflictDetail(null);
    setIsSubmitting(true);

    const startDateObj = new Date(`${dateStr}T${startHour}:00`);
    const endDateObj = new Date(`${dateStr}T${endHour}:00`);

    if (endDateObj <= startDateObj) {
      setErrorMsg('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      setIsSubmitting(false);
      return;
    }

    // ฟังก์ชันตรวจสอบเวลาชนฝั่ง Client (รองรับการโฮสต์บน GitHub Pages แบบ Static)
    const runClientFallbackBooking = () => {
      const conflicting = existingBookings.find(
        (b) =>
          b.roomId === roomId &&
          b.status === 'CONFIRMED' &&
          new Date(b.startTime) < endDateObj &&
          new Date(b.endTime) > startDateObj
      );

      if (conflicting) {
        setConflictDetail({
          title: conflicting.title,
          bookedBy: conflicting.user?.name || 'ผู้ใช้งานท่านอื่น',
          startTime: conflicting.startTime,
          endTime: conflicting.endTime,
        });
        setErrorMsg(`ห้อง "${selectedRoom?.name}" ถูกจองแล้วในช่วงเวลาดังกล่าว`);
        return;
      }

      const fallbackBooking = {
        id: `bk-${Date.now().toString(36)}`,
        roomId,
        title,
        description,
        startTime: startDateObj.toISOString(),
        endTime: endDateObj.toISOString(),
        attendeeCount: Number(attendeeCount),
        status: 'CONFIRMED' as const,
        room: selectedRoom,
        user: {
          id: currentUserId,
          name: 'คุณธนวัฒน์ (ผู้จอง)',
          department: 'Management',
        },
      };

      onBookingSuccess(fallbackBooking);
      setTitle('');
      setDescription('');
      onClose();
    };

    try {
      const startISO = startDateObj.toISOString();
      const endISO = endDateObj.toISOString();

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: currentUserId,
          title,
          description: description || undefined,
          attendeeCount: Number(attendeeCount),
          startTime: startISO,
          endTime: endISO,
        }),
      });

      // กรณีรันอยู่บน GitHub Pages (Static Hosting ไม่มี /api/bookings)
      if (res.status === 404 || res.status === 405) {
        runClientFallbackBooking();
        return;
      }

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409 && result.conflictingBooking) {
          setConflictDetail(result.conflictingBooking);
        }
        setErrorMsg(result.error || 'ไม่สามารถจองห้องประชุมได้');
        return;
      }

      onBookingSuccess(result.data);
      setTitle('');
      setDescription('');
      onClose();
    } catch {
      // Fallback กรณีรันบน Static Host (GitHub Pages)
      runClientFallbackBooking();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop พร้อม Blur Transition */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Container สไตล์ Floating Glass */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 text-slate-100 shadow-[0_25px_70px_-15px_rgba(6,182,212,0.3)] transition-all animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">จองห้องประชุมด่วน (Quick Book)</h3>
              <p className="text-xs text-slate-400">
                ระบบตรวจสอบเวลาทับซ้อนอัตโนมัติแบบ Real-time
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* แจ้งเตือนกรณีเวลาชน (Double Booking Conflict 409) */}
        {errorMsg && (
          <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-300">{errorMsg}</p>
                {conflictDetail && (
                  <p className="text-xs text-rose-200/80">
                    ชนกับการประชุม: <strong>&ldquo;{conflictDetail.title}&rdquo;</strong> โดยคุณ{' '}
                    {conflictDetail.bookedBy}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* เลือกห้องประชุม */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Building2 className="h-3.5 w-3.5 text-cyan-400" /> ห้องประชุม
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id} disabled={!room.isActive}>
                  {room.name} (ชั้น {room.floor} • รองรับ {room.capacity} คน)
                  {!room.isActive ? ' — [ปิดปรับปรุง]' : ''}
                </option>
              ))}
            </select>
            {selectedRoom && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedRoom.amenities.map((item) => (
                  <span
                    key={item}
                    className="rounded-md bg-slate-800/90 px-2 py-0.5 text-[11px] text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* หัวข้อการประชุม */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <FileText className="h-3.5 w-3.5 text-cyan-400" /> หัวข้อการประชุม *
            </label>
            <input
              type="text"
              required
              minLength={3}
              placeholder="เช่น Sprint Planning Q4, ประชุมออกแบบ Architecture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* วันที่ และ ช่วงเวลา */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" /> วันที่
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Clock className="h-3.5 w-3.5 text-emerald-400" /> เวลาเริ่ม
              </label>
              <input
                type="time"
                required
                step="900"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Clock className="h-3.5 w-3.5 text-rose-400" /> เวลาสิ้นสุด
              </label>
              <input
                type="time"
                required
                step="900"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* จำนวนผู้เข้าร่วม */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-cyan-400" /> จำนวนผู้เข้าร่วมประชุม (คน)
              </span>
              {selectedRoom && (
                <span className="text-slate-400">ความจุสูงสุด {selectedRoom.capacity} คน</span>
              )}
            </label>
            <input
              type="number"
              min={1}
              max={selectedRoom?.capacity || 50}
              required
              value={attendeeCount}
              onChange={(e) => setAttendeeCount(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>

          {/* รายละเอียดเพิ่มเติม */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              หมายเหตุ / อุปกรณ์ที่ต้องการเพิ่มเติม
            </label>
            <textarea
              rows={2}
              placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
            />
          </div>

          {/* ปุ่ม Action */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (selectedRoom && !selectedRoom.isActive)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:-translate-y-0.5 hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสอบและบันทึก...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> ยืนยันการจองห้อง
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
