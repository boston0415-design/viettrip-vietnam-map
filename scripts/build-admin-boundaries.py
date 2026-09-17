"""Build the small, self-hosted boundary files. Requires Python + shapely.

Usage: python scripts/build-admin-boundaries.py /path/vnm_admin1.geojson /path/geoBoundaries-VNM-ADM2_simplified.geojson
Sources and licence: assets/data/admin/SOURCES.md. No runtime external GIS API calls.
"""
import json, sys, math
from pathlib import Path
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from shapely import make_valid

OUT = Path(__file__).resolve().parents[1] / 'assets/data/admin'
CURRENT = json.loads(Path(sys.argv[1]).read_text())['features']
LEGACY = json.loads(Path(sys.argv[2]).read_text())['features']
CONFIG = {
 'hcmc': ('VN79', '호치민시 · Hồ Chí Minh', (106.70,10.78),
  ['Quan '+str(i) for i in range(1,13)]+['Thu Duc','Binh Thanh','Binh Tan','Phu Nhuan','Tan Binh','Tan Phu','Go Vap','Binh Chanh','Nha Be','Hoc Mon','Cu Chi','Can Gio']),
 'hanoi': ('VN01','하노이시 · Hà Nội',(105.85,21.03),
  ['Ba Dinh','Hoan Kiem','Tay Ho','Long Bien','Cau Giay','Dong Da','Hai Ba Trung','Hoang Mai','Thanh Xuan','Ha Dong','Bac Tu Liem','Nam Tu Liem','Son Tay','Ba Vi','Chuong My','Dan Phuong','Dong Anh','Gia Lam','Hoai Duc','Me Linh','My Duc','Phu Xuyen','Phuc Tho','Quoc Oai','Soc Son','Thach That','Thanh Oai','Thanh Tri','Thuong Tin','Ung Hoa']),
 'danang': ('VN48','다낭시 · Đà Nẵng',(108.20,16.05),['Hai Chau','Son Tra','Ngu Hanh Son','Thanh Khe','Lien Chieu','Cam Le','Hoa Vang']),
 'nhatrang': ('VN56','카인호아성 · Khánh Hòa',(109.19,12.24),['Nha Trang','Cam Ranh','Cam Lam','Dien Khanh','Ninh Hoa','Van Ninh','Khanh Vinh','Khanh Son']),
 'phuquoc': ('VN91','안장성 · An Giang',(103.99,10.22),['Phu Quoc']),
 'dalat': ('VN68','럼동성 · Lâm Đồng',(108.44,11.94),['Da Lat','Lac Duong','Don Duong','Duc Trong']),
 'hoian': ('VN48','다낭시 · Đà Nẵng',(108.33,15.88),['Hoi An','Dien Ban','Duy Xuyen']),
 'vungtau': ('VN79','호치민시 · Hồ Chí Minh',(107.08,10.41),['Vung Tau','Ba Ria','Long Dien','Dat Do','Xuyen Moc','Tan Thanh','Chau Duc']),
 'muine': ('VN68','럼동성 · Lâm Đồng',(108.29,10.94),['Phan Thiet','Ham Thuan Bac','Ham Thuan Nam','Bac Binh','Tuy Phong']),
}
KOREAN = {'Thu Duc':'투득 구','Binh Thanh':'빈타인','Binh Tan':'빈떤','Phu Nhuan':'푸뉴언','Tan Binh':'떤빈','Tan Phu':'떤푸','Go Vap':'고밥','Binh Chanh':'빈짜인','Nha Be':'냐베','Hoc Mon':'혹몬','Cu Chi':'꾸찌','Can Gio':'껀저','Ba Dinh':'바딘','Hoan Kiem':'호안끼엠','Tay Ho':'떠이호','Long Bien':'롱비엔','Cau Giay':'꺼우저이','Dong Da':'동다','Hai Ba Trung':'하이바쯩','Hoang Mai':'호앙마이','Thanh Xuan':'타인쑤언','Ha Dong':'하동','Bac Tu Liem':'박뜨리엠','Nam Tu Liem':'남뜨리엠','Hai Chau':'하이쩌우','Son Tra':'선짜','Ngu Hanh Son':'응우한선','Thanh Khe':'타인케','Lien Chieu':'리엔찌에우','Cam Le':'껌레','Hoa Vang':'호아방','Nha Trang':'나트랑','Cam Ranh':'깜라인','Cam Lam':'깜럼','Phu Quoc':'푸꾸옥','Da Lat':'달랏','Hoi An':'호이안','Dien Ban':'디엔반','Vung Tau':'붕따우','Ba Ria':'바리아','Xuyen Moc':'쑤옌목 · 호짬 일대','Phan Thiet':'판티엣 · 무이네 일대'}

def rounded(value):
 if isinstance(value,(float,int)): return round(value,6)
 return [rounded(x) for x in value]

def feature(geometry,properties):
 if not geometry.is_valid:
  original_area=geometry.area
  geometry=make_valid(geometry,method='structure',keep_collapsed=False)
  assert geometry.geom_type in ['Polygon','MultiPolygon']
  assert abs(geometry.area-original_area)/max(original_area,1e-12)<0.00001,properties
  properties['topologyRepaired']=True
 assert geometry.is_valid, properties
 # Roughly 8 metres in latitude. Preserve polygon topology and all island components.
 simple=geometry.simplify(0.000075,preserve_topology=True)
 encoded=mapping(simple); encoded['coordinates']=rounded(encoded['coordinates'])
 check=shape(encoded)
 if not check.is_valid:
  encoded=mapping(simple)  # Retain source precision if rounding would invalidate a tiny ring.
 assert shape(encoded).is_valid,properties
 components=list(geometry.geoms) if geometry.geom_type=='MultiPolygon' else [geometry]
 properties['viewBounds']=list(max(components,key=lambda p:p.area).bounds)
 return {'type':'Feature','properties':properties,'geometry':encoded}

OUT.mkdir(parents=True,exist_ok=True)
for city,(code,label,center,names) in CONFIG.items():
 matches=[f for f in CURRENT if f['properties']['adm1_pcode']==code]
 assert len(matches)==1,(city,code)
 current=matches[0]
 features=[feature(shape(current['geometry']),{'id':code,'label':label,'era':'2025','sourceCode':code,'validOn':current['properties']['valid_on']})]
 old=[]
 for name in names:
  candidates=[f for f in LEGACY if f['properties']['shapeName']==name]
  assert candidates,(city,name)
  candidates.sort(key=lambda f: math.hypot(shape(f['geometry']).centroid.x-center[0],shape(f['geometry']).centroid.y-center[1]))
  source=candidates[0];geo=shape(source['geometry']);old.append(geo)
  korean=(name.split(' ')[1]+'군') if name.startswith('Quan ') else KOREAN.get(name,'')
  label=(korean+' · ' if korean else '')+name
  features.append(feature(geo,{'id':source['properties']['shapeID'],'label':label+' (이전)','era':'2020','sourceName':name}))
 if city in ['hcmc','danang']:
  title='호치민시 · 개편 전' if city=='hcmc' else '다낭 본토 · 개편 전'
  features.insert(1,feature(unary_union(old),{'id':city+'-old-outline','label':title+' (2020)','era':'2020','derived':'Union of listed 2020 districts'}))
 dest=OUT/(city+'.geojson');dest.write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
 print(city,len(features),dest.stat().st_size)
