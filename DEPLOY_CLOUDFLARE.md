# Cloudflare Pages 배포

기존 GitHub 저장소를 Pages 프로젝트에 연결합니다. Workers 유료 플랜은 필요하지 않습니다.

| 설정 | 값 |
| --- | --- |
| 저장소 | boston0415-design/viettrip-vietnam-map |
| 프로덕션 브랜치 | main |
| 프레임워크 | None |
| 빌드 명령 | node scripts/build-pages.mjs |
| 빌드 출력 디렉터리 | dist-pages |

빌드는 index.html, assets, _headers만 복사하며 외부 패키지를 설치하지 않습니다.
회원 자료는 기존 Supabase 프로젝트에 그대로 보관합니다.

## 공개 전 확인

1. Cloudflare가 실제 발급한 pages.dev 주소를 확인합니다.
2. Google Maps API 키의 HTTP referrer 허용 목록에 그 주소의 https://호스트/*를 추가합니다. 기존 제한을 해제하지 않습니다.
3. 새 주소에서 지도, 도시·업종 분류, 기존 업체 표시를 확인합니다.
4. 회원 업체 등록, 후기 작성, 사진 업로드를 확인합니다. 네이버 카페 회원 여부 검증은 별도 기능이므로 자동 연동된 것으로 간주하지 않습니다.
5. 기존 주소의 localStorage에만 남은 미동기화 자료가 있는지 확인합니다. 브라우저 저장 데이터는 새 도메인으로 자동 이전되지 않습니다.
6. 검증이 끝난 뒤 카페의 안내 링크를 변경합니다. 기존 Netlify 사이트는 검증 전 삭제하지 않습니다.

기본 pages.dev 주소와 Pages 무료 플랜을 사용합니다. Google Maps와 Supabase 사용량 한도는 별도입니다. 결제 또는 유료 전환은 이 설정에 포함되지 않습니다.
