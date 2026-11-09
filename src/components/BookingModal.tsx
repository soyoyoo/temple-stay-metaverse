import React, { useState } from 'react';
import { TEMPLES } from '../data/templesData';
import { sound } from '../utils/soundEngine';
import { X, Calendar, User, Phone, Mail, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

export interface BookingRecord {
  id: string;
  bookingCode: string;
  templeId: string;
  templeName: string;
  stayType: string;
  checkInDate: string;
  checkOutDate: string;
  roomType: string;
  applicantName: string;
  phone: string;
  email: string;
  intention: string;
  createdAt: string;
  status: '예약 완료' | '체험 완료' | '취소됨';
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTempleId?: string;
  onBookingSuccess: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  defaultTempleId = 'mungyeong',
  onBookingSuccess,
}) => {
  const [selectedTemple, setSelectedTemple] = useState(defaultTempleId);
  const [stayType, setStayType] = useState('1박 2일 휴식형 템플스테이');
  const [checkInDate, setCheckInDate] = useState('2026-11-14');
  const [checkOutDate, setCheckOutDate] = useState('2026-11-15');
  const [roomType, setRoomType] = useState('도반 공동 방사 (2~3인)');
  const [applicantName, setApplicantName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [intention, setIntention] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  if (!isOpen) return null;

  const currentTempleObj = TEMPLES.find((t) => t.id === selectedTemple) || TEMPLES[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !phone.trim()) return;

    const bookingCode = `JT-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

    const newBooking: BookingRecord = {
      id: `book-${Date.now()}`,
      bookingCode,
      templeId: selectedTemple,
      templeName: currentTempleObj.name,
      stayType,
      checkInDate,
      checkOutDate,
      roomType,
      applicantName: applicantName.trim(),
      phone: phone.trim(),
      email: email.trim() || '미입력',
      intention: intention.trim() || '내면의 고요함을 찾고 나를 돌아보기 위함',
      createdAt: new Date().toLocaleDateString('ko-KR'),
      status: '예약 완료',
    };

    const existing = localStorage.getItem('jungto_user_bookings');
    const bookingsList: BookingRecord[] = existing ? JSON.parse(existing) : [];
    bookingsList.unshift(newBooking);
    localStorage.setItem('jungto_user_bookings', JSON.stringify(bookingsList));

    sound.playTempleGong();
    setConfirmedBooking(newBooking);
    onBookingSuccess();
  };

  const handleClose = () => {
    setConfirmedBooking(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#FBF9F5] rounded-2xl border border-stone-200 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-serif text-stone-500 uppercase tracking-wider block">
              정토회 산사 템플스테이 신청
            </span>
            <h3 className="text-lg font-serif font-semibold text-stone-900">
              {confirmedBooking ? '예약 신청 접수 완료' : '마음의 쉼표, 사찰 머뭄 신청'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {confirmedBooking ? (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-serif text-stone-500">신청 예약 번호</span>
              <p className="text-2xl font-mono font-bold text-stone-900 mt-0.5">
                {confirmedBooking.bookingCode}
              </p>
              <p className="text-sm font-serif text-stone-700 mt-2">
                <strong>{confirmedBooking.applicantName}</strong> 도반님의 템플스테이 신청이 정상 접수되었습니다.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-stone-200 text-left text-xs text-stone-700 space-y-2 font-sans">
              <div className="flex justify-between">
                <span className="text-stone-500">수행 도량:</span>
                <strong className="text-stone-900 font-serif">{confirmedBooking.templeName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">프로그램:</span>
                <span>{confirmedBooking.stayType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">머무는 일정:</span>
                <span className="font-mono">{confirmedBooking.checkInDate} ~ {confirmedBooking.checkOutDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">방사 유형:</span>
                <span>{confirmedBooking.roomType}</span>
              </div>
            </div>

            <p className="text-xs text-stone-500 font-serif leading-relaxed">
              입재 당일 오후 2시까지 도량 종무소로 방문해 주시기 바랍니다. <br />
              참가 확정 및 오시는 길 안내 문자가 입력하신 연락처로 발송됩니다.
            </p>

            <button
              onClick={handleClose}
              className="w-full py-3 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs"
            >
              확인 및 닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            
            {/* Sanctuary Selector */}
            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1">
                01. 수행 도량 선택 (전국 3대 사찰)
              </label>
              <select
                value={selectedTemple}
                onChange={(e) => setSelectedTemple(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
              >
                {TEMPLES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.region})
                  </option>
                ))}
              </select>
            </div>

            {/* Stay Type */}
            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1">
                02. 스테이 유형
              </label>
              <select
                value={stayType}
                onChange={(e) => setStayType(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
              >
                <option value="1박 2일 휴식형 템플스테이">1박 2일 휴식형 템플스테이 (숲길 걷기와 차담 중심)</option>
                <option value="2박 3일 집중 묵언 명상 스테이">2박 3일 집중 묵언 명상 스테이 (위빠사나 및 108배)</option>
                <option value="당일 저녁 마음챙김 데이">당일 저녁 마음챙김 데이 (명상 & 법문 청취)</option>
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-serif font-medium text-stone-700 mb-1">
                  입재일 (체크인)
                </label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-serif font-medium text-stone-700 mb-1">
                  회향일 (체크아웃)
                </label>
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>
            </div>

            {/* Room Type */}
            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1">
                03. 방사(숙소) 형태
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  '도반 공동 방사 (2~3인)',
                  '개인 묵언실 (1인 단독 방사)',
                ].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRoomType(type)}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      roomType === type
                        ? 'border-stone-800 bg-white font-medium text-stone-900 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Applicant Info */}
            <div className="pt-2 border-t border-stone-200 space-y-3">
              <span className="block text-xs font-serif font-medium text-stone-700">
                04. 신청자 인적 사항
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">성명</label>
                  <input
                    type="text"
                    placeholder="홍길동"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">연락처 (휴대폰)</label>
                  <input
                    type="tel"
                    placeholder="010-0000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-stone-600 mb-1">이메일 (선택)</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-600 mb-1">
                  이번 스테이에 임하는 마음가짐 또는 남기실 말씀
                </label>
                <textarea
                  rows={2}
                  placeholder="예: 지친 마음을 비우고 108배와 명상을 통해 마음의 안정을 찾고 싶습니다."
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-3.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs"
              >
                예약 신청 접수하기
              </button>
              <p className="text-[11px] text-stone-500 text-center mt-2 font-serif">
                정토회 템플스테이는 상업적 영리를 추구하지 않으며 자발적 보시로 운영됩니다.
              </p>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
