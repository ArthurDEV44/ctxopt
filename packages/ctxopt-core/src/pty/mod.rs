//! PTY management avec portable-pty
//!
//! Ce module gère la création et manipulation des pseudo-terminaux
//! cross-platform (Unix PTY, Windows ConPTY).

pub mod manager;

// PtyError is used in tests and may be used by consumers
#[allow(unused_imports)]
pub use manager::{enter_raw_mode, PtyError, PtyManager, PtySize};

#[cfg(unix)]
pub use manager::RawModeGuard;
