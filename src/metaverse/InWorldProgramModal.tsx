import React, { useState, useEffect } from 'react';
import {
  PROGRAMS_CATALOG,
  BOWS_108_LIST,
  DHARMA_TALKS,
  INITIAL_MIND_POSTS,
  MindSharePost,
  WALKING_COURSES,
  DharmaTalk,
} from '../data/programsData';
import { sound } from '../utils/soundEngine';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  BookOpen,
  Copy,
  Check,
  Footprints,
  Compass,
} from 'lucide-react';

interface InWorldProgramModalProps {
  programId: 'meditation' | 'bows108' | 'dharma' | 'mindshare' | 'walking' | 'booking' | null;
  onClose: () => void;
  templeId: 'seocho' | 'mungyeong' | 'jukrim';
}

export const InWorldProgramModal: React.FC<InWorldProgramModalProps> = ({
  programId,
  onClose,
  templeId,
}) => {
  // 1. Meditation state
  const [medDuration, setMedDuration] = useState(300);
  const [medTimeLeft, setMedTimeLeft] = useState(300);
  const [isMedRunning, setIsMedRunning] = useState(false);
  // const [breathePhase, setBreathePhase] = useState<'들숨 (들이쉬기)' | '머묾 (알아차림)' | '날숨 (내쉬기)'>('들숨 (들이쉬기)');
  const [breathePhase, setBreathePhase] = useState<'알아차림'>('알아차림');
  const [ambientOn, setAmbientOn] = useState(false);

  // 2. 108 Bows state
  const [currentBow, setCurrentBow] = useState(1);
  const [isAutoBow, setIsAutoBow] = useState(false);
  const [bowIntervalSec, setBowIntervalSec] = useState(7);
  const [hasCompletedBows, setHasCompletedBows] = useState(false);

  // 3. Dharma Talks state
  const [selectedTalk, setSelectedTalk] = useState<DharmaTalk>(DHARMA_TALKS[0]);
  const [isTalkPlaying, setIsTalkPlaying] = useState(false);
  const [talkTime, setTalkTime] = useState(0);
  const [talkSpeed, setTalkSpeed] = useState(1);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState(false);

  // 4. Mind Sharing state
  const [mindPosts, setMindPosts] = useState<MindSharePost[]>(() => {
    const saved = localStorage.getItem('jungto_mind_posts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_MIND_POSTS;
      }
    }
    return INITIAL_MIND_POSTS;
  });
  const [newAuthor, setNewAuthor] = useState('');
  const [newEmotion, setNewEmotion] = useState<'평온' | '감사' | '알아차림' | '내려놓음' | '참회'>('평온');
  const [newContent, setNewContent] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);

  // 5. Walking state
  const [isWalkingPacing, setIsWalkingPacing] = useState(false);
  const [walkingTempoBpm, setWalkingTempoBpm] = useState(45);
  const [walkingSeconds, setWalkingSeconds] = useState(0);
  const [walkSound, setWalkSound] = useState<'breeze' | 'stream' | 'bamboo'>('breeze');

  // 6. Booking state
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('2026-11-14');
  const [bookingStayType, setBookingStayType] = useState('1박 2일 휴식형 템플스테이');
  const [bookingSuccessCode, setBookingSuccessCode] = useState<string | null>(null);

  // Meditation timer loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isMedRunning && medTimeLeft > 0) {
      timer = setInterval(() => {
        setMedTimeLeft((prev) => {
          if (prev <= 1) {
            setIsMedRunning(false);
            sound.playTempleGong();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isMedRunning, medTimeLeft]);

  // Breathing phase cycle
  useEffect(() => {
    let breathTimer: NodeJS.Timeout;
    if (isMedRunning) {
      let phase = 0;
      //const phases: Array<'들숨 (들이쉬기)' | '머묾 (알아차림)' | '날숨 (내쉬기)'> = [
       // '들숨 (들이쉬기)',
       // '머묾 (알아차림)',
      //  '날숨 (내쉬기)',
     // ];
      const phases: Array<'알아차림' | '알아차림' | '알아차림'> = [
        '알아차림',
        '알아차림',
        '알아차림',
      ];
      breathTimer = setInterval(() => {
        phase = (phase + 1) % 3;
        setBreathePhase(phases[phase]);
      }, 4000);
    }
    return () => clearInterval(breathTimer);
  }, [isMedRunning]);

  // 108 Bows auto step loop
  useEffect(() => {
    let bowTimer: NodeJS.Timeout;
    if (isAutoBow && !hasCompletedBows) {
      bowTimer = setInterval(() => {
        setCurrentBow((prev) => {
          if (prev >= 108) {
            setIsAutoBow(false);
            setHasCompletedBows(true);
            sound.playTempleGong();
            return 108;
          }
          sound.playMoktak();
          return prev + 1;
        });
      }, bowIntervalSec * 1000);
    }
    return () => clearInterval(bowTimer);
  }, [isAutoBow, hasCompletedBows, bowIntervalSec]);

  // Dharma audio timer
  useEffect(() => {
    let talkTimer: NodeJS.Timeout;
    if (isTalkPlaying) {
      talkTimer = setInterval(() => {
        setTalkTime((prev) => {
          if (prev >= selectedTalk.durationSec) {
            setIsTalkPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / talkSpeed);
    }
    return () => clearInterval(talkTimer);
  }, [isTalkPlaying, talkSpeed, selectedTalk.durationSec]);

  // Walking timer & moktak beat
  useEffect(() => {
    let pacerTimer: NodeJS.Timeout;
    let secTimer: NodeJS.Timeout;
    if (isWalkingPacing) {
      pacerTimer = setInterval(() => {
        sound.playMoktak();
      }, (60 / walkingTempoBpm) * 1000);
      secTimer = setInterval(() => {
        setWalkingSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      clearInterval(pacerTimer);
      clearInterval(secTimer);
    };
  }, [isWalkingPacing, walkingTempoBpm]);

  if (!programId) return null;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNextBow = () => {
    if (currentBow < 108) {
      sound.playMoktak();
      setCurrentBow((b) => b + 1);
    } else {
      setHasCompletedBows(true);
      sound.playTempleGong();
    }
  };

  const handlePostMind = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const templeNames = {
      mungyeong: '수련원 3D 도량',
      seocho: '문화회관 3D 도량',
      jukrim: 'J 정사 3D 도량',
    };

    const newPost: MindSharePost = {
      id: `post-${Date.now()}`,
      author: newAuthor.trim() ? `${newAuthor.trim()} 도반` : '이름없는 도반',
      templeStayLocation: templeNames[templeId],
      emotionTag: newEmotion,
      content: newContent.trim(),
      timestamp: '방금 전',
      lotusCount: 1,
      hasUserCheered: true,
    };

    const updated = [newPost, ...mindPosts];
    setMindPosts(updated);
    localStorage.setItem('jungto_mind_posts', JSON.stringify(updated));

    setNewContent('');
    setNewAuthor('');
    setPostSuccess(true);
    sound.playSingingBowl();
    setTimeout(() => setPostSuccess(false), 3000);
  };

  const handleCheerLotus = (id: string) => {
    const updated = mindPosts.map((p) => {
      if (p.id === id) {
        const next = !p.hasUserCheered;
        return {
          ...p,
          lotusCount: next ? p.lotusCount + 1 : p.lotusCount - 1,
          hasUserCheered: next,
        };
      }
      return p;
    });
    setMindPosts(updated);
    localStorage.setItem('jungto_mind_posts', JSON.stringify(updated));
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingName || !bookingPhone) return;

    const code = `JT-3D-${Date.now().toString().slice(-4)}`;
    setBookingSuccessCode(code);
    sound.playTempleGong();

    const templeNames = {
      mungyeong: '수련원',
      seocho: '서울 사회문화회관',
      jukrim: 'J 정사',
    };

    const bookingData = {
      id: `book-${Date.now()}`,
      bookingCode: code,
      templeName: templeNames[templeId],
      stayType: bookingStayType,
      checkInDate: bookingDate,
      applicantName: bookingName,
      phone: bookingPhone,
      createdAt: new Date().toLocaleDateString('ko-KR'),
      status: '예약 완료',
    };

    const existing = localStorage.getItem('jungto_user_bookings');
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(bookingData);
    localStorage.setItem('jungto_user_bookings', JSON.stringify(list));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/65 backdrop-blur-xs animate-fade-in select-text">
      <div className="relative w-full max-w-2xl bg-[#FBF9F5] border border-stone-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] font-serif text-stone-500 uppercase tracking-wider block">
              3D 메타버스 수행 기능
            </span>
            <h3 className="text-lg font-serif font-semibold text-stone-900">
              {programId === 'meditation' && '선방 · 호흡 명상'}
              {programId === 'bows108' && '108배 정진전 · 하심의 108배 정진'}
              {programId === 'dharma' && '대웅전 · 스님 법문'}
              {programId === 'mindshare' && '연화정 마당 · 도반들과 마음 나누기'}
              {programId === 'walking' && '대나무 숲길 · 묵언 포행 (보행 명상)'}
              {programId === 'booking' && '템플스테이 신청 및 예약'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* ======================= 1. MEDITATION ======================= */}
          {programId === 'meditation' && (
            <div className="text-center space-y-6">
              <p className="text-xs text-stone-600 font-sans max-w-md mx-auto">
                코끝에 주의를 두고 숨이 들어오고 나가는 것을 다만 알아차립니다.
              </p>

              {/* Breathing Circle */}
              <div className="relative flex items-center justify-center my-4">
                <div
                  className={`w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-stone-300 flex flex-col items-center justify-center transition-all duration-700 ${
                    isMedRunning ? 'bg-amber-50/50 border-amber-300 shadow-inner' : 'bg-stone-50'
                  }`}
                >
                  <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center ${isMedRunning ? 'animate-breathe bg-amber-100/60' : 'bg-stone-100/70'}`}>
                    <span className="text-3xl font-mono tabular-nums text-stone-900 font-light">
                      {formatTime(medTimeLeft)}
                    </span>
                    <span className="mt-1 text-xs font-serif text-stone-700">
                      {isMedRunning ? breathePhase : '호흡 정렬'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                <span className="text-xs text-stone-500 font-serif mr-1">수련 시간:</span>
                {[
                  { label: '10분', sec: 600 },
                  { label: '20분', sec: 1200 },
                  { label: '30분', sec: 1800 },
                  { label: '50분', sec: 3000 },
                  { label: '100분', sec: 6000 },
                ].map((item) => (
                  <button
                    key={item.sec}
                    onClick={() => {
                      setIsMedRunning(false);
                      setMedDuration(item.sec);
                      setMedTimeLeft(item.sec);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-serif font-medium transition-all ${
                      medDuration === item.sec
                        ? 'bg-amber-600 text-white shadow-xs font-semibold'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    if (!isMedRunning) {
                      sound.playSingingBowl();
                      setIsMedRunning(true);
                    } else {
                      setIsMedRunning(false);
                    }
                  }}
                  className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-stone-800"
                >
                  {isMedRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isMedRunning ? '일시 정지' : '명상 시작'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsMedRunning(false);
                    setMedTimeLeft(medDuration);
                  }}
                  className="p-2.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    if (!ambientOn) {
                      sound.startAmbient('breeze');
                      setAmbientOn(true);
                    } else {
                      sound.stopAmbient();
                      setAmbientOn(false);
                    }
                  }}
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-1 ${
                    ambientOn ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {ambientOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{ambientOn ? '바람소리 켜짐' : '산바람 소리'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================= 2. 108 BOWS ======================= */}
          {programId === 'bows108' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-white border border-stone-200 text-center">
                <div className="flex justify-between items-center text-xs text-stone-500 font-serif mb-2">
                  <span>108배 정진 진행</span>
                  <span className="font-mono text-stone-900 font-semibold">{currentBow} / 108배</span>
                </div>

                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-stone-900 transition-all duration-300"
                    style={{ width: `${(currentBow / 108) * 100}%` }}
                  />
                </div>

                <div className="min-h-[70px] flex flex-col items-center justify-center">
                  <span className="text-[11px] font-serif text-stone-400 mb-1">제 {currentBow} 배</span>
                  <p className="text-sm sm:text-base font-serif font-medium text-stone-900 leading-relaxed text-balance">
                    "{BOWS_108_LIST[currentBow - 1]}"
                  </p>
                </div>

                {hasCompletedBows && (
                  <div className="mt-3 p-3 bg-emerald-50 text-emerald-900 text-xs rounded-lg font-serif">
                    지극한 정성으로 108배를 모두 회향하셨습니다. 성불하십시오.
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleNextBow}
                  disabled={hasCompletedBows}
                  className="px-5 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-stone-800 disabled:opacity-50"
                >
                  <Flame className="w-4 h-4 text-amber-300" />
                  <span>1배 올리기 ({currentBow}배)</span>
                </button>

                <button
                  onClick={() => setIsAutoBow(!isAutoBow)}
                  disabled={hasCompletedBows}
                  className={`px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                    isAutoBow ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                  }`}
                >
                  {isAutoBow ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isAutoBow ? '자동 멈춤' : `자동 (${bowIntervalSec}초 주기)`}</span>
                </button>

                <button
                  onClick={() => {
                    setIsAutoBow(false);
                    setCurrentBow(1);
                    setHasCompletedBows(false);
                  }}
                  className="p-2.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================= 3. DHARMA TALKS ======================= */}
          {programId === 'dharma' && (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {DHARMA_TALKS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTalk(t);
                      setIsTalkPlaying(false);
                      setTalkTime(0);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-serif whitespace-nowrap border shrink-0 ${
                      selectedTalk.id === t.id
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    {t.title.slice(0, 14)}...
                  </button>
                ))}
              </div>

              {/* Player */}
              <div className="p-4 bg-white border border-stone-200 rounded-xl">
                <div className="flex justify-between items-baseline mb-2">
                  <h4 className="font-serif font-semibold text-sm text-stone-900">{selectedTalk.title}</h4>
                  <span className="text-xs font-mono text-stone-500">{formatTime(talkTime)} / {formatTime(selectedTalk.durationSec)}</span>
                </div>

                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-stone-900"
                    style={{ width: `${(talkTime / selectedTalk.durationSec) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsTalkPlaying(!isTalkPlaying)}
                    className="px-4 py-2 bg-stone-900 text-white text-xs rounded-lg flex items-center gap-1.5"
                  >
                    {isTalkPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isTalkPlaying ? '일시 정지' : '설법 듣기'}</span>
                  </button>

                  <button
                    onClick={() => setShowFullTranscript(!showFullTranscript)}
                    className="text-xs text-stone-700 font-serif font-semibold hover:underline flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{showFullTranscript ? '요약 보기' : '법문 전문'}</span>
                  </button>
                </div>
              </div>

              {/* Quote & Transcript */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-stone-800 font-serif italic">
                "{selectedTalk.keyQuote}"
              </div>

              <div className="p-3 bg-white border border-stone-200 rounded-xl text-xs text-stone-700 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line font-serif">
                {showFullTranscript ? selectedTalk.fullTranscript : selectedTalk.transcriptSummary}
              </div>
            </div>
          )}

          {/* ======================= 4. MIND SHARING ======================= */}
          {programId === 'mindshare' && (
            <div className="space-y-4">
              <form onSubmit={handlePostMind} className="p-4 bg-white border border-stone-200 rounded-xl space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="도반 별칭 (예: 백련 도반)"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="text-xs p-2 rounded-lg border border-stone-300 w-1/2"
                  />
                  <div className="flex gap-1 w-1/2">
                    {(['평온', '감사', '내려놓음', '참회'] as const).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNewEmotion(tag)}
                        className={`flex-1 py-1 text-[11px] rounded ${
                          newEmotion === tag ? 'bg-stone-900 text-white font-medium' : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={2}
                  placeholder="3D 도량을 거닐며 느낀 마음을 솔직하게 나누어 주세요..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-stone-300"
                  required
                />

                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-stone-400">평가 없이 온전히 경청합니다</span>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-stone-900 text-white text-xs rounded-lg hover:bg-stone-800"
                  >
                    나눔 등록
                  </button>
                </div>
              </form>

              {/* Feed */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {mindPosts.slice(0, 4).map((p) => (
                  <div key={p.id} className="p-3 bg-white border border-stone-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-[11px] text-stone-500 font-serif">
                      <span><strong>{p.author}</strong> · #{p.emotionTag}</span>
                      <span>{p.timestamp}</span>
                    </div>
                    <p className="text-stone-700 font-sans leading-relaxed">{p.content}</p>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleCheerLotus(p.id)}
                        className="text-[11px] flex items-center gap-1 font-serif text-amber-800"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>연꽃 공감 {p.lotusCount}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================= 5. WALKING ======================= */}
          {programId === 'walking' && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-stone-600 font-sans max-w-md mx-auto">
                규칙적인 목탁 박자에 맞추어 발바닥이 대지에 닿는 감촉을 오롯이 알아차립니다.
              </p>

              <div className="p-4 bg-white border border-stone-200 rounded-xl max-w-sm mx-auto">
                <span className="text-xs font-serif text-stone-400 block mb-1">포행 진행 시간</span>
                <span className="text-3xl font-mono tabular-nums text-stone-900">{formatTime(walkingSeconds)}</span>
                <p className="text-xs text-stone-500 mt-1 font-serif">
                  {isWalkingPacing ? `분당 ${walkingTempoBpm}걸음 템포로 묵언 보행 중` : '포행 준비 중'}
                </p>

                <div className="flex justify-center gap-1.5 mt-4">
                  {[30, 45, 60].map((bpm) => (
                    <button
                      key={bpm}
                      onClick={() => setWalkingTempoBpm(bpm)}
                      className={`px-3 py-1 rounded text-xs ${
                        walkingTempoBpm === bpm ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {bpm} BPM
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    if (!isWalkingPacing) {
                      sound.startAmbient(walkSound);
                      setIsWalkingPacing(true);
                    } else {
                      sound.stopAmbient();
                      setIsWalkingPacing(false);
                    }
                  }}
                  className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-stone-800"
                >
                  {isWalkingPacing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isWalkingPacing ? '포행 멈추기' : '목탁 걸음 박자 시작'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsWalkingPacing(false);
                    sound.stopAmbient();
                    setWalkingSeconds(0);
                  }}
                  className="p-2.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================= 6. BOOKING ======================= */}
          {programId === 'booking' && (
            <div className="space-y-4">
              {bookingSuccessCode ? (
                <div className="text-center py-6 space-y-2">
                  <span className="text-xs font-serif text-stone-500">예약 접수 완료</span>
                  <p className="text-2xl font-mono font-bold text-stone-900">{bookingSuccessCode}</p>
                  <p className="text-xs text-stone-600 font-serif">
                    <strong>{bookingName}</strong> 도반님의 템플스테이 신청이 정상 접수되었습니다.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2.5 bg-stone-900 text-white rounded-lg text-xs"
                  >
                    3D 도량으로 돌아가기
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-serif text-stone-700 mb-1">참가 일정 (체크인)</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-stone-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-serif text-stone-700 mb-1">스테이 프로그램</label>
                    <select
                      value={bookingStayType}
                      onChange={(e) => setBookingStayType(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-stone-300"
                    >
                      <option value="1박 2일 휴식형 템플스테이">1박 2일 휴식형 템플스테이 (숲길과 차담)</option>
                      <option value="2박 3일 집중 묵언 명상 수련">2박 3일 집중 묵언 명상 수련 (위빠사나 & 108배)</option>
                      <option value="당일 마음챙김 데이">당일 저녁 마음챙김 데이 (명상 & 법문)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-1">성명</label>
                      <input
                        type="text"
                        placeholder="홍길동"
                        value={bookingName}
                        onChange={(e) => setBookingName(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-stone-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-1">연락처</label>
                      <input
                        type="tel"
                        placeholder="010-0000-0000"
                        value={bookingPhone}
                        onChange={(e) => setBookingPhone(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-stone-300"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800"
                    >
                      3D 가상 도량에서 템플스테이 신청 접수
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
