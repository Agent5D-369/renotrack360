# Gross-margin pricing scenarios

The Cost Intelligence page saves internal PriceSnapshot scenarios. It does not change legacy quotes, accepted estimates, contracts, invoices or payments. Templates, dated market indices and contractual estimate adoption are later integration work.

Direct cost includes crew labor, owner field labor at replacement cost, project-specific PM, materials/waste/freight, subcontractors, equipment/mobilization, protection/cleanup/disposal, permits/design and other project-caused costs. Corporate management remains overhead. Owner field and PM costs derive from explicitly entered hours times rates. Positive hours cannot have a zero rate.

Risk allowance applies to direct cost before margin. Selling price is risk-adjusted direct cost divided by (1 minus target margin). Decimal arithmetic rounds risk and labor cost to cents and selling price upward to cents. $60,000 risk-adjusted direct cost at 40% gives $100,000. Gross profit shown is after the risk allowance. Inputs reject negative/non-finite/exponent/fractional-cent amounts and margins at or above 100%.

The default target is 40%. Below 35% requires current OWNER membership, explicit approval and a specific recorded reason. ADMIN cannot approve that exception. This permission applies to internal scenarios and does not grant contractual approval.

Working Austin loaded replacement recommendations are $55/hour field and $95/hour project PM, effective September 21, 2026, reviewed by December 21 or when credible local bids/payroll evidence arrives. They are reasoned planning allowances, not measured contractor quotes. O*NET's BLS May 2025 Austin data reports carpenter 90th-percentile wage $33.75 and construction-manager 75th-percentile wage $64.61. BLS June 2026 construction employer compensation/wages ratio is about 1.438. The field recommendation adds an experienced multi-skill allowance; PM rounds the loaded benchmark to $95. Do not add employer burden again or double-count field/PM time. Source references are in lib/pricing-defaults.ts and the vault's Flipside-Austin-Rates-And-Pilot-2026-09-21 note.

Every snapshot retains input values, role hours/rates, recommendation version, policy version, creator, basis, results and any owner exception. Snapshot and audit creation are atomic. A per-request advisory lock and unique organization/request key make retries safe; a reused request with different inputs is refused. Update/delete/truncate triggers preserve recorded snapshots. No automatic repricing occurs when recommendations change.

Verify with `npm run test:pricing`, access tests, full migration replay against a retained backup, typecheck/build and `tsx scripts/pricing-http-smoke.ts` against a disposable local database/server. The HTTP test submits the rendered server-action form, confirms the saved result and retry behavior, then revokes access. Never create fake business pricing records in production to test the feature.
