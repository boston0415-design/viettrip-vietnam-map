# Administrative boundaries

The map draws a reference layer and does not certify legal, cadastral, or surveyed boundaries.
Travel destination filters remain separate from administrative boundaries.

## Current provincial level: July 2025 reform

- Dataset: Viet Nam – Subnational Administrative Boundaries, COD-AB v02, 34 provinces.
- Source: General Statistics Office of Vietnam (GSO); published and quality assured by OCHA ROAP/FIS and HDX.
- Source boundaries created: 1 July 2025. Reviewed/valid: 25 September 2025.
- Resource metadata last modified: 26 January 2026. Retrieved: 17 September 2026.
- https://data.humdata.org/dataset/cod-ab-vnm
- GeoJSON ZIP resource: `048a6012-a8c2-4fa9-be87-cb6c01e9afbf`; layer `vnm_admin1.geojson`.
- Selected codes: VN79 (Ho Chi Minh City), VN01 (Hanoi), VN48 (Da Nang), VN56 (Khanh Hoa), VN68 (Lam Dong), VN91 (An Giang).

## Historic districts: 2020

- Source: Government of Viet Nam / OCHA ROAP, distributed by geoBoundaries.
- https://www.geoboundaries.org/api/current/gbOpen/VNM/ADM2/
- Boundary ID: `VNM-ADM2-81297802`. Year represented: **2020**.
- Pinned input: https://github.com/wmgeolab/geoBoundaries/blob/9469f09/releaseData/gbOpen/VNM/ADM2/geoBoundaries-VNM-ADM2_simplified.geojson
- These are **not current wards**. In particular, the 2020 Thu Duc district is not the later Thu Duc city. Districts 2 and 9 are listed separately as historical districts.
- The older Phu Quoc geometry includes offshore islands belonging to that district in the source year. This must not be described as the current Phu Quoc special zone.
- Old Ho Chi Minh City outline is a union of the 24 listed source districts; old mainland Da Nang is a union of the seven mainland source districts. No circles or manually drawn replacement boundaries are used.

## Licence and transformations

Both source datasets are licensed under [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/).
Attribution does not imply endorsement by the original data providers.

Transformations by VietTrip: select relevant features; add Korean UI labels and stable IDs; repair invalid source polygon topology with Shapely `make_valid` (area change must be below 0.001%); simplify with topology preservation at 0.000075 degrees; round coordinates to six decimals only when the result remains valid. All island components are retained. Default camera bounds use the largest land polygon; the **전체 경계** button includes all components.

To rebuild with Python + shapely:

```sh
python scripts/build-admin-boundaries.py /path/to/vnm_admin1.geojson /path/to/geoBoundaries-VNM-ADM2_simplified.geojson
```

Files load only when a visitor opens the boundary control. They are served from the site's own static assets, with no external GIS subscription or runtime geocoding call.
