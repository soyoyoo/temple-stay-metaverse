import React, { useState, useEffect, useRef } from 'react';
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
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Heart,
  MessageSquare,
  Sparkles,
  Footprints,
  BookOpen,
  Copy,
  Check,
  Flame,
  Clock,
  Compass,
} from 'lucide-react';

interface ProgramsSectionProps {
  onOpenBooking: () => void;
  activeProgramProp?: 'meditation' | 'bows108' | 'dharma' | 'mindshare' | 'walking';
}

export const ProgramsSection: React.FC<ProgramsSectionProps> = ({
  onOpenBooking,
  activeProgramProp,
}) => {
  const [activeProgramId, setActiveProgramId] = useState<
    'meditation' | 'bows108' | 'dharma' | 'mindshare' | 'walking'
  >(activeProgramProp || 'meditation');

  useEffect(() => {
    if (activeProgramProp) {
      setActiveProgramId(activeProgramProp);
    }
  }, [activeProgramProp]);

  // ==========================================
  // 1. MEDITATION STATE
  // ==========================================
  const [medDuration, setMedDuration] = useState<number>(300); // 5 min default
  const [medTimeLeft, setMedTimeLeft] = useState<number>(300);
  const [isMedRunning, setIsMedRunning] = useState<boolean>(false);
  // const [breathePhase, setBreathePhase] = useState<'들숨 (들이쉬기)' | '머묾 (알아차림)' | '날숨 (내쉬기)'>('들숨 (들이쉬기)');
  const [breathePhase, setBreathePhase] = useState<'알아차림'>('알아차림');
  const [ambientActive, setAmbientActive] = useState<boolean>(false);

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

  // Breathing cycle timer (4s Inhale, 4s Hold, 4s Exhale)
  useEffect(() => {
    let breathInterval: NodeJS.Timeout;
    if (isMedRunning) {
      let phaseIdx = 0;
      //const phases: Array<'들숨 (들이쉬기)' | '머묾 (알아차림)' | '날숨 (내쉬기)'> = [
      //  '들숨 (들이쉬기)',
      //  '머묾 (알아차림)',
      //  '날숨 (내쉬기)',
      // ];
      const phases: Array<'알아차림' | '알아차림' | '알아차림'> = [
        '알아차림',
        '알아차림',
        '알아차림',
      ];
      breathInterval = setInterval(() => {
        phaseIdx = (phaseIdx + 1) % 3;
        setBreathePhase(phases[phaseIdx]);
      }, 4000);
    } else {
      setBreathePhase('알아차림');
    }
    return () => clearInterval(breathInterval);
  }, [isMedRunning]);

  const toggleMeditation = () => {
    if (!isMedRunning) {
      sound.playSingingBowl();
      setIsMedRunning(true);
    } else {
      setIsMedRunning(false);
    }
  };

  const resetMeditation = (durationSec = medDuration) => {
    setIsMedRunning(false);
    setMedDuration(durationSec);
    setMedTimeLeft(durationSec);
  };

  const toggleAmbientSound = () => {
    if (!ambientActive) {
      sound.startAmbient('breeze');
      setAmbientActive(true);
    } else {
      sound.stopAmbient();
      setAmbientActive(false);
    }
  };

  // ==========================================
  // 2. 108 BOWS STATE
  // ==========================================
  const [currentBow, setCurrentBow] = useState<number>(1);
  const [isAutoBow, setIsAutoBow] = useState<boolean>(false);
  const [bowIntervalSec, setBowIntervalSec] = useState<number>(7);
  const [hasCompletedBows, setHasCompletedBows] = useState<boolean>(false);

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

  const handleNextBowManual = () => {
    if (currentBow < 108) {
      sound.playMoktak();
      setCurrentBow((prev) => prev + 1);
    } else {
      setHasCompletedBows(true);
      sound.playTempleGong();
    }
  };

  const handleResetBows = () => {
    setIsAutoBow(false);
    setCurrentBow(1);
    setHasCompletedBows(false);
  };

  // ==========================================
  // 3. DHARMA TALKS STATE
  // ==========================================
  const [selectedTalk, setSelectedTalk] = useState<DharmaTalk>(DHARMA_TALKS[0]);
  const [isTalkPlaying, setIsTalkPlaying] = useState<boolean>(false);
  const [talkCurrentTime, setTalkCurrentTime] = useState<number>(0);
  const [talkSpeed, setTalkSpeed] = useState<number>(1);
  const [showFullTranscript, setShowFullTranscript] = useState<boolean>(false);
  const [copiedQuote, setCopiedQuote] = useState<boolean>(false);

  useEffect(() => {
    let playInterval: NodeJS.Timeout;
    if (isTalkPlaying) {
      playInterval = setInterval(() => {
        setTalkCurrentTime((prev) => {
          if (prev >= selectedTalk.durationSec) {
            setIsTalkPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / talkSpeed);
    }
    return () => clearInterval(playInterval);
  }, [isTalkPlaying, talkSpeed, selectedTalk.durationSec]);

  const handleSelectTalk = (talk: DharmaTalk) => {
    setSelectedTalk(talk);
    setIsTalkPlaying(false);
    setTalkCurrentTime(0);
    setShowFullTranscript(false);
  };

  const copyKeyQuote = () => {
    navigator.clipboard.writeText(selectedTalk.keyQuote);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  // ==========================================
  // 4. MIND SHARING STATE (도반 마음나누기)
  // ==========================================
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
  const [newLocation, setNewLocation] = useState('수련원 묵언스테이');
  const [newEmotion, setNewEmotion] = useState<'평온' | '감사' | '알아차림' | '내려놓음' | '참회'>('평온');
  const [newContent, setNewContent] = useState('');
  const [postSuccessMessage, setPostSuccessMessage] = useState(false);

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newPost: MindSharePost = {
      id: `post-${Date.now()}`,
      author: newAuthor.trim() ? `${newAuthor.trim()} 도반` : '이름없는 도반',
      templeStayLocation: newLocation,
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
    setPostSuccessMessage(true);
    sound.playSingingBowl();
    setTimeout(() => setPostSuccessMessage(false), 3000);
  };

  const handleCheerLotus = (postId: string) => {
    const updated = mindPosts.map((post) => {
      if (post.id === postId) {
        const nextCheered = !post.hasUserCheered;
        return {
          ...post,
          lotusCount: nextCheered ? post.lotusCount + 1 : post.lotusCount - 1,
          hasUserCheered: nextCheered,
        };
      }
      return post;
    });
    setMindPosts(updated);
    localStorage.setItem('jungto_mind_posts', JSON.stringify(updated));
    sound.playMoktak();
  };

  // ==========================================
  // 5. WALKING MEDITATION STATE (산책)
  // ==========================================
  const [selectedCourseIdx, setSelectedCourseIdx] = useState<number>(0);
  const [isWalkingPacing, setIsWalkingPacing] = useState<boolean>(false);
  const [walkingTempoBpm, setWalkingTempoBpm] = useState<number>(45); // 45 bpm slow mindful steps
  const [walkingSeconds, setWalkingSeconds] = useState<number>(0);
  const [walkSoundType, setWalkSoundType] = useState<'breeze' | 'stream' | 'bamboo'>('breeze');

  useEffect(() => {
    let paceInterval: NodeJS.Timeout;
    if (isWalkingPacing) {
      paceInterval = setInterval(() => {
        sound.playMoktak();
      }, (60 / walkingTempoBpm) * 1000);
    }
    return () => clearInterval(paceInterval);
  }, [isWalkingPacing, walkingTempoBpm]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isWalkingPacing) {
      timer = setInterval(() => {
        setWalkingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isWalkingPacing]);

  const toggleWalkingPace = () => {
    if (!isWalkingPacing) {
      sound.startAmbient(walkSoundType);
      setIsWalkingPacing(true);
    } else {
      sound.stopAmbient();
      setIsWalkingPacing(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section id="programs" className="py-16 sm:py-24 border-t border-stone-200/90 bg-[#FBF9F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-serif mb-2">
            <span>5대 수행 프로그램</span>
            <span aria-hidden="true">·</span>
            <span>마음챙김과 일상의 지혜</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-medium text-stone-900 tracking-tight">
            내 안의 번뇌를 씻어내는 다섯 가지 길
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed font-sans">
            사찰에서 누구나 실천하는 핵심 5대 프로그램(명상, 108배, 스님 법문, 도반 마음나누기, 숲길 산책)을 
            직접 인터랙티브 도구로 체험해보세요.
          </p>
        </div>

        {/* 5-Program Selector Navigation Bar */}
        <div className="mt-8 flex flex-wrap gap-2 p-1.5 bg-stone-200/60 rounded-xl">
          {PROGRAMS_CATALOG.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProgramId(p.id)}
              className={`flex-1 min-w-[130px] py-3 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all text-center whitespace-nowrap ${
                activeProgramId === p.id
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="block font-serif text-[11px] text-stone-400">{p.hanja}</span>
              <span className="font-serif text-sm sm:text-base">{p.name}</span>
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* PROGRAM 1: 명상 (MEDITATION) */}
        {/* ========================================================================= */}
        {activeProgramId === 'meditation' && (
          <div className="mt-8 bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-10 shadow-xs">
            <div className="max-w-3xl mx-auto text-center">
              
              <div className="flex items-center justify-center gap-2 text-xs text-stone-500 font-serif">
                <span>호흡 명상</span>
                <span aria-hidden="true">·</span>
                <span>아나파나사티 (Anapanasati)</span>
                <span aria-hidden="true">·</span>
                <span>들숨과 날숨의 알아차림</span>
              </div>

              <h3 className="mt-2 text-2xl sm:text-3xl font-serif font-medium text-stone-900">
                지금 숨 쉬고 있는 코끝에 마음을 둡니다
              </h3>
              <p className="mt-2 text-sm text-stone-600 font-sans max-w-xl mx-auto">
                숨이 들어오면 들어오는 줄 알고, 숨이 나가면 나가는 줄만 압니다. 
                생각이 떠오르면 다그치지 말고 “생각이 일어났구나” 알아차리고 다시 호흡으로 돌아옵니다.
              </p>

              {/* Breathing Guide Ring Animation */}
              <div className="my-10 relative flex items-center justify-center">
                <div
                  className={`w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-stone-300 flex flex-col items-center justify-center transition-all duration-1000 ${
                    isMedRunning ? 'bg-amber-50/40 border-amber-300 shadow-inner' : 'bg-stone-50'
                  }`}
                >
                  <div className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center ${isMedRunning ? 'animate-breathe bg-amber-100/50' : 'bg-stone-100/60'}`}>
                    <span className="text-3xl sm:text-4xl font-mono tabular-nums font-light text-stone-900">
                      {formatTime(medTimeLeft)}
                    </span>
                    <span className="mt-2 text-xs font-serif text-stone-700 tracking-wider">
                      {isMedRunning ? breathePhase : '호흡 정렬'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timer Duration Presets */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="text-xs text-stone-500 font-serif mr-1">수련 시간:</span>
                {[180, 300, 600, 1200].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => resetMeditation(sec)}
                    disabled={isMedRunning}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      medDuration === sec
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    } disabled:opacity-50`}
                  >
                    {sec / 60}분
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={toggleMeditation}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 transition-all flex items-center gap-2 shadow-xs"
                >
                  {isMedRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isMedRunning ? '일시 정지' : '명상 시작하기'}</span>
                </button>

                <button
                  onClick={() => resetMeditation(medDuration)}
                  className="p-3 rounded-lg text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                  title="타이머 초기화"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleAmbientSound}
                  className={`p-3 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${
                    ambientActive ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                  title="산사 솔바람 배경음 켜기/끄기"
                >
                  {ambientActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{ambientActive ? '산바람 소리 재생 중' : '산바람 소리 켜기'}</span>
                </button>
              </div>

              {/* Posture Guidance */}
              <div className="mt-10 pt-6 border-t border-stone-200 text-left grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-600">
                <div className="p-3 bg-stone-50 rounded-lg">
                  <strong className="block text-stone-900 font-serif mb-1">01. 자세 정돈</strong>
                  허리를 곧게 펴고 턱을 가볍게 당깁니다. 어깨와 목의 긴장을 부드럽게 풉니다.
                </div>
                <div className="p-3 bg-stone-50 rounded-lg">
                  <strong className="block text-stone-900 font-serif mb-1">02. 시선 처리</strong>
                  눈은 가볍게 감습니다.
                </div>
                <div className="p-3 bg-stone-50 rounded-lg">
                  <strong className="block text-stone-900 font-serif mb-1">03. 호흡 알아차림</strong>
                  숨을 억지로 길게 쉬려 하지 않고, 있는 그대로의 자연스러운 호흡을 바라봅니다.
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROGRAM 2: 108배 (108 BOWS) */}
        {/* ========================================================================= */}
        {activeProgramId === 'bows108' && (
          <div className="mt-8 bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-10 shadow-xs">
            <div className="max-w-3xl mx-auto">
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-stone-500 font-serif">
                  <span>오체투지 (五體投地)</span>
                  <span aria-hidden="true">·</span>
                  <span>하심과 참회</span>
                  <span aria-hidden="true">·</span>
                  <span>108가지 서원의 절</span>
                </div>
                <h3 className="mt-2 text-2xl sm:text-3xl font-serif font-medium text-stone-900">
                  나를 온전히 땅에 낮출 때, 참된 자유가 시작됩니다
                </h3>
                <p className="mt-2 text-sm text-stone-600 font-sans">
                  목탁 소리에 맞춰 절을 올릴 때마다 한 구절씩 마음의 때를 씻어냅니다.
                </p>
              </div>

              {/* Progress & Current Bow Reflection */}
              <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-[#FBF9F5] border border-stone-200 text-center relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-stone-500 font-serif mb-2">
                  <span>진행 상황</span>
                  <span className="font-mono tabular-nums font-semibold text-stone-900 text-sm">
                    {currentBow} / 108배
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-stone-900 transition-all duration-300"
                    style={{ width: `${(currentBow / 108) * 100}%` }}
                  />
                </div>

                {/* Current Reflection Affirmation */}
                <div className="min-h-[90px] flex flex-col items-center justify-center px-4">
                  <span className="text-xs font-serif text-stone-400 mb-1">
                    제 {currentBow} 배의 서원
                  </span>
                  <p className="text-base sm:text-lg font-serif font-medium text-stone-900 leading-relaxed text-balance">
                    "{BOWS_108_LIST[currentBow - 1]}"
                  </p>
                </div>

                {/* Completion Banner */}
                {hasCompletedBows && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm animate-fade-in">
                    <p className="font-serif font-semibold">
                      지극한 정성으로 108배를 모두 마쳤습니다.
                    </p>
                    <p className="text-xs text-emerald-800 mt-1">
                      오늘 흘린 땀방울과 낮아진 마음으로 나와 세상 모든 존재의 평화를 기원합니다.
                    </p>
                  </div>
                )}
              </div>

              {/* Bow Interactive Controls */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleNextBowManual}
                  disabled={hasCompletedBows}
                  className="px-6 py-3.5 rounded-lg text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 active:scale-[0.98] transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <Flame className="w-4 h-4 text-amber-300" />
                  <span>1배 올리기 ({currentBow}배 완료)</span>
                </button>

                <button
                  onClick={() => setIsAutoBow(!isAutoBow)}
                  disabled={hasCompletedBows}
                  className={`px-5 py-3.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isAutoBow
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200/80'
                  } disabled:opacity-50`}
                >
                  {isAutoBow ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isAutoBow ? '자동 진행 멈춤' : `자동 진행 (${bowIntervalSec}초 주기)`}</span>
                </button>

                <button
                  onClick={handleResetBows}
                  className="p-3.5 rounded-lg text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                  title="처음부터 다시 시작"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Pacing Speed Options */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-stone-500 font-serif">
                <span>자동 간격 설정:</span>
                {[5, 7, 9].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setBowIntervalSec(sec)}
                    disabled={isAutoBow}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      bowIntervalSec === sec ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {sec}초 (1배)
                  </button>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROGRAM 3: 스님 법문 듣기 (DHARMA TALKS) */}
        {/* ========================================================================= */}
        {activeProgramId === 'dharma' && (
          <div className="mt-8 bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-10 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Dharma Talk List */}
              <div className="lg:col-span-5 space-y-3">
                <p className="text-xs font-serif text-stone-500 tracking-wide">
                  스님 대표 법문 목록 (5편)
                </p>
                {DHARMA_TALKS.map((talk) => (
                  <button
                    key={talk.id}
                    onClick={() => handleSelectTalk(talk)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedTalk.id === talk.id
                        ? 'border-stone-800 bg-stone-50 shadow-xs'
                        : 'border-stone-200/80 hover:border-stone-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-mono">{talk.duration}</span>
                      <div className="flex gap-1">
                        {talk.tags.map((t, i) => (
                          <span key={i} className="text-[11px] text-stone-500">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h4 className="mt-1 text-sm font-semibold text-stone-900 font-serif leading-snug">
                      {talk.title}
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5 line-clamp-1">{talk.subtitle}</p>
                  </button>
                ))}
              </div>

              {/* Right Column: Active Talk Player & Transcript */}
              <div className="lg:col-span-7 bg-[#FBF9F5] border border-stone-200/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-500 font-serif">
                    <span>지혜의 말씀 청취</span>
                    <span className="font-mono">{selectedTalk.duration}</span>
                  </div>

                  <h3 className="mt-2 text-xl sm:text-2xl font-serif font-medium text-stone-900">
                    {selectedTalk.title}
                  </h3>
                  <p className="text-xs text-stone-600 font-sans mt-1">{selectedTalk.subtitle}</p>

                  {/* Simulated Audio Player Component */}
                  <div className="mt-6 p-4 bg-white border border-stone-200 rounded-xl">
                    {/* Scrub Slider */}
                    <div className="flex items-center justify-between text-xs text-stone-500 font-mono mb-2">
                      <span>{formatTime(talkCurrentTime)}</span>
                      <span>{formatTime(selectedTalk.durationSec)}</span>
                    </div>

                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mb-4 cursor-pointer">
                      <div
                        className="h-full bg-stone-800 transition-all"
                        style={{ width: `${(talkCurrentTime / selectedTalk.durationSec) * 100}%` }}
                      />
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsTalkPlaying(!isTalkPlaying)}
                          className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center hover:bg-stone-800 transition-colors shadow-xs"
                        >
                          {isTalkPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                        <span className="text-xs text-stone-600 font-medium">
                          {isTalkPlaying ? '설법 청취 중' : '법문 듣기'}
                        </span>
                      </div>

                      {/* Speed selector */}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-stone-400 mr-1">배속:</span>
                        {[1, 1.2, 1.5].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setTalkSpeed(speed)}
                            className={`px-2 py-1 rounded text-xs font-mono ${
                              talkSpeed === speed ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Core Quote Box */}
                  <div className="mt-6 p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 relative">
                    <div className="flex items-center justify-between text-xs font-serif text-amber-900 mb-1">
                      <span>스님의 한마디</span>
                      <button
                        onClick={copyKeyQuote}
                        className="text-stone-600 hover:text-stone-900 flex items-center gap-1 text-[11px]"
                      >
                        {copiedQuote ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedQuote ? '복사됨' : '문구 복사'}</span>
                      </button>
                    </div>
                    <blockquote className="text-sm font-serif italic text-stone-900 leading-relaxed">
                      "{selectedTalk.keyQuote}"
                    </blockquote>
                  </div>

                  {/* Summary vs Full Transcript */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-serif text-stone-500">법문 내용 요약 및 전문</span>
                      <button
                        onClick={() => setShowFullTranscript(!showFullTranscript)}
                        className="text-xs text-stone-800 font-semibold hover:underline flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{showFullTranscript ? '요약 보기' : '전문 읽기'}</span>
                      </button>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-700 leading-relaxed max-h-56 overflow-y-auto">
                      {showFullTranscript ? (
                        <div className="whitespace-pre-line font-serif">{selectedTalk.fullTranscript}</div>
                      ) : (
                        <p>{selectedTalk.transcriptSummary}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROGRAM 4: 도반들과 마음 나누기 (MIND SHARING) */}
        {/* ========================================================================= */}
        {activeProgramId === 'mindshare' && (
          <div id="mindsharing" className="mt-8 bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-10 shadow-xs">
            <div className="max-w-4xl mx-auto">
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-stone-500 font-serif">
                  <span>수행의 꽃</span>
                  <span aria-hidden="true">·</span>
                  <span>도반 마음나누기</span>
                  <span aria-hidden="true">·</span>
                  <span>따뜻한 경청과 알아차림</span>
                </div>
                <h3 className="mt-2 text-2xl sm:text-3xl font-serif font-medium text-stone-900">
                  판단이나 조언 없이, 있는 그대로의 내 마음을 내어놓습니다
                </h3>
              </div>

              {/* 3 Principles of Jungto Mind Sharing */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-700">
                <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-lg">
                  <strong className="block text-stone-900 font-serif mb-0.5">01. 조언·충고 금지</strong>
                  상대의 마음에 가르치려 들거나 훈수 두지 않고 온전히 듣습니다.
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-lg">
                  <strong className="block text-stone-900 font-serif mb-0.5">02. 평가·비판 금지</strong>
                  옳고 그름을 따지지 않고 "그 마음이었구나" 존중합니다.
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-lg">
                  <strong className="block text-stone-900 font-serif mb-0.5">03. 나의 마음 고백</strong>
                  타인 탓을 하지 않고 "나는 ~한 마음이었습니다"라고 말합니다.
                </div>
              </div>

              {/* Form to Share Mind */}
              <form onSubmit={handleAddPost} className="mt-8 p-5 sm:p-6 rounded-xl bg-[#FBF9F5] border border-stone-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-serif font-semibold text-stone-900">
                    오늘 나의 마음 나누기
                  </h4>
                  <span className="text-xs text-stone-500">솔직한 내면을 적어보세요</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      도반 이름 (별칭)
                    </label>
                    <input
                      type="text"
                      placeholder="예: 청안 도반"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      참여 도량 / 수련
                    </label>
                    <select
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                    >
                      <option value="수련원 묵언스테이">수련원 묵언스테이</option>
                      <option value="서울 사회문화회관">서울 사회문화회관</option>
                      <option value="대숲스테이">대숲스테이</option>
                      <option value="일상 가정 수행 (온라인)">일상 가정 수행 (온라인)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      오늘의 마음 결
                    </label>
                    <div className="flex gap-1">
                      {(['평온', '감사', '알아차림', '내려놓음', '참회'] as const).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNewEmotion(tag)}
                          className={`flex-1 py-2 text-[11px] rounded-md transition-colors ${
                            newEmotion === tag ? 'bg-stone-900 text-white font-medium' : 'bg-white border border-stone-200 text-stone-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <textarea
                    rows={3}
                    placeholder="수련 중 일어났던 감정이나 생각, 감사함과 참회의 마음을 솔직하게 나누어 주세요..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    required
                    className="w-full text-xs sm:text-sm p-3 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                </div>

                <div className="flex items-center justify-between">
                  {postSuccessMessage ? (
                    <span className="text-xs text-emerald-700 font-serif">
                      소중한 마음이 도반들에게 따뜻하게 공유되었습니다. 합장.
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-500">
                      작성된 나눔은 도반들의 마음에 따뜻한 위안이 됩니다.
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-xs"
                  >
                    마음 나누기 등록
                  </button>
                </div>
              </form>

              {/* Feed of Practitioner Posts */}
              <div className="mt-8 space-y-4">
                <p className="text-xs font-serif text-stone-500">도반들의 최근 마음나누기</p>
                {mindPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Zero-Pill Unboxed Metadata */}
                      <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
                        <strong className="text-stone-900 font-serif">{post.author}</strong>
                        <span aria-hidden="true">·</span>
                        <span>{post.templeStayLocation}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-800 font-serif font-medium">#{post.emotionTag}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.timestamp}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-sans whitespace-pre-line">
                        {post.content}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[11px] text-stone-400 font-serif">
                        침묵과 온전한 경청으로 함께합니다
                      </span>

                      <button
                        onClick={() => handleCheerLotus(post.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-serif transition-colors ${
                          post.hasUserCheered
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        <span>연꽃 보내기</span>
                        <span className="font-mono font-semibold ml-0.5">{post.lotusCount}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROGRAM 5: 산책 (MINDFUL WALKING / 포행) */}
        {/* ========================================================================= */}
        {activeProgramId === 'walking' && (
          <div className="mt-8 bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-10 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: 3 Trails Guide */}
              <div className="lg:col-span-6 space-y-4">
                <p className="text-xs font-serif text-stone-500 tracking-wide">
                  전국 3대 도량 숲길 명상 산책로 (포행길)
                </p>

                {WALKING_COURSES.map((course, idx) => (
                  <div
                    key={course.templeId}
                    onClick={() => setSelectedCourseIdx(idx)}
                    className={`p-5 rounded-xl border cursor-pointer transition-all ${
                      selectedCourseIdx === idx
                        ? 'border-stone-800 bg-[#FBF9F5] shadow-xs'
                        : 'border-stone-200/80 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-serif text-stone-700 font-medium">{course.templeName}</span>
                      <span className="font-mono">{course.distance} · {course.duration}</span>
                    </div>

                    <h4 className="mt-1 text-base font-semibold text-stone-900 font-serif">
                      {course.courseName}
                    </h4>
                    <p className="text-xs text-stone-600 mt-1 font-sans leading-relaxed">
                      {course.description}
                    </p>

                    <div className="mt-3 pt-2 border-t border-stone-200/60">
                      <span className="text-[11px] font-serif text-stone-500 block mb-1">마음챙김 포인트:</span>
                      <ul className="text-[11px] text-stone-700 space-y-1">
                        {course.mindfulPointers.map((p, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-stone-400">·</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Walking Meditation Cadence Pacer */}
              <div className="lg:col-span-6 bg-[#FBF9F5] border border-stone-200/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-500 font-serif">
                    <span>포행(經行) 인터랙티브 가이드</span>
                    <Footprints className="w-4 h-4 text-stone-500" />
                  </div>

                  <h3 className="mt-2 text-xl sm:text-2xl font-serif font-medium text-stone-900">
                    걸음마다 깨어있는 발걸음 명상
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-stone-600 font-sans leading-relaxed">
                    목탁의 규칙적인 타종 소리에 발맞추어 천천히 걷습니다. 
                    발바닥이 지면에 닿는 순간의 감각, 들어 올리는 감각, 앞으로 내딛는 감각을 세밀하게 알아차립니다.
                  </p>

                  {/* Pacer Display */}
                  <div className="my-8 p-6 bg-white rounded-2xl border border-stone-200 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-xs font-serif text-stone-500">포행 진행 시간</span>
                    </div>
                    <div className="text-4xl font-mono tabular-nums font-light text-stone-900">
                      {formatTime(walkingSeconds)}
                    </div>
                    <p className="text-xs text-stone-500 mt-2 font-serif">
                      {isWalkingPacing ? `분당 ${walkingTempoBpm}걸음 속도로 묵언 포행 중` : '포행 준비 중'}
                    </p>

                    {/* Cadence Selector */}
                    <div className="mt-6 flex items-center justify-center gap-2">
                      <span className="text-xs text-stone-500 font-serif mr-1">걸음 템포:</span>
                      {[
                        { label: '느린 걸음 (30 BPM)', bpm: 30 },
                        { label: '보통 걸음 (45 BPM)', bpm: 45 },
                        { label: '산책 걸음 (60 BPM)', bpm: 60 },
                      ].map((item) => (
                        <button
                          key={item.bpm}
                          onClick={() => setWalkingTempoBpm(item.bpm)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            walkingTempoBpm === item.bpm
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Ambient Nature Sound Selection */}
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="text-xs text-stone-500 font-serif mr-1">자연 배경음:</span>
                      {[
                        { label: '솔바람', type: 'breeze' as const },
                        { label: '계곡물', type: 'stream' as const },
                        { label: '대나무숲', type: 'bamboo' as const },
                      ].map((s) => (
                        <button
                          key={s.type}
                          onClick={() => {
                            setWalkSoundType(s.type);
                            if (isWalkingPacing) {
                              sound.startAmbient(s.type);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs transition-colors ${
                            walkSoundType === s.type ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={toggleWalkingPace}
                      className="px-6 py-3.5 rounded-lg text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 transition-all flex items-center gap-2 shadow-xs"
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
                      className="p-3.5 rounded-lg text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                      title="시간 초기화"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-200 text-center">
                  <button
                    onClick={onOpenBooking}
                    className="text-xs text-stone-900 font-serif font-semibold hover:underline"
                  >
                    → 이 숲길을 직접 걸을 수 있는 템플스테이 신청하기
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
};
