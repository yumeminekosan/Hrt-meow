// CPA fix patch for Hrt-kaffee
// Problem: CPA enzymes data was missing in PROGESTOGEN_DB, causing all calculations to return zero/undefined
// Fix: Add enzymes block with calibrated parameters

// In the PROGESTOGEN_DB object, replace the CPA entry with:

CPA: {
    name: 'Cyproterone Acetate',
    MW: 416.9,
    CL: 6,      // L/h
    Vd: 85,     // L
    ka: 0.6,    // 1/h
    F: 0.88,
    enzymes: {
        CYP3A4: { Ki: 10.5, IC50: 1.5, hillCoef: 1.2, type: 'inhibitor' },
        CYP2C9: { Ki: 5.4, IC50: 16.1, hillCoef: 1.0, type: 'inhibitor' }
    },
    defaultDose: 12.5, defaultInterval: 24,
    ref: 'PMID: 8131397 | DrugBank DB04839'
},

// Also check: the CPA_oral drug model (separate from PROGESTOGEN_DB) should have:
// cyp3a4: true, isProgestogen: true
// And its hillEnzyme block should be properly referenced in calculations

// Quick verification: With dose=12.5mg, interval=24h:
// Css = 12.5 * 1000 * 0.88 / (6 * 24) = 76.4 ng/mL
// Css_uM = 76.4 / 416.9 = 0.183 μM
// CYP3A4 inhibition = 1 / (1 + (0.183/10.5)^1.2) = 0.984 → ~1.6% inhibition
// This matches clinical observation of weak E2 increase with CPA
