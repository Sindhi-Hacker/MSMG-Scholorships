# Automated Scholarship Research

The application now treats `src/data/autoScholarships.json` as a generated, UI-compatible data layer.

## Research policy

1. **NSP Scholarships is discovery, not proof.** The 12-hour job crawls the latest, master's and fully-funded feeds from `nspscholarships.com` and its university-post mirror.
2. **Official verification is mandatory.** A candidate is published only when an official university, government or scholarship-provider source can be reached and parsed.
3. **BS Management Sciences profile is hard-coded.** The researcher looks for Master's-level routes, Management/Business/Economics/Finance/Marketing/Operations/Supply Chain/Analytics/etc. and penalises or excludes explicit work-experience gates.
4. **English is explicit.** IELTS, TOEFL, PTE, MOI and university waiver language are separated rather than collapsed into a generic "No IELTS" label.
5. **Financial proof is separate.** Bank balance / proof-of-funds is stored as its own requirement and is never confused with tuition or scholarship cash.
6. **Unknown is safer than guessed.** Unverified tuition, stipend, living cost or visa amounts remain unknown instead of being fabricated.
7. **Closed data is removed on the next run.** Any generated record whose relevant deadline has passed, or whose status is closed/not applicable, is omitted from the generated feed. The action runs twice daily.
8. **Failed discovery never wipes the dataset.** The script exits without overwriting when the discovery network fails or produces no usable live record.

## Schedule

The workflow runs at 00:17 and 12:17 UTC, which is 05:17 and 17:17 in Pakistan Standard Time (UTC+5). GitHub notes that scheduled workflows run from the default branch and may be delayed during high-load periods.

## Data contract

The generated file preserves the existing flat fields consumed by the React cards and details page, while also adding:

- `sources[]`: discovery and official evidence links
- `verification{...}`: official-source verification metadata
- `requirements{...}`: structured admissions requirements
- `financeById{...}`: structured financial model compatible with the existing finance UI

No app-side API call is required. A successful scheduled commit automatically triggers the normal Vercel deployment pipeline.
