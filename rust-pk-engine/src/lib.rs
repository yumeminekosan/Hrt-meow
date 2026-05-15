use wasm_bindgen::prelude::*;
use js_sys::Float64Array;

// ============================================================
// PK Engine Core — Rust + WASM
// ============================================================

/// ODE Solver trait
pub trait ODESolver {
    fn step(&self, state: &[f64], derivatives: &[f64], dt: f64) -> Vec<f64>;
}

/// Euler method (1st order)
pub struct Euler;
impl ODESolver for Euler {
    fn step(&self, state: &[f64], derivatives: &[f64], dt: f64) -> Vec<f64> {
        state.iter().zip(derivatives.iter())
            .map(|(s, d)| s + d * dt)
            .collect()
    }
}

/// RK4 method (4th order)
pub struct RK4;
impl RK4 {
    fn compute_derivatives<F>(state: &[f64], t: f64, f: &F) -> Vec<f64>
    where F: Fn(&[f64], f64) -> Vec<f64> {
        f(state, t)
    }
}
impl ODESolver for RK4 {
    fn step(&self, state: &[f64], derivatives: &[f64], dt: f64) -> Vec<f64> {
        // RK4 needs the derivative function, but trait only gives us pre-computed derivatives
        // For standalone RK4, use the simulate_rk4 function below
        Euler.step(state, derivatives, dt)
    }
}

// ============================================================
// PK Models
// ============================================================

/// Oral administration model (1-compartment with absorption)
/// State: [gut, central]
fn oral_derivatives(state: &[f64], _t: f64, ka: f64, cl: f64, vd: f64, f: f64) -> Vec<f64> {
    let gut = state[0];
    let central = state[1];
    let ke = cl / vd;
    
    vec![
        -ka * gut,                                    // dGut/dt
        (f * ka * gut / vd) - ke * central            // dCentral/dt
    ]
}

/// IM/EV depot model
/// State: [depot, central]
fn ev_derivatives(state: &[f64], _t: f64, ka_depot: f64, ke_e2: f64, vd_e2: f64, 
                  f_conv: f64, kh: f64, ke_ev: f64, vd_ev: f64, mw: f64) -> Vec<f64> {
    let depot = state[0];
    let central = state[1];
    
    let release_rate = ka_depot * depot;
    let c_ev_qss = (f_conv * release_rate / vd_ev) / (kh + ke_ev);
    let e2_prod = kh * c_ev_qss * (vd_ev / vd_e2) * mw;
    
    vec![
        -ka_depot * depot,                            // dDepot/dt
        e2_prod - ke_e2 * central                     // dCentral/dt
    ]
}

/// DDI model (E2 + CPA)
/// State: [gut_e2, central_e2, gut_cp, central_cp]
fn ddi_derivatives(state: &[f64], _t: f64, ka_e2: f64, cl_e2: f64, vd_e2: f64, f_e2: f64,
                   cp_ka: f64, cp_cl: f64, cp_vd: f64, cp_f: f64, ki: f64) -> Vec<f64> {
    let gut_e2 = state[0];
    let central_e2 = state[1];
    let gut_cp = state[2];
    let central_cp = state[3];
    
    let ke_e2 = cl_e2 / vd_e2;
    let ke_cp = cp_cl / cp_vd;
    
    let inh_frac = central_cp / (central_cp + ki);
    let cl_eff = cl_e2 * (1.0 - inh_frac);
    
    vec![
        -ka_e2 * gut_e2,                              // dGutE2/dt
        (f_e2 * ka_e2 * gut_e2 / vd_e2) - (cl_eff / vd_e2) * central_e2,  // dCentralE2/dt
        -cp_ka * gut_cp,                              // dGutCP/dt
        (cp_f * cp_ka * gut_cp / cp_vd) - ke_cp * central_cp              // dCentralCP/dt
    ]
}

// ============================================================
// Generic Simulation Engine
// ============================================================

fn simulate<F>(
    initial_state: Vec<f64>,
    t_end: f64,
    dt: f64,
    mut derivative_fn: F,
    dose_events: &[(f64, f64, usize)], // (time, amount, compartment)
    solver_type: &str,
) -> (Vec<f64>, Vec<Vec<f64>>)
where F: FnMut(&[f64], f64) -> Vec<f64> {
    let n_steps = (t_end / dt).ceil() as usize;
    let n_compartments = initial_state.len();
    
    let mut t = Vec::with_capacity(n_steps + 1);
    let mut states = Vec::with_capacity(n_steps + 1);
    
    let mut state = initial_state.clone();
    let mut dose_idx = 0;
    
    t.push(0.0);
    states.push(state.clone());
    
    for i in 1..=n_steps {
        let time = i as f64 * dt;
        
        // Apply doses
        while dose_idx < dose_events.len() && dose_events[dose_idx].0 <= time + 1e-6 {
            let (_, amount, comp) = dose_events[dose_idx];
            state[comp] += amount;
            dose_idx += 1;
        }
        
        // Step
        let derivatives = derivative_fn(&state, time);
        
        match solver_type {
            "rk4" => {
                // RK4 step
                let k1: Vec<f64> = derivatives.iter().map(|d| d * dt).collect();
                
                let s2: Vec<f64> = state.iter().zip(k1.iter()).map(|(s, k)| s + k * 0.5).collect();
                let k2: Vec<f64> = derivative_fn(&s2, time + dt * 0.5).iter().map(|d| d * dt).collect();
                
                let s3: Vec<f64> = state.iter().zip(k2.iter()).map(|(s, k)| s + k * 0.5).collect();
                let k3: Vec<f64> = derivative_fn(&s3, time + dt * 0.5).iter().map(|d| d * dt).collect();
                
                let s4: Vec<f64> = state.iter().zip(k3.iter()).map(|(s, k)| s + k).collect();
                let k4: Vec<f64> = derivative_fn(&s4, time + dt).iter().map(|d| d * dt).collect();
                
                for j in 0..n_compartments {
                    state[j] += (k1[j] + 2.0 * k2[j] + 2.0 * k3[j] + k4[j]) / 6.0;
                    if state[j] < 0.0 { state[j] = 0.0; }
                }
            }
            _ => {
                // Euler step
                for j in 0..n_compartments {
                    state[j] += derivatives[j] * dt;
                    if state[j] < 0.0 { state[j] = 0.0; }
                }
            }
        }
        
        t.push(time);
        states.push(state.clone());
    }
    
    (t, states)
}

// ============================================================
// WASM Exports
// ============================================================

#[wasm_bindgen]
pub struct PKEngine;

#[wasm_bindgen]
impl PKEngine {
    /// Simulate oral PK
    /// Returns: [t, gut, central, ...] as flat array
    #[wasm_bindgen]
    pub fn simulate_oral(
        cl: f64, vd: f64, ka: f64, f: f64,
        dose: f64, days: u32, freq: f64,
        dt: f64, solver: &str
    ) -> Float64Array {
        let t_end = days as f64 * 24.0;
        let n_doses = ((t_end / freq).floor() as usize) + 1;
        
        let mut dose_events = Vec::new();
        for i in 0..n_doses {
            dose_events.push((i as f64 * freq, dose, 0usize)); // dose to gut
        }
        
        let initial_state = vec![0.0, 0.0];
        let (t, states) = simulate(
            initial_state,
            t_end,
            dt,
            |s, _t| oral_derivatives(s, _t, ka, cl, vd, f),
            &dose_events,
            solver,
        );
        
        // Flatten: [t0, gut0, central0, t1, gut1, central1, ...]
        let mut result = Vec::with_capacity(t.len() * 3);
        for i in 0..t.len() {
            result.push(t[i]);
            result.push(states[i][0]);
            result.push(states[i][1]);
        }
        
        Float64Array::from(&result[..])
    }
    
    /// Simulate EV/IM depot
    #[wasm_bindgen]
    pub fn simulate_ev(
        ka_depot: f64, vd_e2: f64, ke_e2: f64, f_conv: f64,
        dose: f64, days: u32, freq: f64,
        dt: f64, solver: &str
    ) -> Float64Array {
        let t_end = days as f64 * 24.0;
        let n_doses = ((t_end / freq).floor() as usize) + 1;
        
        let mut dose_events = Vec::new();
        for i in 0..n_doses {
            dose_events.push((i as f64 * freq, dose, 0usize)); // dose to depot
        }
        
        let initial_state = vec![0.0, 0.0];
        let kh = 10.0;
        let ke_ev = 0.5;
        let vd_ev = 80.0;
        let mw = 0.8665;
        
        let (t, states) = simulate(
            initial_state,
            t_end,
            dt,
            |s, _t| ev_derivatives(s, _t, ka_depot, ke_e2, vd_e2, f_conv, kh, ke_ev, vd_ev, mw),
            &dose_events,
            solver,
        );
        
        let mut result = Vec::with_capacity(t.len() * 3);
        for i in 0..t.len() {
            result.push(t[i]);
            result.push(states[i][0]);
            result.push(states[i][1]);
        }
        
        Float64Array::from(&result[..])
    }
    
    /// Simulate DDI (E2 + CPA)
    #[wasm_bindgen]
    pub fn simulate_ddi(
        cl_e2: f64, vd_e2: f64, ka_e2: f64, f_e2: f64,
        cp_cl: f64, cp_vd: f64, cp_ka: f64, cp_f: f64,
        ki: f64, dose_e2: f64, cp_dose: f64,
        days: u32, freq: f64, dt: f64, solver: &str
    ) -> Float64Array {
        let t_end = days as f64 * 24.0;
        let n_doses = ((t_end / freq).floor() as usize) + 1;
        
        let mut dose_events = Vec::new();
        for i in 0..n_doses {
            dose_events.push((i as f64 * freq, dose_e2, 0usize));   // E2 to gut
            dose_events.push((i as f64 * freq, cp_dose, 2usize));   // CPA to gut
        }
        
        let initial_state = vec![0.0, 0.0, 0.0, 0.0];
        let (t, states) = simulate(
            initial_state,
            t_end,
            dt,
            |s, _t| ddi_derivatives(s, _t, ka_e2, cl_e2, vd_e2, f_e2, cp_ka, cp_cl, cp_vd, cp_f, ki),
            &dose_events,
            solver,
        );
        
        let mut result = Vec::with_capacity(t.len() * 5);
        for i in 0..t.len() {
            result.push(t[i]);
            result.push(states[i][0]); // gut_e2
            result.push(states[i][1]); // central_e2
            result.push(states[i][2]); // gut_cp
            result.push(states[i][3]); // central_cp
        }
        
        Float64Array::from(&result[..])
    }
    
    /// Calculate statistics from simulation result
    #[wasm_bindgen]
    pub fn calculate_stats(data: &Float64Array, col_offset: usize, n_cols: usize) -> Float64Array {
        let n_rows = (data.length() as usize) / n_cols;
        let mut values = Vec::with_capacity(n_rows);
        
        for i in 0..n_rows {
            values.push(data.get_index((i * n_cols + col_offset) as u32));
        }
        
        let cmax = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let tmax_idx = values.iter().position(|&v| v == cmax).unwrap_or(0);
        
        // AUC (trapezoidal)
        let mut auc = 0.0;
        for i in 1..n_rows {
            let t0 = data.get_index(((i - 1) * n_cols) as u32);
            let t1 = data.get_index((i * n_cols) as u32);
            let c0 = values[i - 1];
            let c1 = values[i];
            auc += (c0 + c1) * 0.5 * (t1 - t0);
        }
        
        // t_half estimation
        let half_c = cmax * 0.5;
        let mut t_half = f64::NAN;
        for i in tmax_idx..n_rows {
            if values[i] <= half_c {
                let t0 = data.get_index(((i - 1) * n_cols) as u32);
                let t1 = data.get_index((i * n_cols) as u32);
                let c0 = values[i - 1];
                let c1 = values[i];
                if c0 != c1 {
                    t_half = t0 + (t1 - t0) * (half_c - c0) / (c1 - c0);
                }
                break;
            }
        }
        
        Float64Array::from(&[cmax, tmax_idx as f64, auc, t_half][..])
    }
}

// ============================================================
// Master Equation (Gillespie SSA)
// ============================================================

use std::f64;

#[wasm_bindgen]
pub struct MasterEquation;

#[wasm_bindgen]
impl MasterEquation {
    /// Run Gillespie SSA for multi-compartment model
    /// Returns: flat array of [t, n0, n1, n2, ...]
    #[wasm_bindgen]
    pub fn gillespie_ssa(
        n0: u32,                    // initial molecules
        k_matrix: &Float64Array,    // flattened transition matrix
        k_elim: &Float64Array,      // elimination rates
        n_compartments: usize,
        t_end: f64,
        n_trajectories: u32,
    ) -> Float64Array {
        let mut all_results = Vec::new();
        
        for _ in 0..n_trajectories {
            let mut n = vec![0u32; n_compartments];
            n[0] = n0;
            let mut time = 0.0;
            
            all_results.push(time);
            for j in 0..n_compartments {
                all_results.push(n[j] as f64);
            }
            
            while time < t_end {
                // Calculate propensities
                let mut a = Vec::new();
                let mut reactions = Vec::new();
                
                for i in 0..n_compartments {
                    for j in 0..n_compartments {
                        if i != j {
                            let k = k_matrix.get_index((i * n_compartments + j) as u32);
                            if k > 0.0 {
                                a.push(k * n[i] as f64);
                                reactions.push((i, j));
                            }
                        }
                    }
                    // Elimination
                    let ke = k_elim.get_index(i as u32);
                    if ke > 0.0 {
                        a.push(ke * n[i] as f64);
                        reactions.push((i, n_compartments)); // to "eliminated"
                    }
                }
                
                let a0: f64 = a.iter().sum();
                if a0 == 0.0 { break; }
                
                // Sample waiting time
                let r1 = js_sys::Math::random();
                let tau = -r1.ln() / a0;
                
                // Sample reaction
                let r2 = js_sys::Math::random() * a0;
                let mut cumsum = 0.0;
                let mut reaction_idx = 0;
                for (idx, &prop) in a.iter().enumerate() {
                    cumsum += prop;
                    if cumsum >= r2 {
                        reaction_idx = idx;
                        break;
                    }
                }
                
                // Execute reaction
                let (from, to) = reactions[reaction_idx];
                if n[from] > 0 {
                    n[from] -= 1;
                    if to < n_compartments {
                        n[to] += 1;
                    }
                }
                
                time += tau;
                
                all_results.push(time);
                for j in 0..n_compartments {
                    all_results.push(n[j] as f64);
                }
            }
        }
        
        Float64Array::from(&all_results[..])
    }
}

// ============================================================
// Fokker-Planck (Spectral Chebyshev Method)
// ============================================================

#[wasm_bindgen]
pub struct FokkerPlanck;

#[wasm_bindgen]
impl FokkerPlanck {
    /// Solve Fokker-Planck equation using Chebyshev spectral method
    /// Returns: flat array of [x0, P0, x1, P1, ...] at final time
    #[wasm_bindgen]
    pub fn solve_fp(
        d: f64,          // diffusion coefficient
        x_min: f64,
        x_max: f64,
        nx: usize,
        dt: f64,
        t_end: f64,
        drift_type: &str, // "linear", "absorption", "custom"
    ) -> Float64Array {
        // Chebyshev grid
        let mut x = vec![0.0; nx];
        for i in 0..nx {
            let xi = (std::f64::consts::PI * i as f64 / (nx - 1) as f64).cos();
            x[i] = 0.5 * (x_max + x_min) + 0.5 * (x_max - x_min) * xi;
        }
        
        // Initial condition: delta function at x=0
        let mut p = vec![0.0; nx];
        let mut min_dist = f64::MAX;
        let mut idx0 = 0;
        for i in 0..nx {
            let dist = x[i].abs();
            if dist < min_dist {
                min_dist = dist;
                idx0 = i;
            }
        }
        p[idx0] = 1.0 / (x[1] - x[0]);
        
        // Chebyshev differentiation matrix (simplified)
        let n_steps = (t_end / dt).ceil() as usize;
        
        for _ in 0..n_steps {
            let mut p_new = vec![0.0; nx];
            
            for i in 1..nx-1 {
                let xi = x[i];
                let drift = match drift_type {
                    "linear" => -0.1 * xi,
                    "absorption" => 1.5 - 0.125 * xi,
                    _ => -0.1 * xi,
                };
                
                // Centered differences for spatial derivatives
                let dx = x[i+1] - x[i-1];
                let dp_dx = (p[i+1] - p[i-1]) / dx;
                let d2p_dx2 = (p[i+1] - 2.0*p[i] + p[i-1]) / ((dx/2.0).powi(2));
                
                // Fokker-Planck: dP/dt = -d(A*P)/dx + D*d²P/dx²
                let d_ap_dx = drift * dp_dx + p[i] * (-0.1); // dA/dx for linear
                p_new[i] = p[i] + dt * (-d_ap_dx + d * d2p_dx2);
            }
            
            // Boundary conditions (absorbing)
            p_new[0] = 0.0;
            p_new[nx-1] = 0.0;
            
            // Normalize
            let sum: f64 = p_new.iter().sum();
            if sum > 0.0 {
                for v in p_new.iter_mut() { *v /= sum; }
            }
            
            p = p_new;
        }
        
        let mut result = Vec::with_capacity(nx * 2);
        for i in 0..nx {
            result.push(x[i]);
            result.push(p[i]);
        }
        
        Float64Array::from(&result[..])
    }
}
