import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 py-16 border-t border-stone-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Quote Row */}
        <div className="pb-12 border-b border-stone-800">
          <blockquote className="max-w-3xl font-serif text-lg sm:text-xl text-stone-200 leading-relaxed italic">
            “행복도 내가 만드는 것이요, 불행도 내가 만드는 것입니다. <br className="hidden sm:inline" />
            내 마음이 맑고 고요하면 이 세상 어디에 서 있든 그 자리가 곧 정토(淨土)입니다.”
          </blockquote>
          <p className="mt-3 text-xs text-stone-400 font-serif">— 지도법사님</p>
        </div>

        {/* 3 Sanctuaries Contact Matrix */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-stone-800 text-xs">
          
          <div>
            <h4 className="font-serif text-sm font-semibold text-white mb-2">
              S 사회문화회관
            </h4>
            <p className="text-stone-400 leading-relaxed">
              서울특별시 서초구 (서초동)<br />
              전화: 02-000-0000<br />
              이용: 도심형 데이 스테이 & 주말 1박 2일
            </p>
          </div>

          <div>
            <h4 className="font-serif text-sm font-semibold text-white mb-2">
              M 수련원
            </h4>
            <p className="text-stone-400 leading-relaxed">
              경상북도 문경시<br />
              전화: 000-000-0000<br />
              이용: 백일출가, 집중 묵언 명상수련, 산사 쉼스테이
            </p>
          </div>

          <div>
            <h4 className="font-serif text-sm font-semibold text-white mb-2">
              J 정사
            </h4>
            <p className="text-stone-400 leading-relaxed">
              전북특별자치도 장수군 <br />
              전화: 000-000-0000<br />
              이용: 대나무 숲길 포행
            </p>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-stone-400 font-medium">템플스테이</span>
            <span aria-hidden="true">·</span>
            <span>사단법인 J</span>
            <span aria-hidden="true">·</span>
            <span>맑은 마음, 좋은 벗, 깨끗한 땅</span>
          </div>

          <p>Test 버전입니다.</p>
        </div>

      </div>
    </footer>
  );
};
