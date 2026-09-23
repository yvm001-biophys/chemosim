# ChemoSim 0.5 upstream model audit

Implemented: explicitly conserved CheA-long, CheY and CheB pools; background steady-state root initialization; condition-specific normalized receptor reference curves; distinct response metrics. ATP is an external reservoir. CheA-short is counted separately, not phosphorylated. CheZ complexes and motor sequestration are not explicit species, so pathway CheY-P approximates free motor input. A motor clamp is external and does not change the physical pool.

Units: µM, seconds, fL. Concentration = monomer count / (602.214076 × volume_fL). Default volume 1 fL is an assumption, not a measured volume from the protein-count study. RP437/TB/35°C reference counts: CheA-long 4500; short 2200; Y 8200; Z 3200; R 140; B 240. Source: Li & Hazelbauer 2004, DOI 10.1128/JB.186.12.3687-3694.2004. Ratios multiply these counts; CheA slider scales both isoforms. CheZ is a monomer/site concentration, twice the dimer concentration.

The equations and rate assumptions are displayed in the tool. In particular, kAY=100 µM^-1 s^-1 approximates the low-substrate slope 650/6.5 from Stewart 1997 (10.1021/bi962261k); this approximation is not reliable across all total-Y settings. The phenomenological CheZ Hill law is not a mechanistic fit. Rate constants combined from different assays do not constitute an in-vivo calibration. CheR/B feedback and its effective bounded modification coordinate are exploratory; adaptation times are predictions, not fitted experimental times.

## Receptor references

Tar: MeAsp, background zero, fixed EEEE or QEQE in ΔcheRcheB cells. Sourjik & Berg 2002 Fig. 2, DOI 10.1073/pnas.011589998. The mixed-cell response has two phases, not a pure Tar binding curve. EEEE β=.65, K1=38 µM, K2=83000 µM; QEQE β=.36, K1=150 µM, K2=105000 µM. Hill coefficient 1.2. R(L)=β/(1+(L/K1)^h)+(1−β)/(1+(L/K2)^h). This reproduces published fit coefficients, not independently digitized raw measurements.

Tsr: serine, WM4196 minicells, initial response at zero background, endogenous adapted modification (no defined E/Q sequence). Burt et al. 2020 Fig. 3, DOI 10.1038/s41467-020-14350-9: Khalf=.4 µM, Hill=2.7. This is not a pure Tsr-only strain and not a general wild-type E. coli calibration.

The reference maps normalized response to kinase activity a=.3R at fixed modification. Absolute .3 and coupling to downstream pools remain assumptions. Reference selection freezes modification to isolate initial response; this artificial long-time hold must not be interpreted as physiological adaptation for WM4196. Unfreezing permits exploratory adaptation. Nonzero background or ligand mismatch is explicitly uncalibrated extrapolation. EEEE/QEQE label the reference curve; the numeric modification coordinate is not a literal E/Q or methyl-group count.

## Metrics

Computed on pathway YP sampled every .01 s; output and motor bins remain .2 s. Baseline is the pre-stimulus equilibrium, including when the step occurs at t=0. Peak is the largest absolute deviation after the stimulus. Excitation t90 is the interpolated first crossing of 90% of peak change. Adaptation t50 is the interpolated post-peak half-recovery time measured from stimulus onset. Precision is 100(1−|Y_end−Y_base|/|Y_peak−Y_base|), at 60 s; it can be negative. Separately report the final residual relative to baseline. No response gives undefined metrics; no half recovery gives beyond observation window, not zero. Finite-window precision is not asymptotic adaptation accuracy.

## Validation

`node test-upstream.cjs`: conservation, positivity, fixed-point residual and no-stimulus drift below 1e-8, protein deletions, repellent and reference modes, smaller volume/high CheY, half-step convergence (<1e-4 µM), analytical reference-response agreement, synthetic known metric crossings.

`node test-research.cjs`: DOM initialization, seeded traces, export/figure, language, batches/sweeps and invalidation. `node test-motor-model.cjs`: stationary and transient mean/stochastic agreement, dwell means and reference motor fit. Browser visual preview is unavailable for this static execution profile; no browser screenshot validation was performed.
