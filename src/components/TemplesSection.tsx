import React, { useState } from 'react';
import { TEMPLES, Temple } from '../data/templesData';
import { MapPin, Navigation, Bus, Car, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';

interface TemplesSectionProps {
  onOpenBooking: (templeId: string) => void;
  selectedTempleId: string;
  onSelectTemple: (id: string) => void;
}

export const TemplesSection: React.FC<TemplesSectionProps> = ({
  onOpenBooking,
  selectedTempleId,
  onSelectTemple,
}) => {
  const currentTemple = TEMPLES.find((t) => t.id === selectedTempleId) || TEMPLES[0];
  const [activeTab, setActiveTab] = useState<'info' | 'facilities' | 'transit' | 'stays'>('info');

  return (
    <section id="temples" className="py-16 sm:py-20 border-t border-stone-200/80 bg-[#F7F4EE]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-serif mb-2">
            <span>전국 3대 도량</span>
            <span aria-hidden="true">·</span>
            <span>도심형 · 산사수행형 · 대숲생태형</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-medium text-stone-900 tracking-tight">
            몸과 마음을 기대어 쉬는 3개의 안식처
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed font-sans">
            도심 속 오아시스인 사회문화회관, 백일출가의 본향 수련원, 
            푸른 대나무 숲이 살아 숨 쉬는 J정사까지. 
            원하는 수행의 결에 따라 머무실 수 있습니다.
          </p>
        </div>

        {/* Temple Selector Segmented Controls */}
        <div className="mt-8 flex flex-wrap gap-2 p-1.5 bg-stone-200/60 rounded-xl max-w-2xl">
          {TEMPLES.map((temple) => (
            <button
              key={temple.id}
              onClick={() => onSelectTemple(temple.id)}
              className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all text-center whitespace-nowrap ${
                selectedTempleId === temple.id
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="block font-serif text-stone-400 text-[11px]">{temple.region}</span>
              <span>{temple.name.replace('사회문화회관', '')}</span>
            </button>
          ))}
        </div>

        {/* Current Temple Presentation Card */}
        <div className="mt-8 bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-xs">
          
          {/* Top Banner Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* Image Box */}
            <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-[440px] bg-stone-100 overflow-hidden">
              <img
                src={currentTemple.image}
                alt={currentTemple.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-stone-950/70 backdrop-blur-xs text-white text-xs px-3 py-1 rounded-md font-serif">
                {currentTemple.region}
              </div>
            </div>

            {/* Main Info Box */}
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-2xl sm:text-3xl font-serif font-medium text-stone-900">
                    {currentTemple.name}
                  </h3>
                  <span className="text-xs text-stone-500 font-serif">
                    {currentTemple.hanjaName}
                  </span>
                </div>
                
                <p className="mt-1 text-sm font-medium text-stone-700 font-serif">
                  {currentTemple.subName}
                </p>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-500 font-sans">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                  <span>{currentTemple.location}</span>
                </div>

                <p className="mt-4 text-sm sm:text-base text-stone-600 leading-relaxed font-sans">
                  {currentTemple.description}
                </p>

                {/* Highlights List */}
                <div className="mt-6 space-y-2.5">
                  <p className="text-xs font-serif text-stone-700 tracking-wide font-medium">
                    도량 주요 특징 및 장점
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                    {currentTemple.highlightPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-stone-700 shrink-0 mt-0.5" />
                        <span className="leading-snug">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-stone-500 font-serif">
                  <span>추천 스테이: </span>
                  <strong className="text-stone-800">{currentTemple.stayConcept}</strong>
                </div>

                <button
                  onClick={() => onOpenBooking(currentTemple.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs whitespace-nowrap"
                >
                  <Calendar className="w-4 h-4" />
                  <span>이 도량으로 템플스테이 예약</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sub Tab Navigation for In-depth Details */}
          <div className="border-t border-stone-200 bg-stone-50/70 px-6 sm:px-8 py-3 flex gap-6 text-xs sm:text-sm font-medium text-stone-600 overflow-x-auto">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-1 transition-colors whitespace-nowrap ${
                activeTab === 'info' ? 'text-stone-900 border-b-2 border-stone-900 font-semibold' : 'hover:text-stone-900'
              }`}
            >
              스테이 프로그램 종류
            </button>
            <button
              onClick={() => setActiveTab('facilities')}
              className={`pb-1 transition-colors whitespace-nowrap ${
                activeTab === 'facilities' ? 'text-stone-900 border-b-2 border-stone-900 font-semibold' : 'hover:text-stone-900'
              }`}
            >
              시설 및 공간 안내
            </button>
            <button
              onClick={() => setActiveTab('transit')}
              className={`pb-1 transition-colors whitespace-nowrap ${
                activeTab === 'transit' ? 'text-stone-900 border-b-2 border-stone-900 font-semibold' : 'hover:text-stone-900'
              }`}
            >
              찾아오시는 길 & 교통편
            </button>
          </div>

          {/* Sub Tab Content */}
          <div className="p-6 sm:p-8 bg-white border-t border-stone-100">
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentTemple.stayTypes.map((stay, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/40 hover:bg-stone-50 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-stone-900 font-serif">{stay.title}</h4>
                        <span className="text-xs text-stone-500 font-mono">{stay.duration}</span>
                      </div>
                      <p className="mt-2 text-xs text-stone-600 leading-relaxed font-sans">
                        대상: {stay.target}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
                      <span className="text-stone-500">참가비: {stay.cost}</span>
                      <button
                        onClick={() => onOpenBooking(currentTemple.id)}
                        className="text-stone-900 font-semibold hover:underline flex items-center gap-1"
                      >
                        신청하기 <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'facilities' && (
              <div>
                <p className="text-xs text-stone-500 mb-3 font-serif">
                  도량 내 이용 가능한 주요 수행 및 편의 공간
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentTemple.facilities.map((f, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 text-xs text-stone-700 bg-stone-100 border border-stone-200 rounded-md font-sans"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'transit' && (
              <div className="space-y-4 text-xs sm:text-sm text-stone-700">
                <div className="flex items-start gap-3">
                  <Bus className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-stone-900">대중교통 이용 안내</strong>
                    <p className="mt-0.5 text-stone-600">{currentTemple.transportation.publicTransit}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Car className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-stone-900">승용차 및 주차 안내</strong>
                    <p className="mt-0.5 text-stone-600">{currentTemple.transportation.carDirections}</p>
                    <p className="mt-0.5 text-stone-500">주차 정보: {currentTemple.transportation.parking}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};
