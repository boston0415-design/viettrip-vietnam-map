# 주소 복사·카카오톡 공유

2026-10-29: 등록 업소 상세의 기능 버튼 바로 아래에 주소와 `주소 복사`를 함께 표시한다. 주소만 복사하며 업소명·소개·혜택·지도 링크를 섞지 않는다. 공유창에는 전체 공유 내용, 주소만, 링크만 복사를 구분한다. Clipboard API 실패 시 기존 모달 내부 선택 복사 및 수동 복사를 사용한다. 업체·회원·후기 데이터는 변경하지 않는다.

## 공유 가능 여부

- `navigator.share` 및 지원되는 경우 `navigator.canShare`로 공유 앱 선택 가능 여부를 판단한다. 모바일 사용자 에이전트만 확인하지 않아 지원되는 PC와 iPad의 데스크톱 모드도 제외하지 않는다.
- 공유 앱 선택은 기기의 기본 공유 메뉴이며 카카오톡 직접 공유와 다르다. 카카오톡이 설치되어 있어도 기기·브라우저에 따라 목록에 없을 수 있다. 사용자가 공유 대상을 선택하며 자동 전송하지 않는다.
- 카카오 JavaScript 키가 없거나 SDK가 로딩 중/실패한 경우 작동하지 않는 노란 버튼을 노출하지 않는다. 공유 앱 선택 또는 복사를 안내한다. 앱 전체 공유에도 같은 기준을 적용한다.

## 카카오톡 직접 공유 연결에 남은 운영자 설정

현재 `index.html`의 `kakao-javascript-key` 메타 값은 비어 있다. 본 변경은 카카오 앱을 만들거나 다른 앱의 키를 가져오지 않는다. 직접 공유를 연결하려면 운영자의 Kakao Developers 앱에서 다음이 필요하다.

1. `[앱] → [플랫폼 키] → [JavaScript 키]`의 **공개 JavaScript 키**를 메타 값에 적용한다. REST API 키·Admin 키·클라이언트 시크릿은 사용하지 않는다.
2. 해당 키의 JavaScript SDK 도메인에 `https://viettrip-vietnam-map.pages.dev`를 등록한다.
3. `[앱] → [제품 링크 관리]`의 웹 도메인에도 같은 운영 도메인을 등록한다.
4. 실제 카카오톡 연결 계정/기기에서 공유 대상 선택창과 메시지 링크를 확인한다. 코드 테스트의 SDK 모의 호출 통과를 실제 전송 성공으로 보지 않는다.

공식 근거(2026-10-29 확인):
- https://developers.kakao.com/docs/ko/tutorial/js-share
- https://developers.kakao.com/docs/ko/kakaotalk-share/js-link

## 검사

`tests/business-share.test.cjs`, `tests/app-share.test.cjs`, `tests/map-sharing.test.cjs`: PC·모바일 주소/공유 내용 분리, 현재 업체 재선택, Clipboard API 및 모달 내부 대체 복사, 빈 주소, HTML 이스케이프, 공유 취소/실패, SDK 미설정/성공/오류와 포커스 복귀를 검사한다. `tests/panel-history.test.cjs` 등으로 뒤로가기·닫기와 기존 기능을 회귀 검사한다. 실제 카카오톡 전송은 설정 전이므로 미검증이다.

이번 검사에서는 주소/공유 3개와 detail-panel, docked-detail, panel-interactions, interaction-regressions, destination-line, recommendations, review-vault, review-privacy, booking-links, booking-inquiries가 통과했다. 전체 회귀의 `detail-resize.test.cjs:62`(스크롤 끝 제스처)와 `panel-history.test.cjs:100`(상세 닫힌 뒤 guard 제거)은 기준 커밋 `e71b2c8`의 수정 없는 별도 작업 트리에서도 동일하게 실패했다. 기존 동작/테스트 불일치로 남기며 이 변경에서 창 조절·히스토리 로직이나 해당 테스트를 수정하지 않는다.
