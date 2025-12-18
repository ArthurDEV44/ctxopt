#![deny(clippy::all)]
#![allow(dead_code)]

use napi_derive::napi;

mod config;
mod injector;
mod pty;
mod stream;
mod tokens;

/// Version du module natif
#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Point d'entrée pour tests
#[napi]
pub fn ping() -> String {
    "pong".to_string()
}
