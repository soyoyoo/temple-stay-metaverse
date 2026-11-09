import React, { useState, useEffect } from 'react';
import { BookingRecord } from './BookingModal';
import { X, Calendar, MapPin, User, CheckCircle2, Trash2 } from 'lucide-react';

interface MyReservationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewBooking: () => void;
}

export const MyReservationsDrawer: React.FC<MyReservationsDrawerProps> = ({
  isOpen,
  onClose,
  onOpenNewBooking,
}) => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('jungto_user_bookings');
      if (stored) {
        try {
          setBookings(JSON.parse(stored));
        } catch {
          setBookings([]);
        }
      } else {
        setBookings([]);
      }
    }
  }, [isOpen]);

  const handleCancelBooking = (bookingId: string) => {
    if (window.confirm('예약을 취소하시겠습니까?')) {
      const updated = bookings.filter((b) => b.id !== bookingId);
      setBookings(updated);
      localStorage.setItem('jungto_user_bookings', JSON.stringify(updated));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-[#FBF9F5] h-full shadow-2xl flex flex-col justify-between border-l border-stone-200">
        
        {/* Header */}
        <div className="p-6 bg-white border-b border-stone-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-serif text-stone-500 uppercase tracking-wider block">
              템플스테이
            </span>
            <h3 className="text-lg font-serif font-semibold text-stone-900">
              나의 예약 내역
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of bookings */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {bookings.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-sm font-serif text-stone-700">접수된 예약 내역이 없습니다.</p>
              <p className="text-xs text-stone-500">
                머물고 싶은 도량으로 신청해 보세요.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenNewBooking();
                }}
                className="mt-2 inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800"
              >
                새 템플스테이 신청하기
              </button>
            </div>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="p-5 rounded-xl border border-stone-200 bg-white shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                    {b.bookingCode}
                  </span>
                  <span className="text-xs font-serif text-emerald-800 font-medium">
                    {b.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-serif font-semibold text-stone-900">
                    {b.templeName}
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">{b.stayType}</p>
                </div>

                <div className="text-xs text-stone-600 space-y-1 pt-2 border-t border-stone-100">
                  <div className="flex justify-between">
                    <span className="text-stone-400">일정:</span>
                    <span className="font-mono">{b.checkInDate} ~ {b.checkOutDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">신청자:</span>
                    <span>{b.applicantName} ({b.phone})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">숙소 유형:</span>
                    <span>{b.roomType}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                  <span className="text-[11px] text-stone-400">신청일: {b.createdAt}</span>
                  <button
                    onClick={() => handleCancelBooking(b.id)}
                    className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>예약 취소</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-stone-200">
          <button
            onClick={() => {
              onClose();
              onOpenNewBooking();
            }}
            className="w-full py-3 text-xs font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs"
          >
            새로운 도량 예약 신청
          </button>
        </div>

      </div>
    </div>
  );
};
