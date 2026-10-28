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
  UserCheck,
  Phone,
  Briefcase,
  Wrench,
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

const EQUIPMENT_LIST = [
  { id: 'projector', label: 'เครื่องฉายภาพ (Projector)' },
  { id: 'sound', label: 'ระบบเสียง' },
  { id: 'mic', label: 'ไมโครโฟน' },
  { id: 'aircon', label: 'เครื่องปรับอากาศ' },
  { id: 'internet', label: 'อินเทอร์เน็ต' },
];

export default function BookingModal({
  isOpen,
  onClose,
  rooms,
  existingBookings = [],
  initialSlot,
  currentUserId,
  onBookingSuccess,
}: BookingModalProps) {
  // ข้อมูลผู้ยื่นคำขอตามแบบคำขออนุญาตใช้ห้องประชุม วท.ท่าหลวงฯ
  const [prefix, setPrefix] = useState('นาย');
  const [requesterName, setRequesterName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');

  // ข้อมูลห้องและการใช้งาน
  const [roomId, setRoomId] = useState('');
  const [customRoomName, setCustomRoomName] = useState('');
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('11:00');
  const [attendeeCount, setAttendeeCount] = useState(25);

  // ครุภัณฑ์/อุปกรณ์/สิ่งอำนวยความสะดวกที่ขอใช้
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    'เครื่องฉายภาพ (Projector)',
    'ระบบเสียง',
    'ไมโครโฟน',
    'เครื่องปรับอากาศ',
    'อินเทอร์เน็ต',
  ]);
  const [extraChairsEnabled, setExtraChairsEnabled] = useState(false);
  const [extraChairsCount, setExtraChairsCount] = useState<number>(10);
  const [otherEquipmentEnabled, setOtherEquipmentEnabled] = useState(false);
  const [otherEquipmentText, setOtherEquipmentText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictDetail, setConflictDetail] = useState<{
    title: string;
    bookedBy: string;
  } | null>(null);

  useEffect(() => {
    if (initialSlot) {
      setRoomId(initialSlot.roomId);
      setDateStr(initialSlot.dateStr);
      setEndDateStr(initialSlot.dateStr);
      setStartHour(initialSlot.startHour);
      setEndHour(initialSlot.endHour);
      setErrorMsg(null);
      setConflictDetail(null);
    }
  }, [initialSlot, isOpen]);

  if (!isOpen) return null;

  const selectedRoom = rooms.find((r) => r.id === roomId);

  const toggleEquipment = (label: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setConflictDetail(null);
    setIsSubmitting(true);

    const startDateObj = new Date(`${dateStr}T${startHour}:00`);
    const endDateObj = new Date(`${endDateStr || dateStr}T${endHour}:00`);

    if (endDateObj <= startDateObj) {
      setErrorMsg('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      setIsSubmitting(false);
      return;
    }

    const equipmentSummary = [
      ...selectedEquipment,
      ...(extraChairsEnabled ? [`โต๊ะ/เก้าอี้เพิ่มเติม ${extraChairsCount} ตัว`] : []),
      ...(otherEquipmentEnabled && otherEquipmentText ? [`อื่นๆ: ${otherEquipmentText}`] : []),
    ];

    const fullRequesterName = `${prefix}${requesterName.trim()}`;
    const descriptionText = `ตำแหน่ง: ${position} | สาขา/งาน: ${department} | โทร: ${phone} | อุปกรณ์: ${equipmentSummary.join(', ')}`;

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
        });
        setErrorMsg(`ห้อง "${selectedRoom?.name}" ถูกจองแล้วในช่วงเวลาดังกล่าว`);
        return;
      }

      const newBooking = {
        id: `bk-${Date.now().toString(36)}`,
        roomId,
        title,
        description: descriptionText,
        startTime: startDateObj.toISOString(),
        endTime: endDateObj.toISOString(),
        attendeeCount: Number(attendeeCount),
        status: 'CONFIRMED' as const,
        room: selectedRoom,
        user: {
          id: currentUserId,
          name: fullRequesterName,
          department: department || 'ส่วนกลาง',
        },
        formDetails: {
          prefix,
          requesterName: requesterName.trim(),
          fullName: fullRequesterName,
          position,
          department,
          phone,
          customRoomName: roomId === 'room-other' ? customRoomName : undefined,
          startDateStr: dateStr,
          endDateStr: endDateStr || dateStr,
          startHour,
          endHour,
          equipmentList: selectedEquipment,
          extraChairsCount: extraChairsEnabled ? extraChairsCount : 0,
          otherEquipment: otherEquipmentEnabled ? otherEquipmentText : '',
          createdAtStr: new Date().toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        },
      };

      onBookingSuccess(newBooking);
      setTitle('');
      onClose();
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: currentUserId,
          title,
          description: descriptionText,
          attendeeCount: Number(attendeeCount),
          startTime: startDateObj.toISOString(),
          endTime: endDateObj.toISOString(),
        }),
      });

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

      onBookingSuccess({
        ...result.data,
        user: {
          id: currentUserId,
          name: fullRequesterName,
          department,
        },
        formDetails: {
          prefix,
          requesterName: requesterName.trim(),
          fullName: fullRequesterName,
          position,
          department,
          phone,
          startDateStr: dateStr,
          endDateStr: endDateStr || dateStr,
          startHour,
          endHour,
          equipmentList: selectedEquipment,
          extraChairsCount: extraChairsEnabled ? extraChairsCount : 0,
          otherEquipment: otherEquipmentEnabled ? otherEquipmentText : '',
        },
      });
      setTitle('');
      onClose();
    } catch {
      runClientFallbackBooking();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      <div className="relative z-10 my-8 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 text-slate-100 shadow-[0_25px_70px_-15px_rgba(6,182,212,0.3)]">
        {/* Header อ้างอิงตามแบบฟอร์ม วท.ท่าหลวงซิเมนต์ไทยอนุสรณ์ */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                แบบคำขออนุญาตใช้ห้องประชุม
              </h3>
              <p className="text-xs text-cyan-300/90">
                วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ (เรียน ผู้อำนวยการวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์)
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

        {errorMsg && (
          <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-300">{errorMsg}</p>
                {conflictDetail && (
                  <p className="text-xs text-rose-200/80">
                    ชนกับรายการ: <strong>&ldquo;{conflictDetail.title}&rdquo;</strong> โดย{' '}
                    {conflictDetail.bookedBy}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* ส่วนที่ 1: ข้อมูลผู้ยื่นคำขอ */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              1. ข้อมูลผู้ยื่นคำขออนุญาต
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300">คำนำหน้า</label>
                <select
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                >
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">นางสาว</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <UserCheck className="h-3.5 w-3.5 text-cyan-400" /> ข้าพเจ้า (ชื่อ-นามสกุล) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ระบุชื่อ-นามสกุล ผู้ยื่นคำขอ"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Briefcase className="h-3.5 w-3.5 text-cyan-400" /> ตำแหน่ง *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ครูชำนาญการ / เจ้าหน้าที่"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Building2 className="h-3.5 w-3.5 text-cyan-400" /> หน่วยงาน / สาขาวิชา *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สาขาวิชาเทคโนโลยีสารสนเทศ"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Phone className="h-3.5 w-3.5 text-cyan-400" /> หมายเลขโทรศัพท์ *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="08X-XXX-XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* ส่วนที่ 2: ห้องประชุมและกำหนดการใช้งาน */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              2. มีความประสงค์ขออนุญาตใช้ห้องประชุม
            </p>

            <div>
              <label className="mb-1.5 block text-xs text-slate-300">
                เลือกห้องประชุม (ตามแบบฟอร์มวิทยาลัยฯ) *
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id} disabled={!room.isActive}>
                    {room.name} ({room.floor} • รองรับสูงสุด {room.capacity} คน)
                    {!room.isActive ? ' — [ไม่พร้อมใช้งาน/ปิดปรับปรุง]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-300">
                <FileText className="h-3.5 w-3.5 text-cyan-400" /> เพื่อใช้ในการดำเนินงาน เรื่อง *
              </label>
              <input
                type="text"
                required
                minLength={3}
                placeholder="ระบุหัวข้อการประชุม / โครงการ / กิจกรรม"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-cyan-400" /> ตั้งแต่วันที่
                </label>
                <input
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => {
                    setDateStr(e.target.value);
                    if (!endDateStr || endDateStr < e.target.value) {
                      setEndDateStr(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-cyan-400" /> ถึงวันที่
                </label>
                <input
                  type="date"
                  required
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" /> ตั้งแต่เวลา (น.)
                </label>
                <input
                  type="time"
                  required
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-rose-400" /> ถึงเวลา (น.)
                </label>
                <input
                  type="time"
                  required
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-cyan-400" /> จำนวนผู้เข้าใช้ (โดยประมาณ) คน *
                </span>
                {selectedRoom && (
                  <span className="text-slate-400">ความจุห้องสูงสุด {selectedRoom.capacity} คน</span>
                )}
              </label>
              <input
                type="number"
                min={1}
                max={selectedRoom?.capacity || 1000}
                required
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* ส่วนที่ 3: ครุภัณฑ์/อุปกรณ์/สิ่งอำนวยความสะดวกที่ขอใช้ */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <Wrench className="h-3.5 w-3.5" /> 3. ครุภัณฑ์ / อุปกรณ์ / สิ่งอำนวยความสะดวกที่ขอใช้
            </p>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {EQUIPMENT_LIST.map((item) => {
                const checked = selectedEquipment.includes(item.label);
                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                      checked
                        ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEquipment(item.label)}
                      className="rounded accent-cyan-400"
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="extraChairs"
                  checked={extraChairsEnabled}
                  onChange={(e) => setExtraChairsEnabled(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <label htmlFor="extraChairs" className="text-xs text-slate-300">
                  โต๊ะ/เก้าอี้เพิ่มเติม (ตัว):
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={!extraChairsEnabled}
                  value={extraChairsCount}
                  onChange={(e) => setExtraChairsCount(Number(e.target.value))}
                  className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="otherEq"
                  checked={otherEquipmentEnabled}
                  onChange={(e) => setOtherEquipmentEnabled(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <label htmlFor="otherEq" className="text-xs text-slate-300 shrink-0">
                  อื่น ๆ:
                </label>
                <input
                  type="text"
                  disabled={!otherEquipmentEnabled}
                  placeholder="ระบุอุปกรณ์เพิ่มเติม..."
                  value={otherEquipmentText}
                  onChange={(e) => setOtherEquipmentText(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* ส่วนที่ 4: สายการอนุมัติตามแบบฟอร์มวิทยาลัยฯ */}
          <div className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-3.5 text-[11px] text-slate-400">
            <p className="font-semibold text-slate-300 mb-2">
              สายการรับรองและพิจารณาอนุมัติ (งานศูนย์ดิจิทัลและสื่อสารองค์กร):
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2">
                <span className="text-cyan-400 font-semibold">1. หัวหน้างาน/ผู้รับรอง:</span>
                <p className="text-slate-200 mt-0.5">นายเอกราช เขียวทอง</p>
                <p className="text-[10px] text-slate-500">หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2">
                <span className="text-emerald-400 font-semibold">2. เจ้าหน้าที่ผู้ตรวจสอบห้อง:</span>
                <p className="text-slate-200 mt-0.5">นายวัชรพงศ์ โสภา</p>
                <p className="text-[10px] text-slate-500">เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2">
                <span className="text-violet-400 font-semibold">3. ผู้พิจารณา:</span>
                <p className="text-slate-200 mt-0.5">นายชาตรี เริงชัยภูมิ</p>
                <p className="text-[10px] text-slate-500">รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน</p>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-amber-300/90">
              * ข้าพเจ้าขอรับรองว่าจะดูแลรักษาทรัพย์สินของทางราชการ และปฏิบัติตามระเบียบของวิทยาลัยโดยเคร่งครัด
            </p>
          </div>

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
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึกคำขอ...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> ยื่นคำขออนุญาตใช้ห้องประชุม
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
