// Official provider directories checked on 2026-09-18. No Google content is stored.
const HOSPITAL_SPECIALTIES=CONFIG.categories.hospital.subs;
const HOSPITAL_DIRECTORY=[
  {city:'hcmc',name:'FV Hospital',address:'6 Nguyen Luong Bang St., Tan My Ward, Ho Chi Minh City',
    specialties:['종합병원·일반진료','피부과','내과','정형외과','치과','안과','이비인후과','산부인과','소아과','비뇨의학과','건강검진','응급실'],
    desc:'푸미흥 국제종합병원. 피부과·내과·정형외과 등 다수 진료과와 24시간 응급실 운영.',languageNote:'영문 진료과 안내·온라인 예약. 필요한 통역 언어는 예약 시 확인하세요.',phone:'+842835113333',emergencyPhone:'+842835113500',
    sourceUrl:'https://www.fvhospital.com/en/',bookingUrl:'https://www.fvhospital.com/en/make-an-appointment/'},
  {city:'hanoi',name:'Hanoi French Hospital',address:'1 Phuong Mai Street, Kim Lien Ward, Hanoi, Vietnam',
    specialties:['종합병원·일반진료','피부과','내과','정형외과','치과','안과','이비인후과','산부인과','소아과','비뇨의학과','건강검진','응급실'],
    desc:'하노이 프렌치 국제종합병원. 피부과·내과·정형외과 등 다수 진료과와 24시간 응급실 운영.',languageNote:'영어·프랑스어·일본어 공식 안내. 진료 시 통역은 예약 단계에서 확인하세요.',phone:'+842435771100',emergencyPhone:'+842435741111',
    sourceUrl:'https://www.hfh.com.vn/en/home/',bookingUrl:'https://www.hfh.com.vn/en/make-an-appointment/'},
  {city:'danang',name:'Family Hospital Da Nang',address:'73 Nguyen Huu Tho, Hoa Cuong Ward, Da Nang, Vietnam',
    specialties:['종합병원·일반진료','내과','정형외과','치과','안과','이비인후과','산부인과','소아과','비뇨의학과','건강검진','응급실'],
    desc:'국제진료 구역이 있는 종합병원. 내과·정형외과·소아과 등 진료. 응급실 24시간.',languageNote:'국제진료 구역 영어·한국어·중국어·일본어 지원 안내. 한국어 전화 0911 424 040.',phone:'+84911424040',emergencyPhone:'+842363632333',
    sourceUrl:'https://familyhospital.vn/en/medical-specialties/',supportUrl:'https://familyhospital.vn/dich-vu-cao-cap/',bookingUrl:'https://familyhospital.vn/en/contacts/'},
  ...[
    ['hcmc','Vinmec Central Park International Hospital','720A Dien Bien Phu Street, Thanh My Tay Ward, Ho Chi Minh City, Vietnam','+842836221166'],
    ['hanoi','Vinmec Times City International Hospital','458 Minh Khai Street, Vinh Tuy Ward, Hanoi, Vietnam','+842439743556'],
    ['danang','Vinmec Da Nang Hospital','30 Thang 4 Street, Residential Area No. 4, Hoa Cuong Ward, Da Nang, Vietnam','+842363711111'],
    ['nhatrang','Vinmec Nha Trang Hospital','Tran Phu Street, Neighborhood Group 1, Tay Son, Nha Trang Ward, Khanh Hoa, Vietnam','+842583900168'],
    ['phuquoc','Vinmec Phu Quoc Hospital','Bai Dai Area, Phu Quoc Special Zone, An Giang Province, Vietnam','+842973985588']
  ].map(([city,name,address,phone])=>({city,name,address,phone,specialties:['종합병원·일반진료'],
    desc:'Vinmec 국제병원. 공식 지점 안내와 예약 창구 확인. 진료과·담당의 일정은 해당 지점에 문의하세요.',languageNote:'국제환자 지원 창구 운영. 지점별 통역 언어는 예약 시 확인하세요.',
    sourceUrl:'https://www.vinmec.com/eng/hospital/',supportUrl:'https://www.vinmec.com/eng/medical-tourism/',bookingUrl:'https://www.vinmec.com/eng/booking/'})),
  ...[
    ['hcmc','Raffles Medical Ho Chi Minh City','285B Dien Bien Phu, Xuan Hoa Ward, Ho Chi Minh City, Vietnam','+842838240777','+84903133541'],
    ['hanoi','Raffles Medical Hanoi','51 Xuan Dieu, Tay Ho Ward, Hanoi, Vietnam','+842436762222','+84903469366'],
    ['vungtau','Raffles Medical Vung Tau','Room 116, Ground Floor, PetroVietnam Towers, 08 Hoang Dieu, Vung Tau, Vietnam','+842543858776','']
  ].map(([city,name,address,phone,zalo])=>({city,name,address,phone,zalo,specialties:['종합병원·일반진료','정형외과','치과','소아과','산부인과','건강검진'],
    desc:'Raffles 국제클리닉. 가정의학·정형외과·치과·소아과·산부인과·건강검진 안내. 전문의와 진료 가능일은 방문 전에 확인하세요.',languageNote:'영문 예약 창구 운영. 원하는 진료 언어를 예약 시 요청하세요.',
    sourceUrl:'https://rafflesmedical.vn/about-us-vietnam/',supportUrl:'https://rafflesmedical.vn/appointment/',bookingUrl:'https://rafflesmedical.vn/appointment/'})),
  ...[
    ['hcmc','Animal Doctors International – Thao Dien','224-226 Nguyen Van Huong, An Khanh Ward, Ho Chi Minh City, Vietnam',true],
    ['hcmc','Animal Doctors International – Phu My Hung','826 Nguyen Van Linh, Tan Hung Ward, Ho Chi Minh City, Vietnam',true],
    ['hcmc','Animal Doctors International – One Verandah','One Verandah Building, Bat Nan, Cat Lai Ward, Ho Chi Minh City, Vietnam',false],
    ['hanoi','Animal Doctors International – Tay Ho','78 To Ngoc Van, Tay Ho Ward, Hanoi, Vietnam',true]
  ].map(([city,name,address,emergency])=>({city,name,address,specialties:['동물병원'],phone:'+842873041144',
    desc:emergency?'국제 동물병원. 일반 진료 매일 09:00–19:00, 응급진료 24시간 안내. 방문 전 전화 확인.':'국제 동물클리닉. 일반 진료 매일 10:00–20:00, 공휴일 휴무. 24시간 응급 지점이 아닙니다.',
    languageNote:'영문 지점 안내·상담 창구. 대표번호 1900 633 093.',sourceUrl:'https://www.theanimaldoctors.org/location/',supportUrl:'https://www.theanimaldoctors.org/faq/'}))
];

for(const record of HOSPITAL_DIRECTORY){
  const points=EXTRA_DATA[record.city]?.points;
  if(!points)continue;
  const existing=points.find(p=>p.type==='병원' && p.name===record.name);
  const updated={...record,type:'병원',icon:record.specialties.includes('동물병원')?'🐾':'H',verifiedOn:'2026-09-18',sourceLabel:'병원 공식 안내'};
  if(existing)Object.assign(existing,updated);else points.push(updated);
}

function hospitalSpecialty(){
  return HOSPITAL_SPECIALTIES.includes(state.hospitalSpecialty)?state.hospitalSpecialty:'all';
}
function hospitalPoints(specialty=hospitalSpecialty()){
  return currentPoints().filter(p=>p.type==='병원' && (specialty==='all' || (p.specialties||[]).includes(specialty)));
}
function registeredHospitals(specialty=hospitalSpecialty()){
  return placesForCurrentCity().filter(p=>p.category==='hospital' && (specialty==='all'||p.subcategory===specialty));
}
function selectHospitalSpecialty(specialty){
  cancelPendingMapWork();
  resetIndependentBusinessFilters();
  state.hospitalSpecialty=HOSPITAL_SPECIALTIES.includes(specialty)?specialty:'all';
  state.selectedNavItem=null;
  state.navCategory='hospital';state.areaType='병원';state.cat='all';state.sub='all';
  renderAll();renderHierarchyNav();renderAreaList();
  showPointCategory('병원');
}
function hospitalInfoHtml(feature,{actions=false}={}){
  if(feature.type!=='병원')return '';
  // Contact routes only come from the checked directory, not arbitrary feature fields.
  const record=HOSPITAL_DIRECTORY.find(r=>r.name===feature.name && r.address===feature.address && r.sourceUrl===feature.sourceUrl);
  if(!record)return '<p class="mapInfoAddress">진료과·외국어 지원은 병원에 확인하세요.</p>';
  const specialties=`<p><b>진료 분류</b> · ${record.specialties.map(esc).join(' · ')}</p>`;
  const support=`<p>${esc(record.languageNote)}</p>`;
  if(!actions)return specialties+support;
  const link=(url,label)=>`<a class="mapDirectionsButton" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
  const phone=`<a class="mapDirectionsButton" href="tel:${esc(record.phone)}">전화 문의 · ${esc(record.phone)}</a>`;
  const emergency=record.emergencyPhone?`<a class="mapDirectionsButton" href="tel:${esc(record.emergencyPhone)}">응급실 전화 · ${esc(record.emergencyPhone)}</a>`:'';
  const zalo=record.zalo?link('https://zalo.me/'+record.zalo.replace('+',''),'잘로 문의'):'';
  const booking=record.bookingUrl?link(record.bookingUrl,'진료 예약·문의'):'';
  const source=record.supportUrl?link(record.supportUrl,'외국인 이용·연락처 안내'):'';
  return `${specialties}${support}<div class="mapDirectionsActions">${booking}${phone}${zalo}${emergency}${source}</div><p class="mapInfoAddress">2026-09-18 공식 안내 확인 · 진료일·통역·보험 적용은 예약 시 확인하세요.</p>`;
}
