const CONFIG={
  categories:{
    restaurant:{label:'식당',subs:['한식','일식','베트남','중식','대만','태국','인도','네팔','싱가포르','말레이시아','인도네시아','필리핀','이탈리아','프랑스','스페인','그리스','미국','멕시코','터키','중동','양식','퓨전','다국적','기타']},
    spa:{label:'마사지',subs:['마사지','발마사지','스파']},
    stay:{label:'숙소',subs:['호텔','레지던스','서비스드 아파트','아파트']},
    karaoke:{label:'가라오케',subs:['한인 가라오케','로컬 KTV']},
    cafe:{label:'카페',subs:['카페','디저트']},
    exchange:{label:'환전소',subs:['환전소·금은방','은행','공항 환전']},
    shopping:{label:'쇼핑',subs:['마트','쇼핑몰','백화점','아울렛']},
    market:{label:'시장',subs:['전통시장','야시장']},
    attraction:{label:'관광명소',subs:['광장·거리','해변','랜드마크','역사·문화유적','공원']},
    bar:{label:'클럽·바',subs:['클럽','루프탑 바','펍']},
    golf:{label:'골프장',subs:['골프장','실내 골프']}
  }
};

const RESTAURANT_TAG_GROUPS=[
  {label:'대표 메뉴',tags:['고기·구이','스테이크','해산물','초밥·회','쌀국수','국수·라멘','반미·샌드위치','국밥·탕','찌개·전골','훠궈·샤부샤부','딤섬·만두','커리','피자','파스타','햄버거','치킨','타코·부리토','분식','베이커리·디저트']},
  {label:'식사 스타일',tags:['뷔페','오마카세','코스요리','브런치','야식','길거리음식','패스트푸드','가정식']},
  {label:'식단 선택',tags:['채식','비건','할랄','글루텐프리']}
];
const RESTAURANT_TAGS=RESTAURANT_TAG_GROUPS.flatMap(group=>group.tags);

const CITY_DATA={
  hcmc:{
    label:'호치민', center:{lat:10.7769,lng:106.7009}, zoom:12,
    areas:[
      {name:'여행자거리 · 부이비엔',type:'거리',desc:'부이비엔 워킹스트리트 중심. 바, 펍, 클럽이 밀집한 대표적인 밤거리.',kind:'circle',center:{lat:10.76742,lng:106.69399},radius:300,zoom:17,color:'#f59e0b'},
      {name:'일본인거리 · 재팬타운',type:'거리',desc:'레탄톤·타이반룽 일대. 일식당, 이자카야, 마사지 등이 밀집한 지역.',kind:'circle',center:{lat:10.77937,lng:106.70470},radius:230,zoom:18,color:'#ef4444'},
      {name:'호치민광장 · 응우옌후에',type:'광장',desc:'응우옌후에 보행자거리와 시청 앞 광장. 카페와 야경 명소가 많은 중심지.',kind:'point',center:{lat:10.77435,lng:106.70305},zoom:17,color:'#3b82f6'},
      {name:'벤탄시장',type:'시장',desc:'기념품, 의류, 먹거리와 환전소가 모여 있는 대표 관광시장.',kind:'circle',center:{lat:10.77257,lng:106.69802},radius:190,zoom:18,color:'#8b5cf6'},
      {name:'빈떠이시장 · 쩌런',type:'시장',desc:'5군 차이나타운의 대표 시장. 로컬 분위기와 도매 상권을 보기 좋은 곳.',kind:'circle',center:{lat:10.75435,lng:106.65185},radius:220,zoom:17,color:'#8b5cf6'},
      {name:'떤딘시장',type:'시장',desc:'핑크성당 인근의 전통시장. 로컬 식재료와 원단 상점이 많은 시장.',kind:'circle',center:{lat:10.78918,lng:106.69056},radius:150,zoom:18,color:'#8b5cf6'},
      {name:'안동시장',type:'시장',desc:'5군의 대표적인 패션·도매 시장. 의류, 원단, 식품과 기념품 쇼핑에 많이 이용됨.',kind:'circle',center:{lat:10.75795,lng:106.67388},radius:180,zoom:18,color:'#8b5cf6'},
      {name:'박당부두 · 사이공강',type:'산책',desc:'응우옌후에 끝자락의 강변 산책 구역. 야경과 수상버스 접근이 편리함.',kind:'circle',center:{lat:10.77335,lng:106.70685},radius:180,zoom:18,color:'#06b6d4'}
    ],
    golf:[
      {name:'Tan Son Nhat Golf Course',address:'No. 6 Tan Son Street, Ho Chi Minh City',lat:10.828414,lng:106.652088},
      {name:'Vietnam Golf & Country Club',address:'Long Thanh My, Thu Duc City, Ho Chi Minh City',lat:10.870000,lng:106.780000},
      {name:'Twin Doves Golf Club',address:'368 Tran Ngoc Len, Binh Duong Ward, Ho Chi Minh City, Vietnam'},
      {name:'Song Be Golf Resort',address:'77 Binh Duong Boulevard, Lai Thieu, Thuan An, Vietnam'},
      {name:'Harmonie Golf Park',address:'469 Tran Ngoc Len, Thu Dau Mot, Vietnam'},
      {name:'Royal Island Golf & Villas',address:'Bach Dang, Tan Uyen, Vietnam'},
      {name:'Emerald Country Club',address:'Dai Phuoc Commune, Nhon Trach District, Dong Nai, Vietnam'},
      {name:'Long Thanh Golf Club',address:'99A Phuoc Tan - Long Hung, Dong Nai, Vietnam',lat:10.862062,lng:106.895374},
      {name:'West Lakes Golf & Villas',address:'145 Provincial Road 822, Hau Nghia, Tay Ninh, Vietnam'},
      {name:'Dong Nai Golf Resort',address:'Trang Bom Town, Dong Nai Province, Vietnam'}
    ]
  },
  hanoi:{
    label:'하노이', center:{lat:21.0285,lng:105.8542}, zoom:13,
    areas:[
      {name:'하노이 올드쿼터 · 36거리',type:'거리',desc:'하노이 구시가지 핵심. 식당, 카페, 쇼핑과 오래된 길드 거리가 밀집.',kind:'circle',center:{lat:21.03410,lng:105.85020},radius:650,zoom:16,color:'#f59e0b'},
      {name:'호안끼엠 호수',type:'명소',desc:'하노이 여행의 중심. 주말 보행자거리와 응옥썬 사원 접근이 편리함.',kind:'circle',center:{lat:21.02875,lng:105.85215},radius:430,zoom:16,color:'#3b82f6'},
      {name:'따히엔 맥주거리',type:'거리',desc:'올드쿼터의 대표적인 밤거리. 맥주와 길거리 음식점이 집중된 지역.',kind:'circle',center:{lat:21.03520,lng:105.85200},radius:150,zoom:18,color:'#ef4444'},
      {name:'동쑤언시장',type:'시장',desc:'하노이 구시가지의 대형 전통시장. 의류, 식품, 생활용품과 기념품 쇼핑.',kind:'circle',center:{lat:21.03855,lng:105.84945},radius:170,zoom:18,color:'#8b5cf6'},
      {name:'올드쿼터 야시장',type:'야시장',desc:'주말 저녁 항다오에서 동쑤언시장 방향으로 이어지는 야시장 구간.',kind:'point',center:{lat:21.03415,lng:105.85040},zoom:17,color:'#8b5cf6'},
      {name:'서호 · 웨스트레이크',type:'호수',desc:'카페, 레스토랑, 호텔과 산책 코스가 많은 하노이 대표 호수 지역.',kind:'circle',center:{lat:21.06020,lng:105.81710},radius:900,zoom:15,color:'#06b6d4'}
    ],
    golf:[
      {name:'Long Bien Golf Club',address:'Phúc Đồng, Long Biên, Hanoi',lat:21.037922,lng:105.895933},
      {name:'Sky Lake Resort & Golf Club',address:'Chương Mỹ, Hanoi',lat:20.846343,lng:105.614129},
      {name:'BRG Kings Island Golf Resort',address:'Đồng Mô, Sơn Tây, Hanoi',lat:21.060953,lng:105.472269}
    ]
  },
  danang:{
    label:'다낭', center:{lat:16.0544,lng:108.2022}, zoom:12,
    areas:[
      {name:'미케비치',type:'해변',desc:'다낭의 대표 해변. 리조트, 해산물 식당과 카페 접근성이 좋음.',kind:'circle',center:{lat:16.05445,lng:108.24605},radius:650,zoom:16,color:'#06b6d4'},
      {name:'안트엉 여행자거리',type:'거리',desc:'미케비치 인근 외국인 밀집 상권. 식당, 펍, 마사지와 카페가 많음.',kind:'circle',center:{lat:16.04700,lng:108.24420},radius:300,zoom:17,color:'#f59e0b'},
      {name:'용다리 · 한강',type:'명소',desc:'다낭 도심의 대표 랜드마크와 한강 주변 야경 구역.',kind:'circle',center:{lat:16.06105,lng:108.22745},radius:350,zoom:17,color:'#3b82f6'},
      {name:'한시장',type:'시장',desc:'다낭 중심의 관광객 이용이 많은 시장. 기념품, 의류, 식품 쇼핑에 편리.',kind:'circle',center:{lat:16.06812,lng:108.22375},radius:160,zoom:18,color:'#8b5cf6'},
      {name:'꼰시장',type:'시장',desc:'로컬 음식과 생활 쇼핑 비중이 높은 다낭 대표 전통시장.',kind:'circle',center:{lat:16.06765,lng:108.21350},radius:180,zoom:18,color:'#8b5cf6'},
      {name:'선짜 야시장',type:'야시장',desc:'용다리 동쪽의 야시장. 먹거리와 쇼핑을 함께 즐기기 쉬운 지역.',kind:'circle',center:{lat:16.06195,lng:108.23530},radius:220,zoom:18,color:'#8b5cf6'},
      {name:'오행산 · 마블마운틴',type:'명소',desc:'다낭 남부의 대표 관광지. 동굴, 사원과 전망 포인트가 있음.',kind:'circle',center:{lat:16.00360,lng:108.26310},radius:350,zoom:16,color:'#10b981'}
    ],
    golf:[
      {name:'BRG Da Nang Golf Resort',address:'Ngũ Hành Sơn, Da Nang',lat:16.020800,lng:108.260200},
      {name:'Montgomerie Links Vietnam',address:'Điện Ngọc, Quảng Nam',lat:15.964434,lng:108.286453},
      {name:'Ba Na Hills Golf Club',address:'Hòa Ninh, Da Nang',lat:16.017261,lng:108.049971},
      {name:'Hoiana Shores Golf Club',address:'Duy Xuyên, Quảng Nam',lat:15.821549,lng:108.404053}
    ]
  },
  nhatrang:{
    label:'나트랑', center:{lat:12.2388,lng:109.1967}, zoom:13,
    areas:[
      {name:'쩐푸 해변거리',type:'해변',desc:'나트랑 중심 해변과 호텔·식당이 길게 이어지는 핵심 관광 구역.',kind:'point',center:{lat:12.23850,lng:109.19660},zoom:16,color:'#06b6d4'},
      {name:'담시장',type:'시장',desc:'나트랑 대표 전통시장. 기념품, 커피, 건어물과 로컬 식품 쇼핑.',kind:'circle',center:{lat:12.25220,lng:109.19175},radius:190,zoom:18,color:'#8b5cf6'},
      {name:'나트랑 야시장',type:'야시장',desc:'쩐푸 해변 인근의 관광 야시장. 저녁 쇼핑과 간단한 먹거리에 편리.',kind:'circle',center:{lat:12.23820,lng:109.19615},radius:160,zoom:18,color:'#8b5cf6'},
      {name:'포나가르 참탑',type:'명소',desc:'나트랑의 대표 역사 유적과 전망 포인트.',kind:'circle',center:{lat:12.26505,lng:109.19515},radius:180,zoom:18,color:'#3b82f6'},
      {name:'혼쫑 곶',type:'명소',desc:'바위 해안과 바다 전망을 볼 수 있는 북쪽 관광지.',kind:'circle',center:{lat:12.27255,lng:109.20200},radius:240,zoom:17,color:'#3b82f6'},
      {name:'세일링클럽 일대',type:'밤거리',desc:'쩐푸 해변 남쪽의 바·클럽·레스토랑이 모인 야간 상권.',kind:'circle',center:{lat:12.23355,lng:109.19645},radius:230,zoom:18,color:'#ef4444'}
    ],
    golf:[
      {name:'KN Golf Links Cam Ranh',address:'Cam Nghĩa, Cam Ranh, Khánh Hòa',lat:11.96959,lng:109.24129},
      {name:'Vinpearl Golf Nha Trang',address:'Hòn Tre Island, Nha Trang',lat:12.21251,lng:109.25808},
      {name:'Diamond Bay Golf & Villas',address:'Phước Đồng, Nha Trang',lat:12.169862,lng:109.197680}
    ]
  },
  phuquoc:{
    label:'푸꾸옥', center:{lat:10.2240,lng:103.9570}, zoom:11,
    areas:[
      {name:'즈엉동 야시장',type:'야시장',desc:'푸꾸옥 중심의 대표 야시장. 해산물, 간식과 기념품 쇼핑.',kind:'circle',center:{lat:10.21375,lng:103.95900},radius:180,zoom:18,color:'#8b5cf6'},
      {name:'딘꺼우 사원 · 항구',type:'명소',desc:'즈엉동 중심의 바다 전망과 일몰 명소.',kind:'circle',center:{lat:10.21620,lng:103.95900},radius:190,zoom:18,color:'#3b82f6'},
      {name:'롱비치',type:'해변',desc:'즈엉동 남쪽으로 이어지는 대표적인 리조트·선셋 해변 구역.',kind:'circle',center:{lat:10.18300,lng:103.95700},radius:900,zoom:15,color:'#06b6d4'},
      {name:'선셋타운 · 키스브리지',type:'명소',desc:'푸꾸옥 남부의 관광·공연·야경 중심 구역.',kind:'circle',center:{lat:10.02850,lng:104.00800},radius:650,zoom:16,color:'#3b82f6'},
      {name:'사오비치',type:'해변',desc:'푸꾸옥 남동부의 대표 백사장 해변.',kind:'circle',center:{lat:10.05700,lng:104.03600},radius:650,zoom:16,color:'#06b6d4'},
      {name:'그랜드월드',type:'관광단지',desc:'북부 리조트·쇼핑·야간 엔터테인먼트가 모인 관광 단지.',kind:'circle',center:{lat:10.31900,lng:103.86900},radius:750,zoom:15,color:'#f59e0b'}
    ],
    golf:[
      {name:'Eschuri Vung Bau Golf',address:'Vũng Bầu, Phú Quốc',lat:10.30250,lng:103.86150}
    ]
  },
  dalat:{
    label:'달랏', center:{lat:11.9404,lng:108.4583}, zoom:13,
    areas:[
      {name:'달랏시장 · 야시장',type:'시장',desc:'달랏 중심의 대표 시장과 야시장. 먹거리, 과일, 의류와 기념품 쇼핑.',kind:'circle',center:{lat:11.94025,lng:108.43710},radius:220,zoom:18,color:'#8b5cf6'},
      {name:'쑤언흐엉 호수',type:'호수',desc:'달랏 중심의 대표 호수. 카페와 산책 동선의 기준점.',kind:'circle',center:{lat:11.94100,lng:108.44530},radius:600,zoom:16,color:'#06b6d4'},
      {name:'럼비엔 광장',type:'광장',desc:'달랏의 상징적인 광장과 대형 조형물이 있는 관광 중심지.',kind:'circle',center:{lat:11.93825,lng:108.44810},radius:230,zoom:18,color:'#3b82f6'},
      {name:'크레이지하우스',type:'명소',desc:'독특한 건축으로 유명한 달랏의 대표 관광명소.',kind:'circle',center:{lat:11.93490,lng:108.43000},radius:160,zoom:18,color:'#3b82f6'},
      {name:'뚜옌람 호수',type:'자연',desc:'케이블카, 리조트와 골프장이 있는 달랏 남부의 호수 관광지.',kind:'circle',center:{lat:11.90000,lng:108.44000},radius:1200,zoom:14,color:'#10b981'}
    ],
    golf:[
      {name:'Dalat Palace Golf Club',address:'Phu Dong Thien Vuong, Da Lat',lat:11.952405,lng:108.445122},
      {name:'SAM Tuyen Lam Golf Club',address:'Tuyen Lam Lake, Da Lat',lat:11.880000,lng:108.460000}
    ]
  },
  hoian:{
    label:'호이안', center:{lat:15.8801,lng:108.3380}, zoom:13,
    areas:[
      {name:'호이안 올드타운',type:'구시가지',desc:'등불, 고택, 카페와 레스토랑이 밀집한 호이안 핵심 관광 구역.',kind:'circle',center:{lat:15.88010,lng:108.33800},radius:500,zoom:17,color:'#f59e0b'},
      {name:'호이안 중앙시장',type:'시장',desc:'올드타운 남쪽의 전통시장. 로컬 음식과 식재료를 보기 좋은 곳.',kind:'circle',center:{lat:15.87780,lng:108.33555},radius:150,zoom:18,color:'#8b5cf6'},
      {name:'호이안 야시장',type:'야시장',desc:'투본강 건너 안호이 지역의 야시장과 등불 상권.',kind:'circle',center:{lat:15.87675,lng:108.33330},radius:180,zoom:18,color:'#8b5cf6'},
      {name:'일본교 · 내원교',type:'명소',desc:'호이안 올드타운을 상징하는 대표 랜드마크.',kind:'circle',center:{lat:15.8771241,lng:108.3260312},radius:120,zoom:19,color:'#3b82f6'},
      {name:'안방비치',type:'해변',desc:'호이안에서 접근하기 쉬운 대표 해변과 해변 레스토랑 구역.',kind:'circle',center:{lat:15.91400,lng:108.33900},radius:500,zoom:16,color:'#06b6d4'}
    ],
    golf:[
      {name:'Hoiana Shores Golf Club',address:'Duy Xuyên, Quảng Nam',lat:15.821549,lng:108.404053},
      {name:'Montgomerie Links Vietnam',address:'Điện Ngọc, Quảng Nam',lat:15.964434,lng:108.286453}
    ]
  }
,
  vungtau:{
    label:'붕따우·호짬', center:{lat:10.4070,lng:107.1350}, zoom:11,
    areas:[
      {name:'붕따우 백비치 · 바이사우',type:'해변',desc:'붕따우에서 가장 많이 찾는 대표 해변. 호텔·해산물 식당과 해변 산책 구역이 밀집.',kind:'circle',center:{lat:10.34080,lng:107.09430},radius:1000,zoom:15,color:'#06b6d4'},
      {name:'붕따우 프론트비치 · 바이쯔억',type:'해변',desc:'도심과 가까운 해변과 공원·카페가 모인 붕따우 중심 관광구역.',kind:'circle',center:{lat:10.34665,lng:107.07335},radius:650,zoom:16,color:'#3b82f6'},
      {name:'붕따우 야시장',type:'야시장',desc:'해산물과 야식으로 유명한 붕따우 대표 야시장.',kind:'circle',center:{lat:10.34510,lng:107.09750},radius:220,zoom:18,color:'#8b5cf6'},
      {name:'호짬 비치 · 리조트존',type:'해변',desc:'호치민에서 주말 여행으로 많이 찾는 리조트·해변 지역. 주요 리조트와 골프장이 밀집.',kind:'circle',center:{lat:10.46360,lng:107.44390},radius:1800,zoom:14,color:'#06b6d4'},
      {name:'롱하이 해변',type:'해변',desc:'붕따우와 호짬 사이의 조용한 해변·리조트 지역.',kind:'circle',center:{lat:10.38500,lng:107.24000},radius:1000,zoom:15,color:'#10b981'}
    ],
    golf:[
      {name:'Vung Tau Paradise Golf Club',address:'01 Thuy Van Street, Vung Tau, Vietnam'},
      {name:'The Bluffs Grand Ho Tram',address:'The Grand Ho Tram, Xuyen Moc, Ba Ria - Vung Tau, Vietnam'}
    ]
  },
  muine:{
    label:'무이네', center:{lat:10.9330,lng:108.2870}, zoom:12,
    areas:[
      {name:'함띠엔 · 무이네 여행자거리',type:'거리',desc:'리조트, 식당, 카페와 마사지가 이어지는 무이네 대표 여행자 상권. 참고 위치는 100 Nguyễn Đình Chiểu이며 거리 전체의 경계가 아닙니다.',kind:'point',center:{lat:10.953148,lng:108.215703},zoom:15,color:'#f59e0b'},
      {name:'무이네 어촌 · 피싱빌리지',type:'명소',desc:'어선과 해산물 시장 풍경을 볼 수 있는 무이네 대표 지역.',kind:'circle',center:{lat:10.93650,lng:108.27950},radius:500,zoom:16,color:'#3b82f6'},
      {name:'레드샌드듄',type:'명소',desc:'무이네 대표 사구 관광지. 일출·일몰 시간대 방문객이 많음.',kind:'circle',center:{lat:10.94865,lng:108.29630},radius:450,zoom:16,color:'#ef4444'},
      {name:'판티엣 중앙시장',type:'시장',desc:'판티엣 도심의 전통시장. 해산물과 로컬 식품 쇼핑에 이용.',kind:'circle',center:{lat:10.92880,lng:108.10450},radius:220,zoom:17,color:'#8b5cf6'}
    ],
    golf:[
      {name:'PGA NovaWorld Phan Thiet - Ocean Course',address:'NovaWorld Phan Thiet, Tien Thanh, Phan Thiet, Vietnam'},
      {name:'PGA NovaWorld Phan Thiet - Garden Course',address:'NovaWorld Phan Thiet, Tien Thanh, Phan Thiet, Vietnam'}
    ]
  }
};


const CITY_RANGES={
  hcmc:{radius:15000,color:'#1a73e8'},
  hanoi:{radius:14000,color:'#1a73e8'},
  danang:{radius:11000,color:'#1a73e8'},
  nhatrang:{radius:8500,color:'#1a73e8'},
  phuquoc:{radius:22000,color:'#1a73e8'},
  dalat:{radius:9000,color:'#1a73e8'},
  hoian:{radius:7000,color:'#1a73e8'},
  vungtau:{radius:23000,color:'#1a73e8'},
  muine:{radius:18000,color:'#1a73e8'}
};

const EXTRA_DATA={
  hcmc:{
    zones:[
      {name:'푸미흥 · 7군 한인생활권',type:'한인생활권',desc:'한국 식당·마트·숙소 이용이 편하고 한국인 거주 비중이 높은 푸미흥 중심 생활권.',kind:'circle',center:{lat:10.72975,lng:106.71302},radius:900,zoom:15,color:'#22c55e'},
      {name:'2군 타오디엔 · 안푸',type:'한인생활권',desc:'타오디엔·안푸 중심의 외국인·한국인 생활권. 카페, 국제학교, 레스토랑, 아파트가 많음.',kind:'circle',center:{lat:10.80680,lng:106.73120},radius:1100,zoom:15,color:'#22c55e'}
    ],
    points:[
      {name:'사이공역',type:'기차역',lat:10.78255,lng:106.67795,address:'1 Nguyễn Thông, District 3, Ho Chi Minh City, Vietnam',icon:'R',desc:'호치민 도심의 주요 여객 철도역. 베트남 남북선 이용.'},

      {name:'LOTTE Mart District 7',type:'쇼핑',lat:10.74111,lng:106.70193,address:'469 Nguyễn Hữu Thọ, Tân Hưng, Ho Chi Minh City, Vietnam',icon:'🛒',desc:'7군의 대형 마트. 식품·생활용품·쇼핑을 한 번에 이용하기 좋은 곳.'},
      {name:'Vincom Center Đồng Khởi',type:'쇼핑',lat:10.77816,lng:106.70189,address:'72 Lê Thánh Tôn, Ho Chi Minh City, Vietnam',icon:'V',desc:'1군 중심의 대형 쇼핑몰. 패션·식당·카페와 다양한 브랜드가 입점.'},
      {name:'Vincom Mega Mall Thảo Điền',type:'쇼핑',lat:10.80242,lng:106.74124,address:'161 Võ Nguyên Giáp, Thảo Điền, Ho Chi Minh City, Vietnam',icon:'V',desc:'타오디엔 지역 대형 쇼핑몰. 메트로 1호선과 접근성이 좋음.'},
      {name:'Crescent Mall',type:'쇼핑',lat:10.72899,lng:106.71869,address:'101 Tôn Dật Tiên, District 7, Ho Chi Minh City, Vietnam',icon:'C',desc:'푸미흥의 대표 쇼핑몰. 식당·카페·쇼핑 브랜드가 밀집.'},
      {name:'Saigon Centre · Takashimaya',type:'쇼핑',lat:10.77295,lng:106.70066,address:'92-94 Nam Kỳ Khởi Nghĩa, District 1, Ho Chi Minh City, Vietnam',icon:'T',desc:'1군 중심의 백화점·쇼핑몰. Takashimaya와 다양한 브랜드가 입점.'},
      {name:'AEON Mall Tân Phú',type:'쇼핑',lat:10.80118,lng:106.61789,address:'30 Tân Thắng, Tân Phú, Ho Chi Minh City, Vietnam',icon:'A',desc:'대형 쇼핑몰과 마트가 결합된 복합 쇼핑 공간.'},
      {name:'Thiso Mall Sala',type:'쇼핑',lat:10.772056,lng:106.722286,address:'10 Mai Chí Thọ, Thủ Đức, Ho Chi Minh City, Vietnam',icon:'S',desc:'살라 신도시의 대형 쇼핑몰. 식당·카페·쇼핑 시설이 함께 있음.'},

      {name:'떤선녓 국제공항',type:'공항',lat:10.81810,lng:106.65570,icon:'✈',desc:'호치민시 주요 공항. 국내선 T1·T3, 국제선 T2 운영.'},
      {name:'떤선녓 T1 국내선 터미널',type:'터미널',lat:10.81390,lng:106.66209,icon:'T1',desc:'국내선 터미널. Grab 국내선 승차는 공항 지정 구역을 이용.'},
      {name:'일반택시 승차 · T1 국내선',type:'택시승차',lat:10.81358,lng:106.66230,icon:'TAXI',desc:'T1 도착층 택시 승차 구역. 현장 TAXI 표지와 공항 직원 안내를 우선하세요.'},
      {name:'떤선녓 T2 국제선 터미널',type:'터미널',lat:10.81680,lng:106.66433,icon:'T2',desc:'국제선 터미널. 국제선 도착 Grab은 주차장 지정 구역을 이용.'},
      {name:'떤선녓 T3 국내선 터미널',type:'터미널',lat:10.81215,lng:106.65378,icon:'T3',desc:'2025년 개장 국내선 터미널.'},
      {name:'일반택시 승차 · T3',type:'택시승차',lat:10.81172,lng:106.65386,icon:'TAXI',desc:'T3 도착층 인근 지정 택시 승차 구역. 현장 표지와 앱 안내를 우선하세요.'},
      {"name": "Green SM · T1 국내선 승차 안내", "type": "그린SM승차", "lat": 10.81358, "lng": 106.6623, "icon": "SM", "desc": "Green SM(구 Xanh SM) 택시 대기열은 C차로 C3–C6 기둥입니다. 앱 배차 차량은 D2차로 G6–B6 안내를 확인하세요. 앱에서 선택한 서비스와 승차 지점을 맞춰 주세요.", "address": "떤선녓공항 T1 도착층 · C차로 / D2차로", "sourceUrl": "https://www.greensm.com/vn-vi/news/huong-dan-su-dung-xanhnow-tai-san-bay", "sourceLabel": "Green SM 공식 승차 안내", "locationNote": "지도는 터미널 주변 안내 위치입니다. 실제 승차 지점은 차로 표지와 앱 안내를 확인하세요."},
      {"name": "Green SM · T2 국제선 승차 안내", "type": "그린SM승차", "lat": 10.81615, "lng": 106.6634, "icon": "SM", "desc": "Green SM 택시는 A차로 A1–A4 기둥에서 찾으세요. 앱 배차 차량은 주차장 지정 구역을 이용하므로 앱의 최종 픽업 지점을 확인하세요.", "address": "떤선녓공항 T2 도착층 · A차로 A1–A4", "sourceUrl": "https://www.greensm.com/vn-vi/news/huong-dan-su-dung-xanhnow-tai-san-bay", "sourceLabel": "Green SM 공식 승차 안내", "locationNote": "지도는 터미널 주변 안내 위치입니다. 실제 승차 지점은 차로 표지와 앱 안내를 확인하세요."},
      {"name": "Green SM · T3 국내선 승차 안내", "type": "그린SM승차", "lat": 10.81172, "lng": 106.65386, "icon": "SM", "desc": "GreenNow 대기 차량은 A차로 12A–15A 기둥입니다. 일반 앱 배차는 11A–12A 또는 34–35A 기둥 안내를 확인하세요. 앱에서 요금과 차량을 확인한 뒤 탑승하세요.", "address": "떤선녓공항 T3 도착층 · A차로", "sourceUrl": "https://www.greensm.com/vn-vi/news/huong-dan-su-dung-xanhnow-tai-san-bay", "sourceLabel": "Green SM 공식 승차 안내", "locationNote": "지도는 터미널 주변 안내 위치입니다. 실제 승차 지점은 차로 표지와 앱 안내를 확인하세요."},
      {"name": "시내버스 109 · T3 승차 안내", "type": "버스승차", "lat": 10.81215, "lng": 106.65378, "icon": "BUS", "desc": "T3에서 사이공 버스터미널(9·23 공원) 방면으로 가는 109번입니다. 도착 후 BUS / 109 표지를 따라가세요. 109번은 T1·T2를 경유하지 않으므로 터미널을 확인하세요. 막차·요금·하차 정류장은 현장 안내를 확인하세요.", "address": "떤선녓공항 T3 · 버스 표지 확인", "sourceUrl": "https://en.sggp.org.vn/bus-no-109-changed-its-route-connecting-to-new-terminal-3-post117254.html", "sourceLabel": "SGGP 109번 노선 변경 안내", "locationNote": "지도는 터미널 주변 안내 위치입니다. 실제 승차 지점은 차로 표지와 앱 안내를 확인하세요."},
      {"name": "시내버스 152 · T1 승차 안내", "type": "버스승차", "lat": 10.8139, "lng": 106.66209, "icon": "BUS", "address": "떤선녓공항 T1 도착층 · B차로", "desc": "도착장을 나와 B차로의 BUS / 152 표지를 찾으세요. 벤탄(함응이)·쭝선 방면입니다. 탑승 전 방향·요금·짐 요금을 확인하고 숙소와 가까운 정류장에서 하차하세요.", "locationNote": "지도는 해당 터미널을 찾는 안내 위치입니다. 정류장 표지에서 152번과 진행 방향을 확인하세요.", "sourceUrl": "https://thaiest.com/vietnam/travel/ho-chi-minh-airport-bus-152", "sourceLabel": "152번 노선·승차 위치 안내"},
      {"name": "시내버스 152 · T2 승차 안내", "type": "버스승차", "lat": 10.8168, "lng": 106.66433, "icon": "BUS", "address": "떤선녓공항 T2 국제선 도착장 건너편", "desc": "국제선 도착장 출구 건너편 BUS STATION / 152 표지를 찾으세요. 지정 횡단보도를 이용하세요. 벤탄(함응이)·쭝선 방면입니다. 탑승 전 방향·요금·짐 요금을 확인하고 숙소와 가까운 정류장에서 하차하세요.", "locationNote": "지도는 해당 터미널을 찾는 안내 위치입니다. 정류장 표지에서 152번과 진행 방향을 확인하세요.", "sourceUrl": "https://thaiest.com/vietnam/travel/ho-chi-minh-airport-bus-152", "sourceLabel": "152번 노선·승차 위치 안내"},
      {name:'Grab T1 승차 · Lane D1',type:'그랩승차',lat:10.81375,lng:106.66155,icon:'G',desc:'Grab 공식 안내의 국내선 Làn D1 승차구역. 현장 표지·앱 안내 우선.'},
      {name:'Grab T2 승차 · 국제선 지정구역',type:'그랩승차',lat:10.81655,lng:106.66385,icon:'G',desc:'국제선 도착 주차장/지정 승차구역. Grab 앱에서 최종 픽업 포인트 확인.'},
      {name:'Grab T3 승차 · PNA 주차장 1층',type:'그랩승차',lat:10.81180,lng:106.65355,icon:'G',desc:'T3 도착층 연결 PNA 주차장 1층 Grab 승차구역.'},
      {name:'일반택시 승차 · T2 국제선',type:'택시승차',lat:10.81615,lng:106.66340,icon:'TAXI',desc:'떤선녓 T2 국제선 도착층 택시·전기택시 지정 승차구역. 실제 승차 위치는 현장 표지와 앱 안내를 우선하세요.'},
      {name:'공항버스 승차구역',type:'공항',lat:10.81445,lng:106.66175,icon:'B',desc:'떤선녓 공항 버스 승차구역. 노선별 정류장은 현장 표지에서 확인.'},
      {name:'벤탄역 · Metro 1호선',type:'전철역',lat:10.77095,lng:106.69788,icon:'M',desc:'Metro 1호선 도심 종점. 벤탄시장·부이비엔 접근.'},
      {name:'오페라하우스역',type:'전철역',lat:10.77620,lng:106.70355,icon:'M',desc:'동커이·응우옌후에 접근이 편한 지하역.'},
      {name:'바손역',type:'전철역',lat:10.78175,lng:106.70740,icon:'M',desc:'사이공강·바손 지역 접근.'},
      {name:'타오디엔역',type:'전철역',lat:10.80049,lng:106.73365,icon:'M',desc:'2군 타오디엔 생활권 접근.'},
      {name:'안푸역',type:'전철역',lat:10.80260,lng:106.74225,icon:'M',desc:'안푸·빈컴 메가몰 인근.'},
      {name:'수오이띠엔 터미널역',type:'전철역',lat:10.87953,lng:106.81406,icon:'M',desc:'Metro 1호선 동쪽 종점.'},
      {name:'미엔동 신터미널',type:'터미널',lat:10.87955,lng:106.81619,icon:'B',desc:'호치민 동부 장거리 버스 신터미널. 수오이띠엔역과 인접.'},
      {name:'미엔떠이 버스터미널',type:'터미널',lat:10.74104,lng:106.61898,icon:'B',desc:'메콩델타·서부 방면 장거리 버스 터미널.'},
      {name:'FV Hospital',type:'병원',address:'6 Nguyen Luong Bang St., Tan My Ward, Ho Chi Minh City',icon:'H',desc:'7군 국제병원. 응급서비스 24/7. 대표전화 (028) 35 11 33 33.'},
      {name:'Vinmec Central Park International Hospital',type:'병원',address:'720A Dien Bien Phu Street, Thanh My Tay Ward, Ho Chi Minh City',icon:'H',desc:'빈홈 센트럴파크 인근 국제종합병원. 대표전화 0283 6221 166.'},
      {name:'Hoan My Sai Gon Hospital',type:'병원',address:'60-60A Phan Xich Long Street, Cau Kieu Ward, Ho Chi Minh City',icon:'H',desc:'호치민의 주요 종합병원 중 하나. 24시간 운영.'}
    ]
  },
  hanoi:{
    zones:[
      {name:'미딩 · 경남랜드마크 한인생활권',type:'한인생활권',desc:'하노이 대표 한인 생활권. 한국 식당·마트·아파트와 사무실 밀집.',kind:'circle',center:{lat:21.01620,lng:105.78320},radius:1200,zoom:15,color:'#22c55e'}
    ],
    points:[
      {name:'하노이역',type:'기차역',lat:21.02466,lng:105.84118,address:'120 Lê Duẩn, Hoàn Kiếm, Hanoi, Vietnam',icon:'R',desc:'하노이 중심의 주요 철도역. 남북선과 북부 노선 이용.'},

      {name:'노이바이 국제공항',type:'공항',lat:21.21871,lng:105.80417,icon:'✈',desc:'하노이 주요 공항.'},
      {name:'노이바이 T1 국내선',type:'터미널',lat:21.21457,lng:105.80268,icon:'T1',desc:'국내선 터미널.'},
      {name:'일반택시 승차 · 노이바이 T1',type:'택시승차',lat:21.21425,lng:105.80245,icon:'TAXI',desc:'T1 도착층 지정 택시 승차구역. 현장 TAXI 표지 우선.'},
      {name:'노이바이 T2 국제선',type:'터미널',lat:21.21858,lng:105.79228,icon:'T2',desc:'국제선 터미널.'},
      {name:'일반택시 승차 · 노이바이 T2',type:'택시승차',lat:21.21820,lng:105.79225,icon:'TAXI',desc:'T2 도착층 지정 택시 승차구역. 현장 TAXI 표지 우선.'},
      {name:'Grab T1 승차 안내 · Hall E / P2',type:'그랩승차',lat:21.21440,lng:105.80225,icon:'G',desc:'2026년 8월 VOV 안내: Hall E 인근 P2 지정 승차구역. 이 핀은 터미널 주변 참고 위치입니다. 실제 승차 지점은 앱·현장 표지를 확인하세요.'},
      {name:'Grab T2 승차 · P1 주차장',type:'그랩승차',lat:21.21815,lng:105.79155,icon:'G',desc:'2026년 8월 VOV 안내: T2 P1 지정 주차장, 혼잡 시 P7 안내 가능. 핀은 주변 참고 위치이며 앱·현장 표지에서 최종 승차 지점을 확인하세요.'},
      {name:'T1↔T2 무료 셔틀 · T1',type:'버스승차',lat:21.21435,lng:105.80265,icon:'B',desc:'T1 도착층 Hall A. 터미널 간 무료 셔틀.'},
      {name:'T1↔T2 무료 셔틀 · T2',type:'버스승차',lat:21.21830,lng:105.79200,icon:'B',desc:'T2 도착층 Lane 2, 지정 기둥 인근. 현장 안내 우선.'},
      {name:'미딩 버스터미널',type:'터미널',lat:21.02815,lng:105.77860,icon:'B',desc:'하노이 서부·북서부 방면 주요 버스터미널.'},
      {name:'잡밧 버스터미널',type:'터미널',lat:20.98055,lng:105.84145,icon:'B',desc:'하노이 남부 방면 주요 버스터미널.'},
      {name:'깟린역',type:'전철역',lat:21.02815,lng:105.82555,icon:'M',desc:'하노이 도시철도 2A호선 도심 출발역.'},
      {name:'꺼우저이역',type:'전철역',lat:21.03565,lng:105.79395,icon:'M',desc:'하노이 메트로 Nhon–Hanoi Station 구간 주요역.'},
      {name:'Vinmec Times City International Hospital',type:'병원',address:'458 Minh Khai Street, Vinh Tuy Ward, Hanoi City',icon:'H',desc:'타임시티 내 국제종합병원. 대표전화 024 3974 3556.'},
      {name:'Hanoi French Hospital',type:'병원',address:'1 Phuong Mai Street, Kim Lien Ward, Hanoi City',icon:'H',desc:'하노이 프렌치 병원. 24/7 응급진료 운영. 응급 024 3574 1111.'}
    ]
  },
  danang:{
    zones:[
      {name:'미안 · 안트엉 한인·여행자 생활권',type:'한인생활권',desc:'한국인 여행객·장기체류자가 많이 이용하는 미케비치 남쪽 생활권.',kind:'circle',center:{lat:16.04700,lng:108.24420},radius:650,zoom:16,color:'#22c55e'}
    ],
    points:[
      {name:'다낭역',type:'기차역',lat:16.07022,lng:108.20966,address:'202 Hải Phòng, Đà Nẵng, Vietnam',icon:'R',desc:'다낭 도심의 주요 철도역. 남북선 이용.'},

      {name:'다낭 국제공항',type:'공항',lat:16.04392,lng:108.19937,icon:'✈',desc:'다낭 도심과 가까운 공항.'},
      {name:'다낭 T1 국내선',type:'터미널',lat:16.04455,lng:108.19855,icon:'T1',desc:'국내선 터미널.'},
      {name:'일반택시 · Xanh SM 승차 · 다낭 T1',type:'택시승차',lat:16.04425,lng:108.19865,icon:'TAXI',desc:'T1 도착층 택시·전기택시 승차구역. 현장 표지 우선.'},
      {name:'다낭 T2 국제선',type:'터미널',lat:16.04320,lng:108.20110,icon:'T2',desc:'국제선 터미널.'},
      {name:'일반택시 · Xanh SM 승차 · 다낭 T2',type:'택시승차',lat:16.04295,lng:108.20115,icon:'TAXI',desc:'T2 도착층 택시·전기택시 승차구역. 현장 표지 우선.'},
      {name:'Grab T1 국내선 · A/B1/B2/C',type:'그랩승차',lat:16.04410,lng:108.19810,icon:'G',desc:'2026년 6월 Grab 공식 안내: 국내선은 서비스 방식에 따라 A 또는 B1·B2·C 승차구역을 이용. 정확한 지점은 Grab 앱 안내를 우선.'},
      {name:'Grab T2 국제선 · Lane 1·2',type:'그랩승차',lat:16.04275,lng:108.20095,icon:'G',desc:'Grab 공항 안내에 표시된 국제선 도착 Lane 1·2. 앱 안내 우선.'},
      {name:'다낭 중앙 버스터미널',type:'터미널',lat:16.06670,lng:108.17180,icon:'B',desc:'후에·호이안 외곽·중부 지역 장거리 버스 이용.'},
      {name:'Family Hospital Da Nang',type:'병원',address:'73 Nguyen Huu Tho Street, Da Nang City',icon:'H',desc:'외국인 진료 지원이 있는 종합병원. 한국어 핫라인 0911 424 040, 응급 24/7.'},
      {name:'Vinmec Da Nang Hospital',type:'병원',address:'30 Thang 4 Street, Hoa Cuong Ward, Da Nang City',icon:'H',desc:'다낭 국제종합병원. 응급의학과 24시간 운영.'},
      {name:'Hoan My Da Nang Hospital',type:'병원',address:'291 Nguyen Van Linh Street, Thanh Khe Ward, Da Nang City',icon:'H',desc:'다낭 주요 종합병원. 24시간 운영.'}
    ]
  },
  nhatrang:{
    zones:[],
    points:[
      {name:'나트랑역',type:'기차역',lat:12.24818,lng:109.18417,address:'17 Thái Nguyên, Nha Trang, Khánh Hòa, Vietnam',icon:'R',desc:'나트랑 도심의 주요 철도역. 남북선 이용.'},

      {name:'깜라인 국제공항',type:'공항',lat:11.99815,lng:109.21937,icon:'✈',desc:'나트랑 시내에서 남쪽에 위치한 주요 공항.'},
      {name:'깜라인 T1 국내선',type:'터미널',lat:11.99755,lng:109.21925,icon:'T1',desc:'국내선 터미널.'},
      {name:'깜라인 T2 국제선',type:'터미널',lat:11.99910,lng:109.21975,icon:'T2',desc:'국제선 터미널.'},
      {name:'Grab T1 승차 · 기둥 05·06·07',type:'그랩승차',lat:11.99730,lng:109.21910,icon:'G',desc:'2026년 Grab 공식 안내: 국내선 도착장 앞 기둥 05·06·07.'},
      {name:'일반택시 · Xanh SM 승차 · T2',type:'택시승차',lat:11.99905,lng:109.21945,icon:'TAXI',desc:'깜라인 국제선 T2 도착층 택시·Xanh SM 승차구역. 현장 표지를 우선 확인하세요.'},
      {name:'나트랑 남부 버스터미널',type:'터미널',lat:12.21480,lng:109.19110,icon:'B',desc:'남부·달랏·호치민 방면 장거리 이동에 이용.'},
      {name:'나트랑 북부 버스터미널',type:'터미널',lat:12.28220,lng:109.19180,icon:'B',desc:'북부 방면 장거리 버스 이용.'},
      {name:'Vinmec Nha Trang Hospital',type:'병원',address:'Tran Phu Street, Tay Son, Nha Trang Ward, Khanh Hoa Province',icon:'H',desc:'쩐푸 해변권의 국제종합병원. 대표전화 0258 3900 168.'}
    ]
  },
  phuquoc:{
    zones:[],
    points:[
      {name:'푸꾸옥 국제공항',type:'공항',lat:10.16980,lng:103.99310,icon:'✈',desc:'푸꾸옥 섬 주요 공항.'},
      {name:'푸꾸옥 공항 여객터미널',type:'터미널',lat:10.16935,lng:103.99300,icon:'T',desc:'도착층에서 택시·앱 차량 이용. 최종 승차 위치는 앱·현장 안내 우선.'},
      {name:'Grab 승차 · 푸꾸옥 공항',type:'그랩승차',lat:10.16935,lng:103.99300,icon:'G',desc:'GrabCar 이용 가능 공항. 정확한 승차 지점은 도착 후 Grab 앱에 표시되는 픽업 포인트를 우선 확인하세요.'},
      {name:'일반택시 · Xanh SM 승차 · 푸꾸옥 공항',type:'택시승차',lat:10.16910,lng:103.99315,icon:'TAXI',desc:'여객터미널 도착층 택시·전기택시 승차구역. 현장 안내 우선.'},
      {name:'바이봉 페리터미널',type:'터미널',lat:10.12465,lng:104.00870,icon:'F',desc:'라익자·하티엔 방면 고속선이 드나드는 주요 선착장.'},
      {name:'Vinmec Phu Quoc Hospital',type:'병원',address:'Bai Dai Area, Phu Quoc Special Zone, An Giang Province, Vietnam',icon:'H',desc:'푸꾸옥 북부 국제종합병원. 대표전화 0297 3985 588.'}
    ]
  },
  dalat:{
    zones:[],
    points:[
      {name:'달랏역',type:'기차역',lat:11.94173,lng:108.45446,address:'1 Quang Trung, Da Lat, Lam Dong, Vietnam',icon:'R',desc:'달랏의 역사적인 철도역. 현재 관광열차 이용 중심.'},

      {name:'리엔크엉 국제공항',type:'공항',lat:11.75000,lng:108.36700,icon:'✈',desc:'달랏 남쪽의 주요 공항.'},
      {name:'Grab 승차 · 리엔크엉 공항',type:'그랩승차',lat:11.74990,lng:108.36705,icon:'G',desc:'GrabCar 이용 가능 공항. 정확한 픽업 지점은 Grab 앱과 현장 안내를 우선 확인하세요.'},
      {name:'일반택시 승차 · 리엔크엉 공항',type:'택시승차',lat:11.74972,lng:108.36712,icon:'TAXI',desc:'공항 도착층 지정 택시 승차구역. 현장 TAXI 표지 우선.'},
      {name:'달랏 시외버스터미널',type:'터미널',lat:11.92930,lng:108.45860,icon:'B',desc:'호치민·나트랑 등 장거리 버스 이용.'},
      {name:'Hoan My Da Lat Hospital',type:'병원',address:'Long Tho Hill, Xuan Huong Ward, Da Lat, Lam Dong Province',icon:'H',desc:'달랏 주요 종합병원. 24시간 운영. 대표전화 0263 7303 888.'}
    ]
  },
  hoian:{
    zones:[],
    points:[
      {name:'호이안 버스터미널',type:'터미널',lat:15.88730,lng:108.32760,icon:'B',desc:'호이안 시내 버스·지역 이동 거점.'},
      {name:'다낭 국제공항 이용',type:'공항',lat:16.04392,lng:108.19937,icon:'✈',desc:'호이안 항공 이동은 보통 다낭 국제공항을 이용.'},
      {name:'Grab T1 국내선 · A/B1/B2/C (다낭공항)',type:'그랩승차',lat:16.04410,lng:108.19810,icon:'G',desc:'2026년 Grab 안내 기준. 국내선은 서비스에 따라 A 또는 B1·B2·C 승차구역을 이용하며 앱의 최종 픽업 안내를 우선하세요.'},
      {name:'Grab T2 국제선 · Lane 1·2 (다낭공항)',type:'그랩승차',lat:16.04275,lng:108.20095,icon:'G',desc:'Grab 공항 안내의 국제선 도착 Lane 1·2. 이 핀은 주변 참고 위치입니다. 앱과 현장 표지의 최종 승차 지점을 확인하세요.'},
      {name:'Saigon Hoi An General Hospital',type:'병원',address:'06 Phan Dinh Phung, Hoi An Tay Ward, Da Nang City',icon:'H',desc:'호이안 종합병원. 24/7 응급 핫라인 1900 8686 30.'},
      {name:'Hoi An Regional Medical Center',type:'병원',address:'04 Tran Hung Dao, Hoi An Ward, Da Nang City',icon:'H',desc:'호이안 지역 공공 의료기관. 대표전화 0235 3861364.'}
    ]
  },
  vungtau:{
    zones:[],
    points:[]
  },
  muine:{
    zones:[],
    points:[
      {name:'판티엣역',type:'기차역',lat:10.92815,lng:108.11695,address:'Phan Thiết Railway Station, Bình Thuận, Vietnam',icon:'R',desc:'무이네·판티엣 지역에서 이용하는 주요 철도역.'}
    ]
  }
};

const AREA_TYPES=[
  ['all','전체'],['거리','거리'],['시장','시장'],['공항','공항·택시·터미널'],['전철역','전철'],
  ['기차역','기차역'],['한인생활권','한인생활권'],['병원','병원'],['관광명소','관광명소'],['골프장','골프장']
];

const NAV_CATEGORIES=[
  {id:'stay',label:'숙소',kind:'business'},
  {id:'restaurant',label:'식당',kind:'business'},
  {id:'spa',label:'마사지',kind:'business'},
  {id:'karaoke',label:'가라오케',kind:'business'},
  {id:'cafe',label:'카페',kind:'business'},
  {id:'exchange',label:'환전소',kind:'business'},
  {id:'shopping',label:'쇼핑',kind:'shopping',type:'쇼핑'},
  {id:'bar',label:'클럽·바',kind:'business'},
  {id:'street',label:'거리',kind:'area',type:'거리'},
  {id:'market-nav',label:'시장',kind:'area',type:'시장'},
  {id:'airport',label:'공항',kind:'airport',type:'공항'},
  {id:'metro',label:'전철',kind:'point',type:'전철역'},
  {id:'train',label:'기차역',kind:'point',type:'기차역'},
  {id:'korean-zone',label:'한인생활권',kind:'area',type:'한인생활권'},
  {id:'hospital',label:'병원',kind:'point',type:'병원'},
  {id:'attraction-nav',label:'관광명소',kind:'area',type:'관광명소'},
  {id:'golf-nav',label:'골프장',kind:'golf',type:'골프장'}
];



const DBKEY='viettrip_google_db_v1';

const SUPABASE_URL='https://oopxtadfimshydsskcyq.supabase.co';
const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcHh0YWRmaW1zaHlkc3NrY3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjcyMDYsImV4cCI6MjEwNTE0MzIwNn0.iPS9NPtWvxV6NSe1uL4vTb-76EC-FGdS_jyUU4IRuzo';
const SUPABASE_HEADERS={
  'apikey':SUPABASE_ANON,
  'Authorization':`Bearer ${SUPABASE_ANON}`,
  'Content-Type':'application/json'
};

