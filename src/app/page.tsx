// src/app/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Sparkles,
  Wifi,
  FileSpreadsheet,
  FolderKanban,
  Printer,
  GraduationCap,
} from 'lucide-react';
import { GOOGLE_WORKSPACE_CONFIG } from '@/lib/google-config';
import DashboardOverview, {
  DashboardMetrics,
} from '@/components/dashboard/DashboardOverview';
import RoomTimelineCalendar, {
  CalendarBookingItem,
} from '@/components/calendar/RoomTimelineCalendar';
import BookingModal, {
  InitialSlotSelection,
  RoomOption,
} from '@/components/booking/BookingModal';
import OfficialPrintModal from '@/components/booking/OfficialPrintModal';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import {
  NotificationBellDropdown,
  RealtimeToastStack,
} from '@/components/notifications/RealtimeNotificationCenter';

// รายชื่อห้องประชุมทั้ง 6 ห้องตามแบบฟอร์ม วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
const INITIAL_ROOMS: RoomOption[] = [
  {
    id: 'room-adireksarn',
    name: 'หอประชุมอดิเรกสาร',
    capacity: 300,
    floor: 'อาคารหอประชุม',
    amenities: ['เครื่องฉายภาพ (Projector)', 'ระบบเสียง', 'ไมโครโฟน', 'เครื่องปรับอากาศ', 'อินเทอร์เน็ต'],
    colorCode: '#06B6D4',
    isActive: true,
  },
  {
    id: 'room-sakthong',
    name: 'ห้องประชุมสักทอง',
    capacity: 80,
    floor: 'อาคารอำนวยการ',
    amenities: ['เครื่องฉายภาพ (Projector)', 'ระบบเสียง', 'ไมโครโฟน', 'เครื่องปรับอากาศ', 'อินเทอร์เน็ต'],
    colorCode: '#8B5CF6',
    isActive: true,
  },
  {
    id: 'room-director',
    name: 'ห้องประชุมหน้าห้องผู้อำนวยการ',
    capacity: 25,
    floor: 'อาคารอำนวยการ ชั้น 2',
    amenities: ['เครื่องฉายภาพ (Projector)', 'ไมโครโฟน', 'เครื่องปรับอากาศ', 'อินเทอร์เน็ต'],
    colorCode: '#10B981',
    isActive: true,
  },
  {
    id: 'room-coffee',
    name: 'ห้องประชุม (กาแฟ)',
    capacity: 30,
    floor: 'โซนคาเฟ่วิทยาลัยฯ',
    amenities: ['เครื่องฉายภาพ (Projector)', 'ระบบเสียง', 'เครื่องปรับอากาศ', 'อินเทอร์เน็ต'],
    colorCode: '#F59E0B',
    isActive: true,
  },
  {
    id: 'room-dome',
    name: 'อาคารโดมเอนกประสงค์',
    capacity: 500,
    floor: 'ลานโดมเอนกประสงค์',
    amenities: ['ระบบเสียง', 'ไมโครโฟน', 'โต๊ะ/เก้าอี้เพิ่มเติม'],
    colorCode: '#3B82F6',
    isActive: true,
  },
  {
    id: 'room-computer-av',
    name: 'ห้องคอมพิวเตอร์กลาง (ห้องโสต)',
    capacity: 50,
    floor: 'ศูนย์ดิจิทัลและสื่อสารองค์กร',
    amenities: ['เครื่องฉายภาพ (Projector)', 'ระบบเสียง', 'ไมโครโฟน', 'เครื่องปรับอากาศ', 'อินเทอร์เน็ต'],
    colorCode: '#EC4899',
    isActive: true,
  },
];

export default function MeetingBookingDashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [rooms] = useState<RoomOption[]>(INITIAL_ROOMS);

  const initialDemoBookings: CalendarBookingItem[] = useMemo(
    () => [
      {
        id: 'bk-tl-1',
        roomId: 'room-sakthong',
        title: 'ประชุมวางแผนพัฒนาหลักสูตรอาชีวศึกษา',
        startTime: new Date(`${todayStr}T09:00:00`).toISOString(),
        endTime: new Date(`${todayStr}T11:30:00`).toISOString(),
        attendeeCount: 45,
        status: 'CONFIRMED',
        user: {
          id: 'usr-1',
          name: 'นายเอกราช เขียวทอง',
          department: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
        },
        formDetails: {
          position: 'หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร',
          department: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
          phone: '081-234-5678',
          equipmentList: [
            'เครื่องฉายภาพ (Projector)',
            'ระบบเสียง',
            'ไมโครโฟน',
            'เครื่องปรับอากาศ',
            'อินเทอร์เน็ต',
          ],
          extraChairsCount: 0,
        },
      },
      {
        id: 'bk-tl-2',
        roomId: 'room-computer-av',
        title: 'อบรมเชิงปฏิบัติการระบบเครือข่ายและสื่อดิจิทัล',
        startTime: new Date(`${todayStr}T13:00:00`).toISOString(),
        endTime: new Date(`${todayStr}T16:00:00`).toISOString(),
        attendeeCount: 40,
        status: 'CONFIRMED',
        user: {
          id: 'usr-2',
          name: 'นายวัชรพงศ์ โสภา',
          department: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
        },
        formDetails: {
          position: 'เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร',
          department: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
          phone: '089-876-5432',
          equipmentList: [
            'เครื่องฉายภาพ (Projector)',
            'ระบบเสียง',
            'ไมโครโฟน',
            'เครื่องปรับอากาศ',
            'อินเทอร์เน็ต',
          ],
          extraChairsCount: 10,
        },
      },
    ],
    [todayStr]
  );

  const {
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
  } = useRealtimeBookings({
    currentUserId: 'demo-user-01',
    selectedDate,
    initialBookings: initialDemoBookings,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] =
    useState<InitialSlotSelection | null>(null);
  const [printingBooking, setPrintingBooking] =
    useState<CalendarBookingItem | null>(null);

  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    const now = Date.now();
    const activeRooms = rooms.filter((r) => r.isActive);
    const maintenanceRooms = rooms.length - activeRooms.length;

    const occupiedRoomIds = new Set(
      bookings
        .filter((b) => {
          const s = new Date(b.startTime).getTime();
          const e = new Date(b.endTime).getTime();
          return b.status === 'CONFIRMED' && now >= s && now < e;
        })
        .map((b) => b.roomId)
    );

    const availableRoomsNow = Math.max(
      0,
      activeRooms.length - occupiedRoomIds.size
    );

    return {
      availableRoomsNow,
      totalActiveRooms: activeRooms.length,
      maintenanceRooms,
      bookingsToday: bookings.filter((b) => b.status === 'CONFIRMED').length,
      bookingsDeltaPercent: 18,
      occupancyRate: Math.min(
        100,
        Math.round(
          (bookings.filter((b) => b.status === 'CONFIRMED').length / 6) * 100
        )
      ),
      peakHourRange: '09:00 - 11:30 น.',
      hourlyTrend: [
        { hour: '08:00', bookings: 1, occupancy: 20 },
        { hour: '09:00', bookings: 4, occupancy: 75 },
        { hour: '10:00', bookings: 5, occupancy: 90 },
        { hour: '11:00', bookings: 4, occupancy: 80 },
        { hour: '12:00', bookings: 1, occupancy: 15 },
        { hour: '13:00', bookings: 4, occupancy: 70 },
        { hour: '14:00', bookings: 5, occupancy: 85 },
        { hour: '15:00', bookings: 4, occupancy: 70 },
        { hour: '16:00', bookings: 2, occupancy: 40 },
        { hour: '17:00', bookings: 1, occupancy: 20 },
      ],
      roomUsageRanking: rooms.map((r, i) => ({
        roomName: r.name.replace('ห้องประชุม', '').trim().slice(0, 14),
        hoursUsed: [28, 24, 16, 14, 12, 22][i] || 10,
        colorCode: r.colorCode,
        status: !r.isActive
          ? 'MAINTENANCE'
          : occupiedRoomIds.has(r.id)
          ? 'OCCUPIED'
          : 'AVAILABLE',
      })),
    };
  }, [rooms, bookings]);

  const handleSelectEmptySlot = (slot: InitialSlotSelection) => {
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-[130px]" />
      </div>

      <RealtimeToastStack toasts={toasts} onDismiss={dismissToast} />

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                <GraduationCap className="h-3.5 w-3.5" /> งานศูนย์ดิจิทัลและสื่อสารองค์กร
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400">
                <Wifi
                  className={`h-3 w-3 ${
                    isConnected ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
                {isConnected ? 'Real-time Socket Connected' : 'Live Sync Ready'}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              ระบบขออนุญาตใช้ห้องประชุม วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              ผู้รับรอง: นายเอกราช เขียวทอง • ผู้ตรวจสอบห้อง: นายวัชรพงศ์ โสภา • ผู้พิจารณา: นายชาตรี เริงชัยภูมิ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={GOOGLE_WORKSPACE_CONFIG.SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition-all hover:-translate-y-0.5 hover:bg-emerald-500/20"
            >
              <FileSpreadsheet className="h-4 w-4" /> เปิด Google Sheet ตารางจอง
            </a>

            <a
              href={GOOGLE_WORKSPACE_CONFIG.DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-300 transition-all hover:-translate-y-0.5 hover:bg-blue-500/20"
            >
              <FolderKanban className="h-4 w-4" /> โฟลเดอร์ Google Drive
            </a>

            {bookings.length > 0 && (
              <button
                type="button"
                onClick={() => setPrintingBooking(bookings[bookings.length - 1])}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-300 transition-all hover:-translate-y-0.5 hover:bg-amber-500/20"
              >
                <Printer className="h-4 w-4" /> พิมพ์แบบคำขออนุญาต (PDF)
              </button>
            )}

            <NotificationBellDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              pushPermission={pushPermission}
              onRequestPushPermission={requestPushPermission}
              onMarkAllRead={markAllNotificationsAsRead}
            />

            <button
              type="button"
              onClick={() =>
                handleSelectEmptySlot({
                  roomId: rooms[0].id,
                  dateStr: selectedDate,
                  startHour: '09:00',
                  endHour: '11:00',
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-500/40"
            >
              <Plus className="h-4 w-4" /> ยื่นคำขอใช้ห้องประชุม
            </button>
          </div>
        </header>

        <DashboardOverview metrics={dashboardMetrics} />

        <RoomTimelineCalendar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          rooms={rooms}
          bookings={bookings}
          onSelectEmptySlot={handleSelectEmptySlot}
          onSelectBooking={(booking) => setPrintingBooking(booking)}
        />

        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          rooms={rooms}
          existingBookings={bookings}
          initialSlot={selectedSlot}
          currentUserId="demo-user-01"
          onBookingSuccess={(newBooking) => {
            addBookingOptimistic(newBooking);
            setPrintingBooking(newBooking);
          }}
        />

        <OfficialPrintModal
          booking={printingBooking}
          rooms={rooms}
          onClose={() => setPrintingBooking(null)}
        />
      </main>
    </div>
  );
}
