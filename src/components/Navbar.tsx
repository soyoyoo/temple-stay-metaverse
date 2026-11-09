import React, { useState } from 'react';
import { Menu, X, CalendarCheck, Compass } from 'lucide-react';

interface NavbarProps {
  onOpenBooking: (templeId?: string) => void;
  onOpenMyBookings: () => void;
  activeSection: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenBooking, onOpenMyBookings, activeSection }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-stone-200/80 transition-all">
      {/* Top Bar Contract: Zone 1 (Brand) - Zone 2 (4-5 nav links) - Zone 3 (1 primary CTA) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single Brand Wordmark */}
        <button
          onClick={() => scrollTo('hero')}
          className="text-left group flex items-center gap-2.5 whitespace-nowrap shrink-0 text-stone-900 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-stone-900 text-[#FBF9F5] flex items-center justify-center font-serif text-sm font-semibold tracking-wider">
            淨
          </div>
          <span className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-stone-900 group-hover:text-stone-700 transition-colors">
            산사 템플스테이
          </span>
        </button>

        {/* Zone 2: 4–5 single-line clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-stone-600">
          <button
            onClick={() => scrollTo('metaverse')}
            className={`transition-colors hover:text-stone-900 whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSection === 'metaverse' ? 'text-stone-900 font-semibold border-b-2 border-stone-800 pb-0.5' : 'text-amber-800 font-medium'
            }`}
          >
            <Compass className="w-4 h-4 text-amber-700" />
            <span>3D 메타버스 도량</span>
          </button>
          <button
            onClick={() => scrollTo('temples')}
            className={`transition-colors hover:text-stone-900 whitespace-nowrap shrink-0 ${
              activeSection === 'temples' ? 'text-stone-900 font-semibold border-b-2 border-stone-800 pb-0.5' : ''
            }`}
          >
            3대 도량 안내
          </button>
          <button
            onClick={() => scrollTo('programs')}
            className={`transition-colors hover:text-stone-900 whitespace-nowrap shrink-0 ${
              activeSection === 'programs' ? 'text-stone-900 font-semibold border-b-2 border-stone-800 pb-0.5' : ''
            }`}
          >
            5대 수행 프로그램
          </button>
          <button
            onClick={() => scrollTo('schedule')}
            className={`transition-colors hover:text-stone-900 whitespace-nowrap shrink-0 ${
              activeSection === 'schedule' ? 'text-stone-900 font-semibold border-b-2 border-stone-800 pb-0.5' : ''
            }`}
          >
            하루 일과
          </button>
          <button
            onClick={() => scrollTo('mindsharing')}
            className={`transition-colors hover:text-stone-900 whitespace-nowrap shrink-0 ${
              activeSection === 'mindsharing' ? 'text-stone-900 font-semibold border-b-2 border-stone-800 pb-0.5' : ''
            }`}
          >
            도반 마음나누기
          </button>
          <button
            onClick={onOpenMyBookings}
            className="flex items-center gap-1.5 transition-colors text-stone-600 hover:text-stone-900 whitespace-nowrap shrink-0"
          >
            <CalendarCheck className="w-4 h-4 text-stone-500" />
            <span>나의 예약</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onOpenBooking()}
            className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 active:scale-[0.99] transition-all shadow-xs whitespace-nowrap shrink-0"
          >
            템플스테이 신청하기
          </button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-stone-700 hover:text-stone-900 lg:hidden rounded-lg hover:bg-stone-200/50 transition-colors"
            aria-label="메뉴 열기"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FBF9F5] border-b border-stone-200 px-4 pt-3 pb-6 space-y-3">
          <button
            onClick={() => scrollTo('metaverse')}
            className="block w-full text-left py-2.5 px-3 text-amber-900 font-semibold bg-amber-50/60 rounded-md"
          >
            🧭 3D 메타버스 산사 도량 체험
          </button>
          <button
            onClick={() => scrollTo('temples')}
            className="block w-full text-left py-2.5 px-3 text-stone-800 font-medium hover:bg-stone-100 rounded-md"
          >
            3대 도량
          </button>
          <button
            onClick={() => scrollTo('programs')}
            className="block w-full text-left py-2.5 px-3 text-stone-800 font-medium hover:bg-stone-100 rounded-md"
          >
            5대 수행 프로그램 (명상·108배·법문·마음나누기·산책)
          </button>
          <button
            onClick={() => scrollTo('schedule')}
            className="block w-full text-left py-2.5 px-3 text-stone-800 font-medium hover:bg-stone-100 rounded-md"
          >
            사찰 하루 일과표
          </button>
          <button
            onClick={() => scrollTo('mindsharing')}
            className="block w-full text-left py-2.5 px-3 text-stone-800 font-medium hover:bg-stone-100 rounded-md"
          >
            도반들과 마음 나누기
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenMyBookings();
            }}
            className="block w-full text-left py-2.5 px-3 text-stone-800 font-medium hover:bg-stone-100 rounded-md"
          >
            나의 예약 내역 확인
          </button>

          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full py-3 text-center text-sm font-medium text-white bg-stone-900 rounded-lg shadow-xs"
            >
              템플스테이 신청하기
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
