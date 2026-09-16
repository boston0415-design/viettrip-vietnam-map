# 일상탈출 베트남맵

베트남 로컬 업체·지역 정보를 Google Maps 위에서 보여주고, 회원이 업체 등록·평점·후기·사진을 함께 쌓는 지도 서비스입니다.

## 운영 구조

- **GitHub**: 소스 코드 및 변경 이력
- **Netlify**: `main` 브랜치 자동 배포
- **Supabase**: 업체·후기·사진 관련 공용 데이터
- **Google Maps / Places**: 지도, 검색, 업체 위치 정보

## 소스 구조

```text
index.html
assets/
  css/
    base.css
    responsive.css
  js/
    01-data-storage.js
    02-services-media.js
    03-business-ui.js
    04-rendering.js
    05-places-registration.js
    06-save-motion.js
    07-ranges-categories.js
    08-search-audit.js
    09-init-events.js
netlify.toml
```

`index.html` 한 파일에 CSS/JavaScript를 모두 넣던 구조를 분리해, 수정 범위를 좁히고 PC·모바일 문제를 독립적으로 관리하기 쉽게 정리했습니다.

## 배포

`main` 브랜치에 변경사항이 올라가면 Netlify가 자동으로 Production 배포합니다.

운영 주소: https://ornate-tarsier-b1a553.netlify.app
