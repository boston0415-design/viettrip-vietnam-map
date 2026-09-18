// Branch addresses checked against the provider's official directory on 2026-09-18.
// Reuse the existing address resolver; no approximate coordinates or Google photos.
const PHARMACY_DIRECTORY=[
  ...[
    ['72 Tân Mỹ','72 Tân Mỹ, Phường Tân Mỹ, Ho Chi Minh City, Vietnam'],
    ['2 Đường C','2 Đường C, Phường Tân Mỹ, Ho Chi Minh City, Vietnam'],
    ['1008 Huỳnh Tấn Phát','1008 Huỳnh Tấn Phát, Phường Tân Mỹ, Ho Chi Minh City, Vietnam'],
    ['1330 Huỳnh Tấn Phát','1330 Huỳnh Tấn Phát, Phường Tân Mỹ, Ho Chi Minh City, Vietnam']
  ].map(([branch,address])=>({city:'hcmc',branch,address,sourceUrl:'https://nhathuoclongchau.com.vn/he-thong-cua-hang/72-tan-my-phuong-tan-phu-quan-7-tphcm'})),
  ...[
    ['미딩 · 1D ngõ 139','1D ngõ 139 đường Mỹ Đình, Phường Từ Liêm, Hanoi, Vietnam'],
    ['86 Trần Bình','86 Trần Bình, Phường Từ Liêm, Hanoi, Vietnam'],
    ['06 Đồng Me','06 Đồng Me, Phường Từ Liêm, Hanoi, Vietnam']
  ].map(([branch,address])=>({city:'hanoi',branch,address,sourceUrl:'https://nhathuoclongchau.com.vn/he-thong-cua-hang/1d-khu-tt-tong-cuc-2-p-my-dinh-1-q-nam-tu-liem-tp-ha-noi'}))
].map(r=>({...r,name:`롱쩌우 약국 · ${r.branch}`,type:'약국',icon:'✚',verifiedOn:'2026-09-18',sourceLabel:'약국 공식 지점 안내 · 2026-09-18 확인',
  desc:'FPT Long Châu 약국. 대표 문의 1800 6928. 영업시간·재고·외국어 응대는 지점에 확인하세요.'}));

for(const record of PHARMACY_DIRECTORY){
  const points=EXTRA_DATA[record.city]?.points;
  if(!points)continue;
  const existing=points.find(p=>p.type==='약국' && p.name===record.name);
  if(existing)Object.assign(existing,record);else points.push(record);
}
