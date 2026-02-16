//! Integration tests for the RollbackService.
//!
//! Tests run against the real system, so daemon/config may or may not be present.
//! Tests handle both cases gracefully.

use openclaw_wizard::services::RollbackService;
use openclaw_wizard::models::types::{RollbackResult, RollbackStage};

#[tokio::test]
async fn test_rollback_result_structure() {
    let result = RollbackService::rollback_local()
        .await
        .expect("rollback should not error");

    assert_eq!(result.stages.len(), 3);
    assert_eq!(result.stages[0].name, "stop_daemon");
    assert_eq!(result.stages[1].name, "remove_config");
    assert_eq!(result.stages[2].name, "uninstall_openclaw");
}

#[tokio::test]
async fn test_rollback_stages_have_valid_status() {
    let result = RollbackService::rollback_local()
        .await
        .expect("rollback should not error");

    let valid_statuses = ["pending", "success", "skipped", "failed"];

    for stage in &result.stages {
        assert!(
            valid_statuses.contains(&stage.status.as_str()),
            "Stage '{}' has invalid status: '{}'",
            stage.name,
            stage.status
        );
    }
}

#[tokio::test]
async fn test_rollback_idempotent() {
    // First rollback
    let result1 = RollbackService::rollback_local()
        .await
        .expect("first rollback should not error");

    // Second rollback (should skip everything already cleaned up)
    let result2 = RollbackService::rollback_local()
        .await
        .expect("second rollback should not error");

    // Both should complete without panic
    assert_eq!(result1.stages.len(), 3);
    assert_eq!(result2.stages.len(), 3);
}

#[test]
fn test_rollback_result_serializes() {
    let result = RollbackResult {
        success: true,
        stages: vec![
            RollbackStage {
                name: "stop_daemon".to_string(),
                status: "skipped".to_string(),
                message: "Daemon was not running".to_string(),
            },
            RollbackStage {
                name: "remove_config".to_string(),
                status: "success".to_string(),
                message: "Removed openclaw.json".to_string(),
            },
            RollbackStage {
                name: "uninstall_openclaw".to_string(),
                status: "skipped".to_string(),
                message: "OpenClaw was not installed globally".to_string(),
            },
        ],
        error: None,
    };

    let json = serde_json::to_string(&result).expect("should serialize to JSON");
    let parsed: RollbackResult =
        serde_json::from_str(&json).expect("should deserialize from JSON");

    assert_eq!(parsed.success, true);
    assert_eq!(parsed.stages.len(), 3);
    assert_eq!(parsed.stages[0].name, "stop_daemon");
}
