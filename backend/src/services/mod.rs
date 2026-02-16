// Services module - system utilities and command execution
pub mod command;
pub mod config;
pub mod daemon;
pub mod detection;
pub mod docker;
pub mod doctor;
pub mod health;
pub mod installer;
pub mod log_analyzer;
pub mod log_service;
pub mod platform;
pub mod remote;
pub mod service_manager;
pub mod skills;
pub mod ssh;

pub use docker::DockerService;
pub use skills::SkillsService;
pub mod config_analyzer;
pub mod multi_server;
pub mod rollback;
pub mod security_auditor;
pub use rollback::RollbackService;
pub mod uninstaller;
pub mod upgrader;
pub mod whatsapp;
