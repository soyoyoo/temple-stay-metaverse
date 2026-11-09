export interface Temple {
  id: string;
  name: string;
  subName: string;
  hanjaName: string;
  location: string;
  region: string;
  summary: string;
  description: string;
  stayConcept: string;
  image: string;
  highlightPoints: string[];
  facilities: string[];
  transportation: {
    publicTransit: string;
    carDirections: string;
    parking: string;
  };
  programsAvailable: string[];
  stayTypes: {
    title: string;
    duration: string;
    target: string;
    cost: string;
  }[];
}

export const TEMPLES: Temple[] = [
  {
    id: 'seocho',
    name: '사회문화회관',
    subName: '도심 속 맑은 영혼의 옹달샘',
    hanjaName: '淨土社會文化會館',
    location: '서울특별시 서초구 (서초동)',
    region: '수도권 · 도심형',
    summary: '복잡한 서울 도심 한복판, 우면산 맑은 기운을 품고 번뇌를 내려놓는 친환경 생태 수행 문화 공간',
    description:
      '사회문화회관은 에너지 절약형 제로에너지 친환경 건축물로 조성된 대표적 도심 도량입니다. 바쁜 직장인과 청년들이 퇴근 후나 주말에 쉽게 찾아와 고요한 명상과 108배, 스님의 즉문즉설을 들으며 지친 마음을 정화하고 참된 나를 만날 수 있는 쉼터입니다.',
    stayConcept: '도심 속 당일형 & 1박 2일 휴식형 마음챙김 스테이',
    image: '/src/assets/images/meditation_hall_zen_1794217871790.jpg',
    highlightPoints: [
      '우면산 숲길을 한눈에 조망하는 15층 옥상 명상 정원과 바람길',
      '소음이 완벽히 차단된 지하 대선방 및 다목적 수행홀',
      '도심 속에서 맛보는 친환경 유기농 비건 발우공양 체험',
      '지하철 3호선 남부터미널역 도보 5분 거리의 탁월한 접근성',
    ],
    facilities: ['지하 대선방', '3층 대법당', '15층 옥상명상정원', '생태북카페 지혜서재', '발우공양간', '개인 숙소 방사'],
    transportation: {
      publicTransit: '지하철 3호선 남부터미널역 5번 출구에서 도보 6분 (약 450m)',
      carDirections: '남부순환로 예술의전당 방면 진입 후 남부터미널 사거리에서 효령로 진입',
      parking: '지하 주차장 이용 가능',
    },
    programsAvailable: ['명상', '108배', '스님 법문 듣기', '도반들과 마음 나누기', '산책 (우면산 둘레길)'],
    stayTypes: [
      {
        title: '도심 일상 쉼 스테이 (1박 2일)',
        duration: '매주 금~토 또는 토~일',
        target: '직장인, 도심 속 고요한 안식을 찾는 분',
        cost: '보시금 자율',
      },
      {
        title: '저녁 힐링 명상 데이 (당일형)',
        duration: '매주 화, 목 19:00 - 21:30',
        target: '퇴근 후 마음의 무게를 털어내고 싶은 분',
        cost: '무료 (자발적 보시)',
      },
    ],
  },
  {
    id: 'mungyeong',
    name: '수련원',
    subName: '행자들의 영원한 수행 본향',
    hanjaName: '聞慶修練院',
    location: '경상북도 문경시',
    region: '영남권 · 산사 심층형',
    summary: '희양산과 은골산의 장엄한 원시림 속에 안긴 수행의 요람, 진정한 침묵과 나를 만나는 곳',
    description:
      '백일출가와 집중 명상 수련이 연중 이루어지는 가장 깊고 성스러운 수행 본도량입니다. 스마트폰과 세속의 번뇌를 완전히 끄고, 맑은 계곡물 소리와 솔바람 소리만이 맴도는 산중에서 새벽 4시 예불, 깊은 위빠사나 명상, 오체투지 108배를 통해 삶의 얽힌 실타래를 완전히 풀어냅니다.',
    stayConcept: '깊은 산속 완전 묵언(默言) & 집중 명상 템플스테이',
    image: '/src/assets/images/mungyeong_retreat_1794217871826.jpg',
    highlightPoints: [
      '원시림에 둘러싸인 천혜의 자연환경과 무공해 청정 계곡',
      '전자기기(스마트폰) 보관 후 오롯이 나와 마주하는 디지털 디톡스',
      '전통 사찰 양식의 대목조 선방과 솔향 가득한 황토 방사',
      '스스로 밥을 짓고 씻어내는 정갈한 생태 발우공양',
    ],
    facilities: ['대선방 (반야당)', '바라밀 법당', '계곡 숲속 산책로', '황토 침묵 숙소', '무소유 공양간', '다도 차실'],
    transportation: {
      publicTransit: '점촌버스터미널에서 가은 방면 시내버스 탑승 후 원북리 하차',
      carDirections: '중부내륙고속도로 문경IC 또는 연풍IC 진출 → 가은 방면 922번 지방도 이용',
      parking: '수련원 입구 주차장',
    },
    programsAvailable: ['명상 (위빠사나 집중)', '108배 (새벽 정진)', '스님 법문 듣기', '도반들과 마음 나누기', '산책 (은골산 계곡 숲길)'],
    stayTypes: [
      {
        title: '주말 묵언 명상 스테이 (2박 3일)',
        duration: '매주 금 17:00 ~ 일 14:00',
        target: '완전한 디지털 디톡스와 깊은 성찰을 원하는 분',
        cost: '보시금 자율',
      },
      {
        title: '산사 쉼 템플스테이 (1박 2일)',
        duration: '상시 운영 (화~일)',
        target: '자연과 숲길에서 휴식을 취하고 싶은 누구나',
        cost: '보시금 자율',
      },
    ],
  },
  {
    id: 'jukrim',
    name: 'J 정사',
    subName: '청아한 대나무 숲',
    hanjaName: '竹林精舍',
    location: '전북특별자치도 장수군',
    region: '호남권 · 생태 역사형',
    summary: '푸른 대나무 숲길 바람 속에 평화가 깃드는 힐링 도량',
    description:
      '사계절 푸른 울창한 대나무 숲이 도량을 감싸고 있어 사각거리는 대잎 소리를 들으며 걷는 대숲 묵언 포행(산책)과 텃밭을 일구는 생태 노동명상이 유명합니다.',
    stayConcept: '대나무 숲길 포행 & 생태 순례 힐링 스테이',
    image: '/src/assets/images/jukrim_bamboo_temple_1794217872587.jpg',
    highlightPoints: [
      '하늘을 찌를 듯 솟은 청정 대나무 숲길(죽림) 묵언 포행 코스',
      '역사적 유서가 깊은 용성조사 유적관 및 대웅전의 장엄함',
      '도반들과 함께 유기농 텃밭을 가꾸는 평화로운 생태 울력',
      '전통 다도와 차담을 통해 나누는 따뜻한 마음나누기 시간',
    ],
    facilities: ['대웅전', '교육관', '대숲 명상로', '생태 텃밭', '탄생관', '연화실(숙소)'],
    transportation: {
      publicTransit: '남원역(KTX) 또는 장수공용버스터미널에서 번암 방면 농어촌버스 탑승',
      carDirections: '순천완주고속도로 서남원IC 또는 광주대구고속도로 지리산IC 이용 후 번암 방면 진입',
      parking: '주차장',
    },
    programsAvailable: ['명상', '108배', '스님 법문 듣기', '도반들과 마음 나누기', '산책 (청정 대나무 숲길)'],
    stayTypes: [
      {
        title: '대숲 바람 힐링 스테이 (1박 2일)',
        duration: '매주 토~일 (상시 접수)',
        target: '마음의 안정과 생태적 평화를 바라는 분',
        cost: '보시금 자율',
      },
      {
        title: '생태 순례 & 역사 템플스테이 (2박 3일)',
        duration: '매월 둘째·넷째 주 금~일',
        target: '대자연을 배우고 싶은 분',
        cost: '보시금 자율',
      },
    ],
  },
];
