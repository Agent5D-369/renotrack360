# QA And UX Audit

## UX Principles Applied

- Main operating path starts at `Today`.
- Guided workflows are available at `/guided`.
- Help center is available from every page header.
- Mobile bottom nav keeps the highest-frequency areas reachable.
- Field users get `/field` instead of the full office workflow.
- Selections, approvals, required proof, and checklists make hidden blockers visible.

## Workflow Order

1. Profile
2. Property
3. Lead
4. Quote
5. Estimate
6. Approval
7. Job kickoff
8. Selections and procurement
9. Field execution
10. Change orders
11. Reports and client portal
12. Invoice/payment
13. Closeout and feedback

## Remaining Manual QA

- Open `/guided` and each workflow guide.
- Check `/help` on mobile and desktop.
- Test all theme options in Settings for readable text.
- Verify long names/addresses wrap in cards and tables.
- Test login/logout.
- Test estimate PDF, invoice PDF, weekly report PDF, and change-order PDF.
- Test creating a tracked estimate from a quote.
- Test selection overage and approval records.

## Known MVP Gaps

- Most modules currently have create/list/detail surfaces, not full edit/delete flows.
- Wizard guides are workflow guidance, not enforced multi-step transactional forms yet.
- Upload storage is local-development oriented.
- AI tasks are structured placeholders until model integration is wired.
