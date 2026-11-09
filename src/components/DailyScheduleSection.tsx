import React, { useState } from 'react';
import { Clock, Sun, Moon, Sparkles, Check, AlertCircle } from 'lucide-react';

interface DailyScheduleSectionProps {
  onOpenBooking: () => void;
}

export const DailyScheduleSection: React.FC<DailyScheduleSectionProps> = ({ onOpenBooking }) => {
  const [activeDay, setActiveDay] = useState<'day1' | 'day2'>('day1');

  const DAY1_SCHEDULE = [
    { time: '14:00 - 15:00', title: '입재 및 방사(숙소) 배정', desc: '도량 도착, 수련복 지급 및 방사 안내, 전자기기 자율 보관' },
    { time: '15:00 - 16:00', title: '오리엔테이션 & 사찰 기본 예절', desc: '합장, 차수, 절하는 법, 묵언의 의미와 템플스테이 마음가짐 공유' },
    { time: '16:00 - 17:30', title: '숲길 묵언 포행 (산책)', desc: '사찰 주변 원시림 및 대나무 숲길을 천천히 걸으며 발바닥 감각 알아차리기' },
    { time: '17:30 - 18:30', title: '정갈한 저녁 발우공양', desc: '자연과 농부의 땀방울에 감사하며 남김없이 비워내는 친환경 식사' },
    { time: '18:30 - 19:30', title: '저녁 범종 타종 & 저녁 예불', desc: '온 우주에 울려 퍼지는 맑은 쇠북소리를 들으며 번뇌를 정화하는 예불' },
    { time: '19:30 - 20:30', title: '스님 영상 법문 청취', desc: '일상의 갈등을 지혜롭게 푸는 즉문즉설 시청 및 개인 성찰' },
    { time: '20:30 - 21:30', title: '도반들과 따뜻한 마음나누기', desc: '평가와 조언 없이 오늘 하루 자신의 마음 상태를 진솔하게 털어놓고 경청하기' },
    { time: '21:30 - ', title: '취침 및 소등 (묵언의 밤)', desc: '하루의 모든 분별을 내려놓고 깊은 쉼 속으로 들어가는 시간' },
  ];

  const DAY2_SCHEDULE = [
    { time: '04:30 - 05:00', title: '청아한 도량석 & 새벽 예불', desc: '사찰의 아침을 여는 목탁 소리와 함께 하루를 맑게 시작' },
    { time: '05:00 - 06:00', title: '하심과 나를 비우는 108배', desc: '1배마다 참회와 감사의 서원을 새기며 몸과 마음의 때를 씻어냄' },
    { time: '06:00 - 07:00', title: '고요한 아침 호흡 명상', desc: '코끝을 스치는 자연의 숨결을 있는 그대로 알아차리는 정좌(靜坐)' },
    { time: '07:00 - 08:30', title: '아침 발우공양 & 마음챙김 운력', desc: '정갈한 채식 아침 식사 및 도량을 깨끗이 빗질하는 노동 수행' },
    { time: '08:30 - 10:00', title: '따스한 솔바람 차담', desc: '도반들과 맑은 작설차를 나누며 수련 중 느낀 소회를 나누는 시간' },
    { time: '10:00 - 11:00', title: '회향식 (마무리 및 귀가)', desc: '삶의 터전으로 돌아가서도 일상 수행자로 살아갈 것을 다짐하며 회향' },
  ];

  return (
    <section id="schedule" className="py-16 sm:py-24 border-t border-stone-200/90 bg-[#F7F4EE]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-serif mb-2">
            <span>산사 하루 일과</span>
            <span aria-hidden="true">·</span>
            <span>1박 2일 휴식 및 정진형 표준 타임테이블</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-medium text-stone-900 tracking-tight">
            자연의 호흡과 함께 흘러가는 사찰의 하루
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed font-sans">
            새벽 4시 반 예불부터 밤 9시 반 취침까지, 세속의 시계를 잠시 벗어놓고 
            해와 달의 흐름에 몸을 맡깁니다.
          </p>
        </div>

        {/* Schedule Presentation */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Timetable */}
          <div className="lg:col-span-8 bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
            {/* Day Selector Tabs */}
            <div className="flex items-center gap-2 border-b border-stone-200 pb-4 mb-6">
              <button
                onClick={() => setActiveDay('day1')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeDay === 'day1'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>첫째 날: 멈춤과 비움 (Day 1)</span>
              </button>

              <button
                onClick={() => setActiveDay('day2')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeDay === 'day2'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>둘째 날: 깨어남과 회향 (Day 2)</span>
              </button>
            </div>

            {/* Timetable Rows */}
            <div className="space-y-4">
              {(activeDay === 'day1' ? DAY1_SCHEDULE : DAY2_SCHEDULE).map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 p-3.5 rounded-xl hover:bg-stone-50/70 transition-colors border-b border-stone-100 last:border-b-0"
                >
                  <div className="sm:w-36 shrink-0">
                    <span className="font-mono text-xs font-semibold text-stone-700 tabular-nums">
                      {item.time}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-serif font-medium text-stone-900">
                      {item.title}
                    </h4>
                    <p className="text-xs text-stone-600 font-sans mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Retreat Rules & Preparation */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Principles Card */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs">
              <h3 className="text-base font-serif font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>도량 머뭄의 4대 약속</span>
              </h3>
              <ul className="text-xs text-stone-600 space-y-3 font-sans">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-stone-800 shrink-0 mt-0.5" />
                  <span><strong>묵언(默言)과 침묵:</strong> 도량 내에서는 필요한 대화 외에는 침묵하며 내면을 들여다봅니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-stone-800 shrink-0 mt-0.5" />
                  <span><strong>디지털 디톡스:</strong> 수련 시작 시 스마트폰을 전용 보관함에 맡기고 전자기기 사용을 멈춥니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-stone-800 shrink-0 mt-0.5" />
                  <span><strong>단정한 복장:</strong> 노출이 심한 옷이나 화려한 장신구를 피하고 단정한 차림을 유지합니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-stone-800 shrink-0 mt-0.5" />
                  <span><strong>소박한 채식:</strong> 도량 내에서는 육류, 생선, 음주, 흡연이 엄격히 금지됩니다.</span>
                </li>
              </ul>
            </div>

            {/* Preparation Card */}
            <div className="bg-[#FBF9F5] border border-stone-200 rounded-2xl p-6">
              <h3 className="text-sm font-serif font-semibold text-stone-900 mb-2">
                준비물 안내
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans mb-4">
                개인 세면도구(칫솔, 수건), 편안한 운동화, 개인 텀블러, 여벌 양말 및 속옷을 준비해 오시면 됩니다. 
                (수련복 조끼와 바지는 도량에서 무료로 대여해 드립니다.)
              </p>

              <button
                onClick={onOpenBooking}
                className="w-full py-3 text-center text-xs font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs"
              >
                1박 2일 템플스테이 예약하기
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
