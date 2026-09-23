# ChemoSim motor model 0.6

Calibration is opt-in, source-independent and condition-specific. Initial threshold=.5 and switching scale=2 s^-1 are exploratory defaults, not fitted wild-type values. Fit one experimental condition at a time; keep temperature, load, strain, adaptation state, assay, CheY-P provenance and source explicit. Unknown metadata remain unknown and are not used as if measured.

The model does not identify binding kinetics or validate the upstream pathway, raw dwell distributions, FliM remodeling, motor correlations or tumbling.

## General calibration

Enter up to 50 concentration rows with `Y_uM,CW_bias,CW_dwell_s,CCW_dwell_s,role`. Role is `fit` or `validate`. Bias can be supplied alone; dwell data require both mean durations. Median durations and censoring-biased complete-dwell means are unsuitable targets. Validate rows are excluded from optimization, but their independence is the user's experimental responsibility.

Fixed parameters: KD, exchange, site count, steepness. Fit threshold and (only when at least one fit row has dwells) switching scale. Bias-only fitting cannot identify a timescale, so it leaves switching scale unchanged. Paired dwell rows contribute two squared logarithmic duration residuals; their reported bias is only a consistency check against CW_dwell/(CW_dwell+CCW_dwell), using a user-visible absolute tolerance (default .005). Bias-only rows contribute squared bias residual divided by .05². These scales are conventions, not measured uncertainty estimates. Do not interpret the objective as chi-squared or a p-value. No confidence intervals are inferred.

A bounded coarse threshold scan followed by nested golden-section searches minimizes the multi-point objective. Bounds: threshold .01–.99 and switching scale .01–100 s^-1. Boundary fits are flagged; nonzero residuals remain visible rather than promising an exact fit. Fit/validation rows, condition metadata, objective, fixed/fitted parameter lists and parameter snapshots are exported. Modified parameters invalidate snapshot correspondence. Session history keeps different condition fits separate; it is not persistent browser storage. No heterogeneous-condition pooled fit or load/temperature interpolation is implied.

Synthetic example data test implementation recovery and are explicitly not experimental validation. The Mears example is optional and is never automatically applied or installed into reset defaults.

## Independent controls

With fixed reference concentration Yref = 3.15 µM:

- KD (µM): equilibrium binding dissociation constant.
- exchange (s^-1): occupancy relaxation rate at Yref, not the total number of binding events per second.
- w (s^-1): independent motor switching scale, not observed reversals per second.
- kon = exchange / (Yref + KD); koff = exchange KD / (Yref + KD).
- Actual occupancy relaxation at Y is kon Y + koff; single bound-molecule residence is 1/koff.

N independent sites have n→n+1 rate kon Y (N-n), and n→n-1 rate koff n. B(q) is logistic[h(logit q - logit qhalf)], with exact endpoint limits. Motor rates are wB(n/N) and w[1-B(n/N)]. h is an occupancy-to-switching steepness parameter, not measured binding cooperativity or necessarily the effective concentration Hill coefficient.

## Mean response and initialization

Both trace and mean curve begin in the joint stationary distribution at initial Y. Solve the tridiagonal system (w I - Q_binding^T)x = w B pi for x_n = P(n,CW), where pi is the equilibrium binomial occupancy distribution. Trace initialization draws n from pi and CW conditionally with probability x_n/pi_n.

For an externally imposed common Y(t), independent binding sites remain binomial, with mean q satisfying dq/dt = kon Y(1-q) - koff q. The displayed ensemble motor probability solves dPcw/dt = w(sum_n B(n/N) Pr(n,t) - Pcw). It is not B(mean q). Occupancy is advanced analytically; the motor probability uses RK4 with rate-resolved substeps (h_step * max(binding relaxation,w) ≤ 0.15). Gillespie and mean solvers use the same left-held input in each 0.2 s signal interval. Subsecond upstream dynamics require finer input sampling in future work.

At stationary input, flux J = sum_n x_n w[1-B(n/N)]. Mean CW dwell is Pcw/J, mean CCW dwell (1-Pcw)/J, and reversals per second 2J. These are mean sojourn times of the full binding/motor process; no assumption of exponentially distributed motor dwell times is needed for the flux formula.

## Optional literature example and scope

Mears PJ et al. (2014), eLife 3:e01916, Table 3, https://doi.org/10.7554/eLife.01916 . Experiment: chemotaxis-WT E. coli HCB1660 expressing fluorescently labelled FliC S219C, optically trapped swimming cells, rotation classified from flagellar waveforms in 100 ms windows. The temperature is not encoded in this reference record; do not extrapolate by temperature or motor load.

Published CW bias 0.13, CCW→CW rate 0.26 s^-1, CW→CCW rate 1.7 s^-1. Dwell targets used here are **derived inverse-rate means** (3.846153846 s CCW; 0.588235294 s CW), not individual experimental dwell observations. Their implied bias 0.132653061 differs from the rounded published 0.13 by 0.002653061, within the explicit absolute tolerance 0.005. Bias and the two dwell means are not three independent constraints: dwell ratio fixes bias and dwell sum fixes cycle flux.

The paper's 2.59 µM is a fitted **mean** CheY-P in a model that includes fluctuations. Here it is approximated as a constant reference input. This fit is therefore conditional matching of summary statistics, not reproduction of the experiment or the paper's stochastic input model.

Holding KD=3.15 µM, exchange=6.3 s^-1, N=34 and h=9.5 as assumptions, the fit gives qhalf=0.5600196385094509 and w=2.2122107244682083 s^-1. Fit threshold against the dwell-implied bias, then fit w against stationary cycle flux; independently check the reported rounded bias. Binding parameters are not identified by this procedure. Bounds are qhalf in [0.01,0.99] and w in [0.01,100]; infeasible targets are rejected. This historical single-point result is a numerical regression fixture, not the default. The general fitter recovers it approximately if the optional example is explicitly fitted.

Custom targets require experimental conditions/source. Editing model parameters marks the stored calibration stale. CSV and SVG metadata preserve parameters and calibration provenance. Constant motor input bypasses upstream coupling to the motor; physical upstream pools continue to be computed separately.

Other correspondence: Cluzel et al. 2000, https://doi.org/10.1126/science.287.5458.1652, is a concentration-response reference, not a source of kon/koff. Sourjik & Berg 2002 binding paper: https://doi.org/10.1073/pnas.192463199 . Its binding assay includes mainly cytoplasmic FliM; do not equate it with assembled-motor binding kinetics.

## Verification

Run `node test-motor-model.cjs` for numerical and independent Monte Carlo checks, and `node test-research.cjs` for UI wiring/export/preset regression checks using a lightweight DOM harness. No browser layout verification is implied.

- 800 independent five-motor step-input simulations: maximum discrepancy over 101 samples 2.111 binomial standard errors.
- Halving mean-solver signal bins while preserving the same piecewise input: maximum error 4.07e-8 in CW probability.
- 300 × 5 × 120 s stationary simulations (180,000 motor-seconds): CW fraction 0.131608; exposure/exit CW dwell 0.585301 s and CCW dwell 3.858852 s, consistent with targets within sampling error.
- Tests cover stationary normalization, joint probability bounds, binding-speed invariance of equilibrium bias, endpoint input, reproducible traces, censoring, parameter/reset/language handling and stale calibration.

Exposure/exit means use all state exposure including record boundaries. Existing complete-dwell histograms remain explicitly labelled as susceptible to short-dwell selection bias. Full dwell-distribution validation requires raw trajectories with the acquisition window and censoring model.

Additional primary references: Yuan, Fahrner & Berg 2009 (10.1016/j.jmb.2009.05.039) establishes load dependence; Yuan & Berg 2013 (10.1016/j.jmb.2013.02.016) distinguishes adapted motor responses. Neither is numerically pooled into defaults. Run `node test-general-fit.cjs` for parameter recovery at multiple concentrations, exclusion of held-out points, bias-only identifiability, consistency checks and parser validation.
