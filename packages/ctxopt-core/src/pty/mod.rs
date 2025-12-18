//! PTY management avec portable-pty
//!
//! Ce module gère la création et manipulation des pseudo-terminaux
//! cross-platform (Unix PTY, Windows ConPTY).

pub mod manager;

pub use manager::{PtyError, PtyManager, PtySize};
