# MSMG Scholarship Intelligence Dashboard

Pakistan-specific master's scholarship and admissions research for a fresh BS Management Science or closely related business graduate with zero full-time professional work experience.

Verified research date: **2026-09-25**.

## Research posture
- Primary-source first: university, government, ministry, scholarship-provider and official admissions sources.
- No claim of literal exhaustive internet coverage.
- No mock scholarship records are added to fill gaps.
- MOI is marked accepted only when an official source explicitly supports an English-medium route.
- Official facts and ESTIMATE planning figures are kept separate.
- PKR conversions are ESTIMATE planning conversions and should be refreshed before financial decisions.

## Run

    npm install
    npm run dev

Production:

    npm run build
    npm run preview

## Structure

    src/
      components/
      data/
      hooks/
      pages/
      App.jsx
      index.css
      main.jsx

## Updating data
Edit `src/data/opportunities.js`. Keep identity, programme, country, funding, academic fit, work-experience, language/MOI, status, dates, costs, proof-of-funds, sources and confidence fields. The UI reads this structured layer, so adding verified opportunities does not require rewriting the components.

## Important
Re-open the official programme and scholarship pages before submitting because deadlines, quotas, fees, language rules and immigration requirements can change between cycles.

## Research and financial model refresh — 25 Sep 2026

The research dataset has been expanded beyond the initial seven-record proof of concept. It now includes verified exact-programme routes and clearly labelled framework-only routes across Asia, Europe, North America and international mobility schemes. The app distinguishes student-paid costs, scholarship cash received, direct scholarship benefits, known values, estimates and unknown values.

The financial analysis is intentionally not described as “revenue”: scholarship cash is funding received by the student, not employment income. See `research-report.md` for the evidence register and `src/components/FinancialBreakdown.jsx` for the UI model.
