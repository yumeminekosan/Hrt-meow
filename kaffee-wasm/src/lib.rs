use wasm_bindgen::prelude::*;
use js_sys::Float64Array;

// ============================================================
// Kaffee PK Engine — Rust + WASM
// 解耦的ODE求解器和PK模型
// ============================================================

/// PK State: [A_depot, A_central]
#[derive(Clone, Copy, Debug)]
pub struct PKState {
    pub a_depot: f64,
    pub a_central: f64,
}

impl PKState {
    pub fn new(a_depot: f64, a_central: f64) -> Self {
        Self { a_depot, a_central }
    }
    
    pub fn to_array(&self) -> [f64; 2] {
        [self.a_depot, self.a_central]
    }
}

// ============================================================
// ODE Solvers
// ============================================================

pub trait ODESolver {
    fn step(&self, state: &PKState, cl: f64, vd: f64, ka: f64, dt: f64, dw: f64) -> PKState;
}

/// Euler-Maruyama solver (1st order + Itô correction)
pub struct EulerMaruyamaSolver {
    sigma: f64,
}

impl EulerMaruyamaSolver {
    pub fn new(sigma: f64) -> Self {
        Self { sigma }
    }
}

impl ODESolver for EulerMaruyamaSolver {
    fn step(&self, state: &PKState, cl: f64, vd: f64, ka: f64, dt: f64, dw: f64) -> PKState {
        let ke = cl / vd;
        
        let d_a_dep = ka * state.a_depot * dt;
        let mut a_depot = state.a_depot - d_a_dep;
        let mut a_central = state.a_central + d_a_dep;
        
        let d_a_elim = ke * a_central * dt;
        a_central -= d_a_elim;
        
        if self.sigma > 0.0 {
            let ito_correction = -0.5 * self.sigma * self.sigma * dt;
            a_central *= f64::exp(self.sigma * dw + ito_correction);
        }
        
        PKState::new(
            a_depot.max(0.0),
            a_central.max(0.0)
        )
    }
}

/// Symplectic solver (geometric integrator)
pub struct SymplecticSolver {
    sigma: f64,
}

impl SymplecticSolver {
    pub fn new(sigma: f64) -> Self {
        Self { sigma }
    }
}

impl ODESolver for SymplecticSolver {
    fn step(&self, state: &PKState, cl: f64, vd: f64, ka: f64, dt: f64, _dw: f64) -> PKState {
        let ke = cl / vd;
        
        let a_central_half = state.a_central * f64::exp(-ke * dt / 2.0);
        let d_a_dep = ka * state.a_depot * dt;
        let a_depot_new = state.a_depot - d_a_dep;
        let a_central_mid = a_central_half + d_a_dep;
        let a_central_new = a_central_mid * f64::exp(-ke * dt / 2.0);
        
        PKState::new(
            a_depot_new.max(0.0),
            a_central_new.max(0.0)
        )
    }
}

/// Stratonovich solver (2nd order Runge-Kutta)
pub struct StratonovichSolver {
    sigma: f64,
}

impl StratonovichSolver {
    pub fn new(sigma: f64) -> Self {
        Self { sigma }
    }
}

impl ODESolver for StratonovichSolver {
    fn step(&self, state: &PKState, cl: f64, vd: f64, ka: f64, dt: f64, dw: f64) -> PKState {
        let ke = cl / vd;
        
        let k1_depot = -ka * state.a_depot;
        let k1_central = ka * state.a_depot - ke * state.a_central;
        
        let mid_depot = state.a_depot + 0.5 * dt * k1_depot;
        let mid_central = state.a_central + 0.5 * dt * k1_central;
        
        let k2_depot = -ka * mid_depot;
        let k2_central = ka * mid_depot - ke * mid_central;
        
        PKState::new(
            state.a_depot + dt * k2_depot,
            state.a_central + dt * k2_central + self.sigma * state.a_central * dw
        )
    }
}

// ============================================================
// PK Model — One Compartment with Absorption
// ============================================================

pub struct OneCompartmentModel {
    cl: f64,
    vd: f64,
    ka: f64,
    f: f64,
    sigma: f64,
}

impl OneCompartmentModel {
    pub fn new(cl: f64, vd: f64, ka: f64, f: f64, sigma: f64) -> Self {
        Self { cl, vd, ka, f, sigma }
    }
    
    pub fn simulate_multi_dose<S: ODESolver>(
        &self,
        solver: &S,
        dose: f64,
        interval: f64,
        num_doses: usize,
        duration: f64,
        dt: f64,
    ) -> Vec<(f64, f64)> {
        let mut results = Vec::new();
        let mut state = PKState::new(0.0, 0.0);
        let mut t = 0.0;
        let mut dose_count = 0;
        
        while t <= duration {
            // Administer dose at intervals
            if dose_count < num_doses && (t - dose_count as f64 * interval).abs() < dt * 0.5 {
                state.a_depot += dose * self.f;
                dose_count += 1;
            }
            
            // Concentration = A_central / Vd
            let c = state.a_central / self.vd;
            results.push((t, c));
            
            // Step forward
            let dw = if self.sigma > 0.0 {
                // Box-Muller transform for normal random
                let u1 = js_sys::Math::random();
                let u2 = js_sys::Math::random();
                f64::sqrt(-2.0 * f64::ln(u1)) * f64::cos(2.0 * std::f64::consts::PI * u2) * f64::sqrt(dt)
            } else {
                0.0
            };
            
            state = solver.step(&state, self.cl, self.vd, self.ka, dt, dw);
            t += dt;
        }
        
        results
    }
}

// ============================================================
// Statistics
// ============================================================

pub fn percentile(sorted: &[f64], p: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let idx = ((sorted.len() as f64 - 1.0) * p / 100.0) as usize;
    sorted[idx.min(sorted.len() - 1)]
}

pub fn median(values: &[f64]) -> f64 {
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    percentile(&sorted, 50.0)
}

// ============================================================
// WASM Exports
// ============================================================

#[wasm_bindgen]
pub struct KaffeeEngine {
    cl: f64,
    vd: f64,
    ka: f64,
    f: f64,
    sigma: f64,
}

#[wasm_bindgen]
impl KaffeeEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(cl: f64, vd: f64, ka: f64, f: f64, sigma: f64) -> Self {
        Self { cl, vd, ka, f, sigma }
    }
    
    /// Simulate with Euler-Maruyama solver
    pub fn simulate_euler(&self, dose: f64, interval: f64, num_doses: usize, duration: f64, dt: f64) -> Float64Array {
        let model = OneCompartmentModel::new(self.cl, self.vd, self.ka, self.f, self.sigma);
        let solver = EulerMaruyamaSolver::new(self.sigma);
        let results = model.simulate_multi_dose(&solver, dose, interval, num_doses, duration, dt);
        
        // Flatten to [t1, c1, t2, c2, ...]
        let flat: Vec<f64> = results.iter().flat_map(|(t, c)| vec![*t, *c]).collect();
        Float64Array::from(&flat[..])
    }
    
    /// Simulate with Symplectic solver
    pub fn simulate_symplectic(&self, dose: f64, interval: f64, num_doses: usize, duration: f64, dt: f64) -> Float64Array {
        let model = OneCompartmentModel::new(self.cl, self.vd, self.ka, self.f, self.sigma);
        let solver = SymplecticSolver::new(self.sigma);
        let results = model.simulate_multi_dose(&solver, dose, interval, num_doses, duration, dt);
        
        let flat: Vec<f64> = results.iter().flat_map(|(t, c)| vec![*t, *c]).collect();
        Float64Array::from(&flat[..])
    }
    
    /// Simulate with Stratonovich solver
    pub fn simulate_stratonovich(&self, dose: f64, interval: f64, num_doses: usize, duration: f64, dt: f64) -> Float64Array {
        let model = OneCompartmentModel::new(self.cl, self.vd, self.ka, self.f, self.sigma);
        let solver = StratonovichSolver::new(self.sigma);
        let results = model.simulate_multi_dose(&solver, dose, interval, num_doses, duration, dt);
        
        let flat: Vec<f64> = results.iter().flat_map(|(t, c)| vec![*t, *c]).collect();
        Float64Array::from(&flat[..])
    }
    
    /// Calculate statistics from concentration array
    pub fn calculate_statistics(&self, concentrations: &[f64]) -> Float64Array {
        let mut sorted = concentrations.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        
        let p25 = percentile(&sorted, 25.0);
        let p50 = percentile(&sorted, 50.0);
        let p75 = percentile(&sorted, 75.0);
        
        Float64Array::from(&[p25, p50, p75][..])
    }
}

// ============================================================
// Monte Carlo Simulation
// ============================================================

#[wasm_bindgen]
pub fn monte_carlo_simulation(
    cl: f64, vd: f64, ka: f64, f: f64, sigma: f64,
    dose: f64, interval: f64, num_doses: usize, duration: f64, dt: f64,
    num_sims: usize,
    solver_type: &str,
) -> Float64Array {
    let model = OneCompartmentModel::new(cl, vd, ka, f, sigma);
    
    let mut all_cmax = Vec::new();
    let mut all_cmin = Vec::new();
    let mut all_auc = Vec::new();
    
    for _ in 0..num_sims {
        let results = match solver_type {
            "symplectic" => {
                let solver = SymplecticSolver::new(sigma);
                model.simulate_multi_dose(&solver, dose, interval, num_doses, duration, dt)
            },
            "stratonovich" => {
                let solver = StratonovichSolver::new(sigma);
                model.simulate_multi_dose(&solver, dose, interval, num_doses, duration, dt)
            },
            _ => {
                let solver = EulerMaruyamaSolver::new(sigma);
                model.simulate_multi_dose(&solver, dose, interval, num_doses, duration, dt)
            },
        };
        
        let concentrations: Vec<f64> = results.iter().map(|(_, c)| *c).collect();
        
        if let Some(cmax) = concentrations.iter().max_by(|a, b| a.partial_cmp(b).unwrap()) {
            all_cmax.push(*cmax);
        }
        if let Some(cmin) = concentrations.iter().min_by(|a, b| a.partial_cmp(b).unwrap()) {
            all_cmin.push(*cmin);
        }
        
        // Trapezoidal rule for AUC
        let auc: f64 = results.windows(2).map(|w| {
            let dt = w[1].0 - w[0].0;
            let avg_c = (w[0].1 + w[1].1) / 2.0;
            dt * avg_c
        }).sum();
        all_auc.push(auc);
    }
    
    all_cmax.sort_by(|a, b| a.partial_cmp(b).unwrap());
    all_cmin.sort_by(|a, b| a.partial_cmp(b).unwrap());
    all_auc.sort_by(|a, b| a.partial_cmp(b).unwrap());
    
    let cmax_p25 = percentile(&all_cmax, 25.0);
    let cmax_p50 = percentile(&all_cmax, 50.0);
    let cmax_p75 = percentile(&all_cmax, 75.0);
    
    let cmin_p25 = percentile(&all_cmin, 25.0);
    let cmin_p50 = percentile(&all_cmin, 50.0);
    let cmin_p75 = percentile(&all_cmin, 75.0);
    
    let auc_p25 = percentile(&all_auc, 25.0);
    let auc_p50 = percentile(&all_auc, 50.0);
    let auc_p75 = percentile(&all_auc, 75.0);
    
    Float64Array::from(&[
        cmax_p25, cmax_p50, cmax_p75,
        cmin_p25, cmin_p50, cmin_p75,
        auc_p25, auc_p50, auc_p75,
    ][..])
}
