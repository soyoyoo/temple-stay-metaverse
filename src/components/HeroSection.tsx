import React from 'react';
import { Sparkles, Calendar, Volume2, ArrowRight } from 'lucide-react';
import { sound } from '../utils/soundEngine';

interface HeroSectionProps {
  onOpenBooking: () => void;
  onExplorePrograms: () => void;
  onSelectTemple: (templeId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenBooking,
  onExplorePrograms,
  onSelectTemple,
}) => {
  const handleRingBell = () => {
    sound.playTempleGong();
  };

  return (
    <section id="hero" className="relative pt-6 pb-12 lg:pt-10 lg:pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 2-Column Balanced Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          
          {/* Left Column: Editorial Narrative */}
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              {/* Clean Unboxed Metadata Kicker */}
              <div className="flex items-center gap-2 text-xs text-stone-600 mb-4 font-serif">
                <span>수행 도량</span>
                <span aria-hidden="true">·</span>
                <span>마음의 평화와 자유</span>
                <span aria-hidden="true">·</span>
                <span>상시 템플스테이</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-serif font-medium leading-[1.25] text-stone-900 tracking-tight text-balance">
                비우고, 멈추고, <br className="hidden sm:inline" />
                다만 지금 여기에 깨어있다
              </h1>

              {/* Editorial Body Prose */}
              <p className="mt-5 text-base sm:text-lg text-stone-600 leading-relaxed font-sans max-w-xl">
                도심의 소음과 복잡한 일상을 잠시 멈추고, 천년 솔바람과 대나무 숲이 품어주는 
                고요한 산사에서 내 안의 참된 평화를 마주합니다. 
                전국 3대 도량에서 5가지 수행으로 지친 몸과 마음을 맑게 비워냅니다.
              </p>

              {/* Sanctuaries Quick Select Bar */}
              <div className="mt-7 pt-6 border-t border-stone-200">
                <p className="text-xs font-serif text-stone-500 mb-3 tracking-wide">
                  선택하여 둘러보기
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => onSelectTemple('seocho')}
                    className="p-3 text-left border border-stone-200/90 rounded-lg hover:border-stone-800 hover:bg-stone-50/70 transition-all group"
                  >
                    <span className="block text-xs font-serif text-stone-500">도심형</span>
                    <span className="block text-sm font-semibold text-stone-900 group-hover:text-stone-700">서울 서초</span>
                    <span className="text-[11px] text-stone-600 block mt-0.5">문화회관</span>
                  </button>

                  <button
                    onClick={() => onSelectTemple('mungyeong')}
                    className="p-3 text-left border border-stone-200/90 rounded-lg hover:border-stone-800 hover:bg-stone-50/70 transition-all group"
                  >
                    <span className="block text-xs font-serif text-stone-500">산사수행</span>
                    <span className="block text-sm font-semibold text-stone-900 group-hover:text-stone-700">경북</span>
                    <span className="text-[11px] text-stone-600 block mt-0.5">수련원</span>
                  </button>

                  <button
                    onClick={() => onSelectTemple('jukrim')}
                    className="p-3 text-left border border-stone-200/90 rounded-lg hover:border-stone-800 hover:bg-stone-50/70 transition-all group"
                  >
                    <span className="block text-xs font-serif text-stone-500">대숲생태</span>
                    <span className="block text-sm font-semibold text-stone-900 group-hover:text-stone-700">전북</span>
                    <span className="text-[11px] text-stone-600 block mt-0.5">정사</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenBooking}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 active:scale-[0.99] transition-all shadow-xs"
              >
                <Calendar className="w-4 h-4" />
                <span>템플스테이 신청하기</span>
              </button>

              <button
                onClick={onExplorePrograms}
                className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-stone-800 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors border border-stone-200/60"
              >
                <span>5대 프로그램 체험</span>
                <ArrowRight className="w-4 h-4 text-stone-500" />
              </button>

              <button
                onClick={handleRingBell}
                className="inline-flex items-center gap-1.5 px-3.5 py-3.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100/70 rounded-lg transition-colors"
                title="맑은 범종 소리 울리기"
              >
                <Volume2 className="w-4 h-4 text-stone-500" />
                <span>종소리 울림</span>
              </button>
            </div>
          </div>

          {/* Right Column: High Fidelity Cinematic Image */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="relative rounded-2xl overflow-hidden border border-stone-200/80 shadow-sm flex-1 min-h-[380px] lg:min-h-[460px] group bg-stone-200">
              <img
                src="/src/assets/images/temple_hero_mountain_1794217871534.jpg"
                alt="새벽안개 속 고즈넉한 한국의 전통 산사 풍경"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                referrerPolicy="no-referrer"
              />
              {/* Subtle Measured Scrim Overlay for Typographic Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
                <span className="text-xs uppercase tracking-widest text-stone-300 font-serif">
                  사계절 자연과 함께하는 쉼터
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-medium mt-1 text-white">
                  세속의 번뇌를 털고 맑은 지혜를 품는 시간
                </h3>
                <p className="text-xs text-stone-300 mt-2 font-sans line-clamp-2">
                  스님의 가르침과 소박한 발우공양, 침묵의 숲길 포행 속에서 스스로의 삶의 주인이 되는 여정
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-Column Operational Utility Strip below Hero Split */}
        <div className="mt-12 pt-8 border-t border-stone-200/90 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-xs font-serif text-stone-500 block">도량 안내</span>
            <p className="text-sm font-semibold text-stone-900">전국 3대 도량</p>
            <p className="text-xs text-stone-600">서울 · 문경 · J 정사</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-serif text-stone-500 block">수행 과목</span>
            <p className="text-sm font-semibold text-stone-900">5대 핵심 프로그램</p>
            <p className="text-xs text-stone-600">명상 · 108배 · 법문 · 나눔 · 산책</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-serif text-stone-500 block">식사 안내</span>
            <p className="text-sm font-semibold text-stone-900">친환경 발우공양</p>
            <p className="text-xs text-stone-600">유기농 비건 채식 제공</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-serif text-stone-500 block">참여 원칙</span>
            <p className="text-sm font-semibold text-stone-900">누구나 환영</p>
            <p className="text-xs text-stone-600">종교 무관 · 자발적 보시제</p>
          </div>
        </div>

      </div>
    </section>
  );
};
