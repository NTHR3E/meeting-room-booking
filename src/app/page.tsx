// src/app/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Sparkles, Wifi, FileSpreadsheet, FolderKanban } from 'lucide-react';
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
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import {
  NotificationBellDropdown,
  RealtimeToastStack,
} from '@/components/notifications/RealtimeNotificationCenter';

const INITIAL_ROOMS: RoomOption[] = [
  {
    id: 'room-orbit-1',
    name: 'Orbit Boardroom A',
    capacity: 16,
    floor: '12A',
    amenities: ['4K Laser Projector', 'Video Conference', 'Digital Whiteboard'],
    colorCode: '#06B6D4',
    isActive: true,
  },
  {
    id: 'room-nebula-2',
    name: 'Nebula Creative Hub',
    capacity: 8,
    floor: '12A',
    amenities: ['Smart TV 75"', 'Whiteboard', 'Soundbar'],
    colorCode: '#8B5CF6',
    isActive: true,
  },
  {
    id: 'room-gravity-3',
    name: 'Gravity Focus Pod',
    capacity: 6,
    floor: '14',
    amenities: ['Dual Monitor', 'Video Conference'],
    colorCode: '#10B981',
    isActive: true,
  },
  {
    id: 'room-zenith-4',
    name: 'Zenith Auditorium',
    capacity: 30,
    floor: '15',
    amenities: ['Stage Mic System', 'Dual Projector', 'Recording System'],
    colorCode: '#F59E0B',
    isActive: false,
  },
];

export default function MeetingBookingDashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [rooms] = useState<RoomOption[]>(INITIAL_ROOMS);

  const initialDemoBookings: CalendarBookingItem[] = useMemo(
    () => [
      {
        id: 'bk-demo-1',
        roomId: 'room-orbit-1',
        title: 'Architecture Design Review',
        startTime: new Date(`${todayStr}T09:00:00`).toISOString(),
        endTime: new Date(`${todayStr}T11:00:00`).toISOString(),
        attendeeCount: 10,
        status: 'CONFIRMED',
        user: {
          id: 'usr-1',
          name: 'คุณธนภัทร (Senior Architect)',
          department: 'Engineering',
        },
      },
      {
        id: 'bk-demo-2',
        roomId: 'room-nebula-2',
        title: 'UX/UI Sprint Sync',
        startTime: new Date(`${todayStr}T13:00:00`).toISOString(),
        endTime: new Date(`${todayStr}T15:00:00`).toISOString(),
        attendeeCount: 6,
        status: 'CONFIRMED',
        user: {
          id: 'usr-2',
          name: 'คุณพิมพ์ชนก (Product Design)',
          department: 'Design',
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
          (bookings.filter((b) => b.status === 'CONFIRMED').length / 8) * 100
        )
      ),
      peakHourRange: '10:00 - 11:30 น.',
      hourlyTrend: [
        { hour: '08:00', bookings: 1, occupancy: 25 },
        { hour: '09:00', bookings: 3, occupancy: 75 },
        { hour: '10:00', bookings: 4, occupancy: 92 },
        { hour: '11:00', bookings: 3, occupancy: 80 },
        { hour: '12:00', bookings: 1, occupancy: 20 },
        { hour: '13:00', bookings: 3, occupancy: 70 },
        { hour: '14:00', bookings: 4, occupancy: 88 },
        { hour: '15:00', bookings: 3, occupancy: 72 },
        { hour: '16:00', bookings: 2, occupancy: 50 },
        { hour: '17:00', bookings: 1, occupancy: 30 },
      ],
      roomUsageRanking: rooms.map((r, i) => ({
        roomName: r.name.split(' ')[0],
        hoursUsed: [26, 21, 15, 6][i] || 10,
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
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" /> Smart Workspace OS
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
              ระบบจองห้องประชุมและวิเคราะห์การใช้งาน (Meeting Room Hub)
            </h1>
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
                  startHour: '10:00',
                  endHour: '11:00',
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-500/40"
            >
              <Plus className="h-4 w-4" /> จองห้องประชุมใหม่
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
        />

        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          rooms={rooms}
          existingBookings={bookings}
          initialSlot={selectedSlot}
          currentUserId="demo-user-01"
          onBookingSuccess={addBookingOptimistic}
        />
      </main>
    </div>
  );
}
