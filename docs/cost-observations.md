# Dated cost observations

The additive source ledger retains market references and explicitly calibrated expected direct costs separately. It never reprices a saved scenario, quote or contract. Existing cost tables remain intact.

Each immutable record retains its component, trade/material class, geography, units, supported range (target optional), effective/review dates, source URL/version, import date, Flipside modifications and calibration evidence. Homewyse URLs require the Homewyse category and automatically retain the authorization reference already approved by Rick. Source URLs must be HTTPS without embedded credentials. New records and audit events commit together; same-request retries cannot silently change inputs.

Component indices require a positive range and base date, and cannot be labeled as direct cost or whole-assembly indices. No global Austin multiplier is introduced. Future-dated and overdue records are visibly identified; nothing applies automatically. Expected direct cost requires a calibration date and explanation. This records the user's evidence; it does not independently certify a vendor quote.

Two source-linked May 2026 national Homewyse assembly examples are displayed as reference data checked September 21. They are not imported as Austin prices or matched KERDI costs. The dynamically extracted source tables repeated inconsistent component values, so only the clearly stated national overall ranges were retained. No invented midpoint, component split or quote is supplied.

Test with `npm run test:cost-sources`, staff coverage, migration preservation and the actual local form smoke.
