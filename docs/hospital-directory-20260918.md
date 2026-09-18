# Medical directory — checked 2026-09-18

Seven new locations: Raffles Medical HCMC, Hanoi and Vung Tau; Animal Doctors International Thao Dien, Phu My Hung, One Verandah and Tay Ho. Eight existing locations enriched: FV, Hanoi French, Family Da Nang and five Vinmec hospitals. Existing unverified locations are preserved under All; they are not automatically assigned specialties or foreign-language support.

The Hospital navigation now offers 13 specialty groups. A multi-specialty hospital is one record and appears in each confirmed group. Veterinary clinics do not enter human specialty or emergency results. The city, specialty, list and map share the same selection. Empty specialty results are explicit. The directory remains part of the existing system POIs; it does not create member reviews or duplicate Supabase registrations.

Each verified location includes its official source, 2026-09-18 check date, contact telephone, language/support notes and an appointment or inquiry link where verified. Provider confirmations are necessary for actual doctor availability, interpretation and insurance acceptance. An English-language website is described as English guidance/booking, not proof that every member of staff speaks English.

## Sources and limits

- FV address, contact numbers and specialties: https://www.fvhospital.com/en/ ; appointments: https://www.fvhospital.com/en/make-an-appointment/
- Hanoi French specialties, address and numbers: https://www.hfh.com.vn/en/home/ ; appointments: https://www.hfh.com.vn/en/make-an-appointment/
- Family Da Nang specialties: https://familyhospital.vn/en/medical-specialties/ ; dental clinic and numbers: https://familyhospital.vn/en/home/ ; English/Korean/Chinese/Japanese assistance: https://familyhospital.vn/dich-vu-cao-cap/ ; inquiries: https://familyhospital.vn/en/contacts/
- Vinmec branch addresses and numbers: https://www.vinmec.com/eng/hospital/ ; international-patient support: https://www.vinmec.com/eng/medical-tourism/ ; appointments: https://www.vinmec.com/eng/booking/ . These branches receive only the general hospital group; network-wide specialist claims are not inferred for each branch.
- Raffles branch service coverage: https://rafflesmedical.vn/about-us-vietnam/ ; branch addresses, contact numbers, Zalo numbers and appointment form: https://rafflesmedical.vn/appointment/ . Doctors and schedules require confirmation. The Vung Tau branch stays in the Vung Tau travel region despite its current administrative HCMC address.
- ADI individual branches, hours and emergency status: https://www.theanimaldoctors.org/location/ ; international telephone: https://www.theanimaldoctors.org/faq/ . One Verandah is not marked 24/7. The shared international telephone is explicitly a central inquiry route, not a branch-specific line.

No photographs were copied or uploaded in this change. Existing member uploads and live attributed Google galleries are preserved. `tests/hospital-directory.test.cjs` checks specialty overlap, empty results, city isolation, synchronized filters and contact identity.

## Registration correction

The original directory update did not add hospitals to the separate registration category configuration. Hospital is now available in the registration/edit dropdown, with the same 13 specialties as the directory and a “진료과” label. Restaurant-only controls are hidden for hospitals. Google hospital/doctor, dentist, and veterinary place types preselect the appropriate registration group.

Member-registered hospitals keep the existing place/review/edit model. They appear in hospital specialty counts, the member list, navigation shortcuts, and map markers/coverage, including cities or specialties without a built-in hospital. Member shortcuts are explicitly labeled; they are not assigned official provider verification or language support. Tests cover the rendered selects, all specialty save/reload paths, edit prefill, city isolation and registered-only map bounds. The SQL validation uses the anonymous registration and owner-edit paths and rolls back all fixtures; no schema change is needed.
