/* Curated guidance, not live fares or guaranteed offers. Sources are reviewed individually. */
window.VietGuideData={
  updated:'2026-09-18',
  cafe:'https://cafe.naver.com/talkvietnam',
  cities:{hcmc:'호치민',hanoi:'하노이',danang:'다낭',nhatrang:'나트랑',phuquoc:'푸꾸옥',dalat:'달랏',hoian:'호이안',vungtau:'붕따우·호짬',muine:'무이네'},
  topics:[
    {id:'prepare',name:'여행 준비',icon:'plane',note:'입국 · 유심 · 준비물'},
    {id:'transport',name:'공항·교통',icon:'bus',note:'승차장 · 이동 방법'},
    {id:'stay',name:'숙소·예약',icon:'bed',note:'숙소 선택 · 문의'},
    {id:'explore',name:'먹고 즐기기',icon:'compass',note:'식당 · 유람선 · 투어'},
    {id:'benefit',name:'회원 혜택',icon:'percent',note:'제휴 업소 · 이용 조건'},
    {id:'daily',name:'생활·도움',icon:'chat',note:'환전 · 베트남어 · 도움'}
  ],
  sources:{
    tourism:{label:'베트남 관광청 · 여행 준비',url:'https://vietnam.travel/plan-your-trip',checked:'2026-09-18'},
    visa:{label:'베트남 출입국국 · 공식 전자비자 주소 안내',url:'https://evisa.xuatnhapcanh.gov.vn/',checked:'2026-09-18'},
    grab:{label:'Grab · 떤선녓공항 공식 승차 안내',url:'https://www.grab.com/vn/blog/driver/car/sanbaytansonnhat/',checked:'2026-09-18'},
    t3:{label:'Grab · T3 승차장 사진 안내',url:'https://www.grab.com/vn/en/blog/huong-dan-don-tra-grabcar-tai-ga-quoc-noi-nha-ga-t3-san-bay-tan-son-nhat/',checked:'2026-09-18'},
    green:{label:'Green SM · 공항 승차·GreenNow 안내',url:'https://www.greensm.com/vn-vi/news/huong-dan-su-dung-xanhnow-tai-san-bay',checked:'2026-09-18'},
    waterbus:{label:'Saigon Waterbus · 운항·예매 안내',url:'https://saigonwaterbus.com/',checked:'2026-09-18'},
    citybus:{label:'Ảnh Việt · 시티투어 공식 안내',url:'https://www.hopon-hopoff.vn/',checked:'2026-09-18'}
  },
  articles:[
    {id:'airport-arrival',topic:'transport',icon:'plane',cities:['hcmc'],title:'공항에서 숙소까지, 첫 이동',summary:'떤선녓공항 도착 후 터미널 확인부터 승차장 찾기까지.',tags:['공항','떤선녓','SGN','택시','Grab','버스','픽업'],sources:['grab','t3','green'],sections:[
      {title:'먼저 도착 터미널을 확인하세요',body:'항공권과 도착장 안내판에서 T1·T2·T3 중 어디에 도착했는지 확인하세요. 앱에도 같은 터미널을 입력하고, 숙소의 이름과 전체 주소를 준비합니다.'},
      {title:'Grab 승차장으로 이동하기',body:'T1은 공식 D1 승차 안내를, T2는 앱의 국제선 지정 승차장 안내를 확인하세요. T3는 PNA 주차장 지상층의 Grab 지정 구역으로 이동합니다. 출구에서 바로 호출하기 전에 앱의 사진과 현장 표지를 대조하세요.'},
      {title:'택시·Green SM·버스도 비교하세요',body:'택시는 공식 승차 대기열에서 차량을 확인하세요. Green SM은 현장 대기 차량과 앱 호출 차량의 승차 지점이 다를 수 있습니다. 버스는 도착 터미널·진행 방향·숙소까지의 하차 후 이동을 확인한 뒤 선택하세요.'},
      {title:'차량에 타기 전',body:'앱에 표시된 차량 번호와 기사를 확인하고, 목적지·결제 방법·공항 추가 요금을 확인하세요. 픽업 예약을 했다면 예약 확인서에 있는 만나는 장소를 우선 확인합니다.'}
    ],notice:'지도는 승차구역을 찾는 보조 안내입니다. 마지막 이동은 앱의 지정 지점과 공항 현장 표지를 따르세요.',actions:[{label:'공항 승차장 지도',category:'airport'},{label:'Grab 승차장',category:'airport',group:'grab'},{label:'버스 승차장',category:'airport',group:'bus'},{label:'Green SM 승차장',category:'airport',group:'green'}]},
    {id:'airport-options',topic:'transport',icon:'bus',title:'내 공항의 이동 방법 확인하기',summary:'택시·앱 호출·버스·예약 픽업을 내 여행에 맞게 고르세요.',tags:['공항','교통','하노이','다낭','픽업'],sections:[
      {title:'출발 전에 준비할 것',body:'숙소 전체 주소, 항공편명, 도착 터미널, 인원과 큰 짐 개수를 메모하세요. 야간 도착이면 숙소 체크인 가능 시간과 차량 대기 조건도 확인합니다.'},
      {title:'지도의 공항·교통 안내 활용하기',body:'아래 안내 버튼을 누르면 선택한 도시의 공항 안내가 열립니다. 터미널별 안내를 읽고 승차 지점을 지도에서 확인할 수 있습니다.'},
      {title:'예약 픽업을 선택했다면',body:'항공편 지연 시 대기 시간, 기사 연락 방법, 추가 요금 조건을 미리 확인하세요. 차량을 찾지 못하면 예약 확인서의 연락처로 문의합니다.'}
    ],actions:[{label:'도시별 공항 안내 열기',category:'airport',panel:'transport'},{label:'공항 지도 보기',category:'airport'}],template:'pickup'},
    {id:'grab-green',topic:'transport',icon:'car',title:'Grab·Green SM, 처음 이용한다면',summary:'출발지와 목적지 확인, 차량 선택, 결제까지 한 번에.',tags:['그랩','Grab','Green SM','그린','택시','앱'],sources:['grab','green'],sections:[
      {title:'이름과 주소를 함께 확인하세요',body:'같은 이름의 지점이 있을 수 있습니다. 지도에서 목적지의 이름·주소를 복사한 뒤 호출 앱의 도착 지점과 대조하세요.'},
      {title:'출발지 핀을 직접 확인하세요',body:'GPS가 건물 반대편이나 다른 터미널을 가리킬 수 있습니다. 실제 기다리는 위치와 앱의 승차 지점이 같은지 확인한 뒤 차량을 부르세요.'},
      {title:'차량·결제 조건 확인',body:'인원과 짐에 맞는 차량을 선택하고 앱에 표시되는 요금, 결제 방법, 추가 요금 조건을 확인하세요. Green SM의 GreenNow는 대기 차량과 앱의 확인 절차를 연결하는 방식으로, 이용 가능 여부는 앱과 현장에서 확인할 수 있습니다.'}
    ],actions:[{label:'공항 승차장 확인',category:'airport'},{label:'숙소 위치 찾기',category:'stay'}]},
    {id:'exchange',topic:'daily',icon:'money',title:'환전할 때 꼭 확인할 것',summary:'받을 금액을 먼저 확인하고, 가까운 환전소를 지도에서 찾으세요.',tags:['환전','하탐','Hà Tâm','달러','ATM','돈','현금'],sources:['tourism'],sections:[
      {title:'실제로 받을 금액을 물어보세요',body:'바꾸려는 통화·금액을 보여주고 최종으로 받을 베트남동과 수수료 유무를 확인하세요. 계산기 화면이나 메모로 금액을 서로 확인하면 편합니다.'},
      {title:'창구를 떠나기 전에 확인하세요',body:'지폐 수량과 액면을 확인하고 필요한 영수증을 요청하세요. 금액이 다르면 현장에서 바로 확인합니다.'},
      {title:'환전소 위치는 지도에서',body:'호치민 지도에는 벤탄시장 인근 하탐·마이반 환전소가 등록되어 있습니다. 회원이 남긴 후기와 주소를 함께 보고, 방문 당일 영업 여부와 취급 통화를 확인하세요.'},
      {title:'ATM을 이용한다면',body:'기기 화면의 수수료와 적용 환율 안내를 읽고 진행하세요. 이 페이지는 실시간 환율이나 특정 환전소의 최저가를 제공하지 않습니다.'}
    ],actions:[{label:'환전소 지도 보기',category:'exchange'}]},
    {id:'stay-choice',topic:'stay',icon:'bed',title:'숙소는 위치부터 골라보세요',summary:'가고 싶은 곳과 숙소를 같은 지도에서 비교해보세요.',tags:['숙소','호텔','아파트','레지던스','예약','선라이즈'],sections:[
      {title:'자주 방문할 장소부터 저장하세요',body:'식당·약속 장소·관광지를 먼저 확인하고 숙소와의 이동 동선을 비교하세요. 지도상 거리 외에도 실제 이동 방법과 시간을 확인하는 것이 좋습니다.'},
      {title:'예약 전에 물어볼 내용',body:'숙박 날짜, 인원, 침실 수, 체크인 시간, 총 결제금액, 보증금, 취소 조건을 확인하세요. 사진의 객실과 실제 배정 객실이 같은지, 아파트라면 해당 숙박의 체크인·출입 가능 여부도 확인합니다.'},
      {title:'카페 숙소 문의하기',body:'아래 문의 양식을 복사해 날짜와 인원을 채운 뒤 일상탈출 카페의 숙소 안내·예약 게시판에서 문의하세요. 이 페이지에서 예약이 확정되거나 결제가 진행되지는 않습니다.'}
    ],notice:'숙소 가격과 회원 혜택은 예약 날짜·객실·이용 조건에 따라 달라집니다. 확정 답변을 받은 후 예약하세요.',actions:[{label:'회원 등록 숙소 보기',category:'stay'},{label:'혜택 있는 숙소',category:'stay',benefit:true}],template:'stay',cafe:true},
    {id:'member-benefits',topic:'benefit',icon:'percent',title:'회원 혜택, 이용 전에 확인하세요',summary:'% 표시가 있는 업소를 모아 보고 혜택 조건을 확인하세요.',tags:['할인','혜택','제휴','페이백','쿠폰','회원'],sections:[
      {title:'% 혜택업소를 확인하세요',body:'아래 지도 버튼은 회원 혜택이 등록된 업소만 보여줍니다. 업소 상세에서 혜택 설명과 주소·후기를 함께 확인하세요.'},
      {title:'미리 확인할 이용 조건',body:'카페 닉네임이나 회원 등급 확인이 필요한지, 사전 예약이 필요한지, 적용 날짜·인원·중복 할인 조건이 있는지 물어보세요.'},
      {title:'예약 시 적용 여부를 확인하세요',body:'혜택 표시만으로 할인이 확정되지는 않습니다. 방문 전에 적용 조건을 확인하고, 예약 담당자의 답변을 보관하면 이용할 때 확인하기 편합니다.'}
    ],actions:[{label:'할인·혜택업소 지도',benefit:true},{label:'혜택 있는 숙소',category:'stay',benefit:true}],cafe:true},
    {id:'before-flight',topic:'prepare',icon:'passport',title:'출발 전, 이것부터 준비하세요',summary:'여권·입국 조건·항공편·숙소 확인서를 한 번에 점검하세요.',tags:['입국','비자','여권','항공권','준비물','출국'],sources:['visa','tourism'],sections:[
      {title:'본인에게 적용되는 입국 조건',body:'국적·여권 종류·체류 목적과 기간에 따라 필요한 서류가 달라집니다. 항공권 결제 전과 출발 전에 베트남 출입국 당국 및 이용 항공사의 안내를 확인하세요.'},
      {title:'전자비자가 필요하다면',body:'베트남 출입국국이 공지한 공식 신청 주소는 evisa.gov.vn과 thithucdientu.gov.vn입니다. 신청 전 주소를 확인하고 여권 정보·입출국 정보를 꼼꼼히 대조하세요. 심사 결과는 공식 사이트에서 확인합니다.'},
      {title:'휴대폰에 모아두세요',body:'항공편과 터미널, 숙소 전체 주소, 예약 확인서, 보험 연락처를 저장하세요. 배터리 충전과 데이터 연결 방법도 준비하고, 필요한 서류는 연결이 없어도 볼 수 있도록 별도로 보관하세요.'}
    ],links:[{label:'공식 전자비자 신청',url:'https://evisa.gov.vn/'}],actions:[{label:'도착 공항 지도',category:'airport'}]},
    {id:'sim-data',topic:'prepare',icon:'phone',title:'유심·eSIM과 데이터 준비',summary:'도착 후 지도와 호출 앱을 바로 쓸 수 있도록 준비하세요.',tags:['유심','eSIM','인터넷','로밍','데이터','와이파이'],sources:['tourism'],sections:[
      {title:'내 휴대폰과 맞는 상품인지 확인',body:'eSIM 지원 여부와 통신사 잠금 여부를 먼저 확인하세요. 데이터 전용인지 현지 전화번호도 제공되는지, 이용 기간과 데이터 한도·소진 후 조건을 비교합니다.'},
      {title:'설치와 개통 시점을 구분하세요',body:'상품에 따라 설치 시점 또는 현지 통신망 연결 시점부터 이용 기간이 시작될 수 있습니다. 판매처의 개통 안내를 먼저 읽고 안정적인 연결 환경에서 설치하세요.'},
      {title:'도착하면 연결을 확인하세요',body:'데이터에 사용할 회선을 선택하고 지도 검색과 메시지 수신이 되는지 확인하세요. 로밍 설정은 구매한 상품 안내를 따르고, 기존 회선의 원치 않는 데이터 사용 여부도 확인합니다.'}
    ],actions:[{label:'공항 지도 열기',category:'airport'}]},
    {id:'river-trip',topic:'explore',icon:'boat',cities:['hcmc'],title:'사이공강에서 보내는 한때',summary:'수상버스와 디너 유람선, 내가 예약한 상품부터 확인하세요.',tags:['유람선','수상버스','워터버스','선착장','사이공강','크루즈'],sources:['waterbus'],sections:[
      {title:'어떤 배를 타는지 확인하세요',body:'수상버스와 식사 포함 유람선은 이용 방식이 다릅니다. 출발·도착 선착장, 편도·왕복 여부, 식사 포함 여부를 예약 화면에서 확인하세요.'},
      {title:'승선 장소로 찾아가세요',body:'매표 사무실과 실제 승선 장소가 다를 수 있습니다. 예약 확인서의 집결 장소와 출발 시간을 확인하고 지도에서 같은 주소를 찾아 이동하세요.'},
      {title:'돌아오는 이동까지 준비하세요',body:'최종 하차 선착장과 귀가 방법을 확인하세요. 운항 시간과 취소·기상 관련 안내는 이용 당일 운영사에서 확인합니다.'}
    ],actions:[{label:'유람선·수상버스 선착장',category:'cruise'}]},
    {id:'city-bus',topic:'explore',icon:'bus',cities:['hcmc','hanoi'],title:'시티투어 버스, 탑승 전 확인',summary:'낮·밤 코스와 출발 정류장을 확인하고 편하게 둘러보세요.',tags:['시티투어','버스','2층','관광','투어'],sources:['citybus'],sections:[
      {title:'표의 이용 방식을 확인하세요',body:'한 번 순환하는 상품과 자유롭게 승하차하는 상품의 조건을 구분하세요. 노선·이용 가능 시간·재탑승 조건은 구입한 표를 기준으로 확인합니다.'},
      {title:'출발 정류장과 시간을 확인하세요',body:'도시·주야간 코스·운영일에 따라 집결지가 달라질 수 있습니다. 예약 확인서의 정류장과 지도 속 장소를 대조하고 여유 있게 도착하세요.'},
      {title:'야외 좌석을 이용한다면',body:'햇빛과 비에 대비하고 안전 안내를 따르세요. 행사·도로 통제 등으로 동선이 바뀔 수 있으니 출발 전 운영사 안내를 확인합니다.'}
    ],actions:[{label:'시티투어 탑승장 지도',category:'citytour'}]},
    {id:'food-reviews',topic:'explore',icon:'food',title:'회원 후기로 고르는 식당',summary:'음식 종류와 별점을 함께 고르고, 실제 방문 후기를 읽어보세요.',tags:['맛집','식당','후기','한식','베트남음식','쌀국수','카페'],sections:[
      {title:'지역과 음식 종류를 먼저 선택',body:'지도에서 도시 → 식당 → 음식 종류 순서로 고르세요. 그 상태에서 평점 조건을 더하면 선택한 종류 안에서 업체를 볼 수 있습니다.'},
      {title:'평점과 평가 수를 함께 보세요',body:'평가 수가 적은 업체의 별점은 한 사람의 평가에도 달라질 수 있습니다. 작성 날짜와 후기 내용을 함께 읽고 내 취향과 맞는지 판단하세요.'},
      {title:'방문 후 경험도 남겨주세요',body:'업소 상세에서 별점 또는 후기를 남길 수 있습니다. 글 후기는 닉네임을 입력하고, 직접 경험한 메뉴·서비스·이용 상황을 적어주세요. 카페 후기가 있다면 원문 링크도 첨부할 수 있습니다.'}
    ],actions:[{label:'식당 지도 보기',category:'restaurant'},{label:'카페·디저트 찾기',category:'cafe'},{label:'전체 회원 후기',panel:'reviews'}]},
    {id:'useful-phrases',topic:'daily',icon:'chat',title:'필요할 때 보여주는 베트남어',summary:'주소 안내·금액 확인·포장 요청 문장을 복사해 사용하세요.',tags:['베트남어','번역','기사','말','언어','포장'],sections:[
      {title:'짧게 보여주면 더 편해요',body:'문장과 함께 목적지 주소나 필요한 수량을 보여주세요. 아래 문장은 필요한 부분을 복사해 메시지로 보내거나 휴대폰 화면을 보여줄 수 있습니다.'}
    ],phrases:[{ko:'이 주소로 가 주세요.',vi:'Làm ơn đưa tôi đến địa chỉ này.'},{ko:'총 얼마인가요?',vi:'Tổng cộng bao nhiêu tiền?'},{ko:'포장해 주세요.',vi:'Cho tôi mang về.'},{ko:'저는 베트남어를 잘 못해요. 문자로 보내주세요.',vi:'Tôi không nói tiếng Việt giỏi. Vui lòng nhắn tin cho tôi.'}],actions:[{label:'목적지 주소 찾기'}]},
    {id:'help',topic:'daily',icon:'help',title:'도움이 필요할 때 준비할 것',summary:'현재 위치와 연락할 곳을 정리해두면 설명하기 편합니다.',tags:['병원','도움','분실','안전','긴급','보험'],sections:[
      {title:'현재 위치를 알려주세요',body:'가까운 건물 이름과 전체 주소를 확인하고 동행자·숙소 직원 등에게 위치를 전달하세요. 긴급한 상황이면 가이드 검색보다 현장 도움 요청과 긴급 신고를 우선하세요.'},
      {title:'병원을 방문해야 한다면',body:'지도에서 위치를 확인한 뒤 해당 병원에 진료 가능 여부와 의사소통 방법을 확인하세요. 여권과 여행자보험 연락처를 준비하고 보험사에도 필요한 절차를 문의합니다.'},
      {title:'물건을 잃어버렸다면',body:'방문 업소나 이용한 교통 앱의 분실물 문의 기능을 확인하세요. 결제 카드 분실 시 카드사에 연락하고, 여권 분실은 대한민국 공관의 공식 안내를 확인합니다.'}
    ],actions:[{label:'병원 위치 확인',category:'hospital'}]}
  ]
};
