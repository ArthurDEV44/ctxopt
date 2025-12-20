//! Tests pour `PtyManager`

use crate::pty::{PtyError, PtyManager, PtySize};

#[tokio::test]
async fn test_pty_spawn_and_read() {
    let pty = PtyManager::new("echo", &["hello world"], PtySize::default())
        .expect("Failed to create PTY");

    // Attendre que le process demarre
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    let output = pty.read_async().await.expect("Failed to read");
    let text = String::from_utf8_lossy(&output);

    assert!(text.contains("hello") || text.contains("world"),
        "Expected 'hello world', got: {text}");
}

#[tokio::test]
async fn test_pty_write_and_read() {
    let pty = PtyManager::new("cat", &[], PtySize::default())
        .expect("Failed to create PTY");

    // Ecrire dans stdin
    pty.write_str("test input\n").await.expect("Failed to write");

    // Attendre et lire
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    let output = pty.read_async().await.expect("Failed to read");
    let text = String::from_utf8_lossy(&output);

    assert!(text.contains("test input"), "Expected 'test input', got: {text}");

    // Cleanup
    pty.kill().await.ok();
}

#[tokio::test]
async fn test_pty_is_running() {
    let pty = PtyManager::new("sleep", &["0.5"], PtySize::default())
        .expect("Failed to create PTY");

    assert!(pty.is_running().await, "Process should be running");

    // Attendre la fin
    tokio::time::sleep(tokio::time::Duration::from_millis(600)).await;

    assert!(!pty.is_running().await, "Process should have exited");
}

#[tokio::test]
async fn test_pty_resize() {
    let pty = PtyManager::new("cat", &[], PtySize::default())
        .expect("Failed to create PTY");

    let result = pty.resize(PtySize { rows: 40, cols: 120 }).await;
    assert!(result.is_ok(), "Resize should succeed");

    pty.kill().await.ok();
}

#[tokio::test]
async fn test_pty_wait_exit_code_success() {
    let pty = PtyManager::new("true", &[], PtySize::default())
        .expect("Failed to create PTY");

    let code = pty.wait().await.expect("Wait failed");
    assert_eq!(code, 0, "Exit code should be 0");
}

#[tokio::test]
async fn test_pty_wait_exit_code_failure() {
    let pty = PtyManager::new("false", &[], PtySize::default())
        .expect("Failed to create PTY");

    let code = pty.wait().await.expect("Wait failed");
    assert_eq!(code, 1, "Exit code should be 1");
}

#[test]
fn test_pty_size_default() {
    let size = PtySize::default();
    assert_eq!(size.rows, 24);
    assert_eq!(size.cols, 80);
}

// =====================
// Error Handling Tests
// =====================

#[test]
fn test_error_chain_preserved_write() {
    use std::error::Error;

    let io_err = std::io::Error::other("root cause");
    let pty_err = PtyError::write(io_err);

    let msg = pty_err.to_string();
    assert!(msg.contains("write"), "Expected 'write' in message: {msg}");
    assert!(pty_err.source().is_some(), "Source should be preserved");
}

#[test]
fn test_error_chain_preserved_flush() {
    use std::error::Error;

    let io_err = std::io::Error::other("flush failed");
    let pty_err = PtyError::flush(io_err);

    let msg = pty_err.to_string();
    assert!(msg.contains("flush"), "Expected 'flush' in message: {msg}");
    assert!(pty_err.source().is_some(), "Source should be preserved");
}

#[test]
fn test_spawn_error_includes_command() {
    use std::error::Error;

    let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "command not found");
    let pty_err = PtyError::spawn("nonexistent_cmd", io_err);

    let msg = pty_err.to_string();
    assert!(
        msg.contains("nonexistent_cmd"),
        "Expected command name in message: {msg}"
    );
    assert!(pty_err.source().is_some(), "Source should be preserved");
}

#[test]
fn test_resize_error_includes_dimensions() {
    use std::error::Error;

    let io_err = std::io::Error::other("resize failed");
    let pty_err = PtyError::resize(40, 120, io_err);

    let msg = pty_err.to_string();
    assert!(msg.contains("40"), "Expected rows in message: {msg}");
    assert!(msg.contains("120"), "Expected cols in message: {msg}");
    assert!(pty_err.source().is_some(), "Source should be preserved");
}

#[test]
fn test_napi_error_includes_cause_chain() {
    let io_err = std::io::Error::other("root cause");
    let pty_err = PtyError::write(io_err);
    let napi_err: napi::Error = pty_err.into();

    let reason = napi_err.reason;
    assert!(
        reason.contains("write"),
        "Expected 'write' in napi error: {reason}"
    );
    assert!(
        reason.contains("root cause"),
        "Expected cause in napi error: {reason}"
    );
    assert!(
        reason.contains("Caused by"),
        "Expected 'Caused by' in napi error: {reason}"
    );
}

#[test]
fn test_create_error_preserves_source() {
    use std::error::Error;

    let io_err = std::io::Error::other("pty creation failed");
    let pty_err = PtyError::create(io_err);

    assert!(
        pty_err.to_string().contains("create") || pty_err.to_string().contains("PTY"),
        "Expected create/PTY in message: {pty_err}"
    );
    assert!(pty_err.source().is_some(), "Source should be preserved");
}

#[test]
fn test_wait_error() {
    use std::error::Error;

    let io_err = std::io::Error::other("wait failed");
    let pty_err = PtyError::wait(io_err);

    assert!(
        pty_err.to_string().contains("wait"),
        "Expected 'wait' in message: {pty_err}"
    );
    assert!(pty_err.source().is_some(), "Source should be preserved");
}

#[test]
fn test_kill_error() {
    use std::error::Error;

    let io_err = std::io::Error::other("kill failed");
    let pty_err = PtyError::kill(io_err);

    assert!(
        pty_err.to_string().contains("kill"),
        "Expected 'kill' in message: {pty_err}"
    );
    assert!(pty_err.source().is_some(), "Source should be preserved");
}
