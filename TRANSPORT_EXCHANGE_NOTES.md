# Transport and exchange update — 2026-09-17

- Exchange category is a normal registered-business category, including member reviews, favorites and hiding.
- Two researched places are inserted once using unique client_id, no initial rating, no reviews and no claimed discount. Existing records are never overwritten.
- Ha Tam: address checked against Google Places UI (Ha Tam Jewelry, 2 Nguyễn An Ninh), with map center 10.7721811,106.6974148. Address also confirmed by Hà Tâm Jewelry business page / local travel listings.
- Mai Van: 1A Nguyễn An Ninh in business registry (0302716706); local listings also use 1 Nguyễn An Ninh. Google Places UI returns Money exchange at 1 Nguyễn An Ninh, 10.7720544,106.6974602, opposite Ha Tam. No hours or exchange-rate claims are stored.

## Transport sources
- Green SM official: https://www.greensm.com/vn-vi/news/huong-dan-su-dung-xanhnow-tai-san-bay (T1 C3–C6 / app D2 G6–B6; T2 A1–A4 / app parking; T3 GreenNow A12–15, app A11–12 or A34–35).
- 109 route change: https://en.sggp.org.vn/bus-no-109-changed-its-route-connecting-to-new-terminal-3-post117254.html
- 109 current cross-check: https://thaiest.com/vietnam/travel/saigon-bus-109-tan-son-nhat-airport-city-center
- 152 terminals and boarding: https://thaiest.com/vietnam/travel/ho-chi-minh-airport-bus-152

New airport pins are explicitly terminal-area guidance anchors, NOT surveyed curb positions. Exact lanes are provided in the text only where verified. Sources are accessible from tapped information and the transport guide. Current fares and departure times are deliberately left to the source/onsite information.

## Behavior
- Every filled range dismisses information on desktop and mobile. Desktop hover and deliberate marker clicks remain available.
- Hidden management shows all saved hidden places irrespective of city/category/rating/query, while normal/favorite views retain their usual filters. Nothing hidden is rendered as a member marker.
- Review counts use nonblank written reviews, independently of ratings.
