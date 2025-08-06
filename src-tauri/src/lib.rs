use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use winreg::RegKey;
use winreg::enums::*;
use chrono::Local;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone)]
pub struct ModInfo {
    name: String,
    path: String,
    game: String,
    version: Option<String>,
    description: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GameInfo {
    name: String,
    path: String,
    icon: Option<String>,
    executable: Option<String>,
    mod_support: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PatchFolderInfo {
    name: String,
    path: String,
    game_name: String,
    file_count: usize,
    created_time: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BackupInfo {
    timestamp: String,
    mod_name: String,
    files: Vec<String>,
    backup_path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct InstallLogEntry {
    timestamp: String,
    mod_name: String,
    operation_type: String, // "新增" or "修改"
    file_path: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn scan_mods(game_name: Option<String>) -> Result<Vec<ModInfo>, String> {
    let mut mods = Vec::new();
    
    if let Some(game) = game_name {
        // Define common mod directories for different games
        let mod_dirs = get_mod_directories(&game);
        
        for mod_dir in mod_dirs {
            if mod_dir.exists() {
                match scan_directory_for_mods(&mod_dir, &game) {
                    Ok(mut found_mods) => mods.append(&mut found_mods),
                    Err(e) => eprintln!("Error scanning {}: {}", mod_dir.display(), e),
                }
            }
        }
    }
    
    Ok(mods)
}

fn get_mod_directories(game_name: &str) -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    
    // Common mod directory patterns
    let common_patterns = vec![
        format!("mods/{}", game_name),
        format!("Mods/{}", game_name),
        format!("{}/mods", game_name),
        format!("{}/Mods", game_name),
        format!("Documents/My Games/{}/Mods", game_name),
    ];
    
    // Add game-specific mod directories
    match game_name.to_lowercase().as_str() {
        name if name.contains("gta") || name.contains("grand theft auto") => {
            dirs.push(PathBuf::from("patch/shshouse/GTAIV"));
            dirs.push(PathBuf::from("mods"));
            dirs.push(PathBuf::from("scripts"));
        },
        name if name.contains("skyrim") => {
            dirs.push(PathBuf::from("Data"));
            dirs.push(PathBuf::from("mods"));
        },
        name if name.contains("fallout") => {
            dirs.push(PathBuf::from("Data"));
            dirs.push(PathBuf::from("mods"));
        },
        name if name.contains("minecraft") => {
            dirs.push(PathBuf::from("mods"));
            dirs.push(PathBuf::from(".minecraft/mods"));
        },
        _ => {
            // Generic mod directories
            dirs.push(PathBuf::from("mods"));
            dirs.push(PathBuf::from("Mods"));
        }
    }
    
    // Add common patterns
    for pattern in common_patterns {
        dirs.push(PathBuf::from(pattern));
    }
    
    dirs
}

fn scan_directory_for_mods(dir: &Path, game_name: &str) -> Result<Vec<ModInfo>, String> {
    let mut mods = Vec::new();
    
    match fs::read_dir(dir) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    
                    if path.is_dir() {
                        // Directory-based mod
                        if let Some(name) = path.file_name() {
                            if let Some(name_str) = name.to_str() {
                                let mod_info = ModInfo {
                                    name: name_str.to_string(),
                                    path: path.to_string_lossy().to_string(),
                                    game: game_name.to_string(),
                                    version: extract_version_from_path(&path),
                                    description: extract_description_from_path(&path),
                                };
                                mods.push(mod_info);
                            }
                        }
                    } else if path.is_file() {
                        // File-based mod (e.g., .jar, .dll, .asi files)
                        if let Some(extension) = path.extension() {
                            let ext_str = extension.to_string_lossy().to_lowercase();
                            if is_mod_file_extension(&ext_str) {
                                if let Some(name) = path.file_stem() {
                                    if let Some(name_str) = name.to_str() {
                                        let mod_info = ModInfo {
                                            name: name_str.to_string(),
                                            path: path.to_string_lossy().to_string(),
                                            game: game_name.to_string(),
                                            version: None,
                                            description: None,
                                        };
                                        mods.push(mod_info);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }
    
    Ok(mods)
}

fn is_mod_file_extension(ext: &str) -> bool {
    matches!(ext, "jar" | "dll" | "asi" | "esp" | "esm" | "zip" | "rar" | "7z" | "pak" | "mod")
}

fn extract_version_from_path(path: &Path) -> Option<String> {
    // Try to extract version from directory name or readme files
    if let Some(name) = path.file_name() {
        let name_str = name.to_string_lossy();
        // Simple regex-like pattern matching for version numbers
        if let Some(version_start) = name_str.find("v") {
            let version_part = &name_str[version_start..];
            if let Some(space_pos) = version_part.find(' ') {
                return Some(version_part[..space_pos].to_string());
            } else {
                return Some(version_part.to_string());
            }
        }
    }
    None
}

fn extract_description_from_path(path: &Path) -> Option<String> {
    // Try to read description from readme files
    let readme_files = vec!["readme.txt", "README.txt", "readme.md", "README.md"];
    
    for readme_file in readme_files {
        let readme_path = path.join(readme_file);
        if readme_path.exists() {
            if let Ok(content) = fs::read_to_string(&readme_path) {
                // Return first line or first 100 characters as description
                let first_line = content.lines().next().unwrap_or("");
                if first_line.len() > 100 {
                    return Some(format!("{}...", &first_line[..97]));
                } else {
                    return Some(first_line.to_string());
                }
            }
        }
    }
    None
}

#[tauri::command]
fn scan_installed_games() -> Result<Vec<GameInfo>, String> {
    let mut games = Vec::new();
    
    // Scan Windows Registry for installed programs
    scan_registry_for_games(&mut games)?;
    
    // Scan common game installation directories
    scan_common_game_directories(&mut games);
    
    // Scan Steam library
    scan_steam_library(&mut games);
    
    // Remove duplicates
    games.dedup_by(|a, b| a.name == b.name && a.path == b.path);
    
    // Read custom game paths from config file
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or("Failed to get executable directory")?;
    
    let config_path = exe_dir.join("games_config.json");
    
    if config_path.exists() {
        let config_content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;
        
        let games_config: HashMap<String, String> = serde_json::from_str(&config_content)
            .map_err(|e| format!("Failed to parse config file: {}", e))?;
        
        // Update game paths with custom paths from config
        for game in &mut games {
            if let Some(custom_path) = games_config.get(&game.name) {
                game.path = custom_path.clone();
            }
        }
    }
    
    // Create game folders for detected games
    for game in &games {
        if let Err(e) = create_game_folder(&game.name) {
            eprintln!("Failed to create game folder for {}: {}", game.name, e);
        }
    }
    
    Ok(games)
}

fn scan_registry_for_games(games: &mut Vec<GameInfo>) -> Result<(), String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    
    // Check both 64-bit and 32-bit registry keys
    let registry_paths = vec![
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    ];
    
    for registry_path in registry_paths {
        if let Ok(uninstall_key) = hklm.open_subkey(registry_path) {
            for subkey_name in uninstall_key.enum_keys().filter_map(Result::ok) {
                if let Ok(subkey) = uninstall_key.open_subkey(&subkey_name) {
                    let display_name: Result<String, _> = subkey.get_value("DisplayName");
                    let install_location: Result<String, _> = subkey.get_value("InstallLocation");
                    
                    if let (Ok(name), Ok(path)) = (display_name, install_location) {
                        if is_likely_game(&name, &path) {
                            let executable = find_game_executable(&path);
                            let mod_support = check_mod_support(&name, &path);
                            
                            games.push(GameInfo {
                                name,
                                path,
                                icon: None,
                                executable,
                                mod_support,
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Special handling for GTA4 using Rockstar Games registry key
    scan_gta4_registry(games);
    
    Ok(())
}

fn scan_gta4_registry(games: &mut Vec<GameInfo>) {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    
    // Check both 64-bit and 32-bit registry paths for GTA4
    let gta4_registry_paths = vec![
        "SOFTWARE\\Rockstar Games\\Grand Theft Auto IV",
        "SOFTWARE\\WOW6432Node\\Rockstar Games\\Grand Theft Auto IV",
    ];
    
    for gta4_path in gta4_registry_paths {
        if let Ok(gta4_key) = hklm.open_subkey(gta4_path) {
            if let Ok(install_folder) = gta4_key.get_value::<String, _>("InstallFolder") {
                let path = install_folder.trim_end_matches("\\").to_string();
                if !path.is_empty() && Path::new(&path).exists() {
                    let executable = find_game_executable(&path);
                    let mod_support = check_mod_support("Grand Theft Auto IV", &path);
                    
                    games.push(GameInfo {
                        name: "Grand Theft Auto IV".to_string(),
                        path,
                        icon: None,
                        executable,
                        mod_support,
                    });
                    break; // Found GTA4, no need to check other paths
                }
            }
        }
    }
}

fn scan_common_game_directories(games: &mut Vec<GameInfo>) {
    let common_dirs = vec![
        "C:\\Program Files\\",
        "C:\\Program Files (x86)\\",
        "D:\\Games\\",
        "E:\\Games\\",
        "C:\\Games\\",
    ];
    
    for base_dir in common_dirs {
        let base_path = Path::new(base_dir);
        if base_path.exists() {
            if let Ok(entries) = fs::read_dir(base_path) {
                for entry in entries.filter_map(Result::ok) {
                    let path = entry.path();
                    if path.is_dir() {
                        if let Some(name) = path.file_name() {
                            if let Some(name_str) = name.to_str() {
                                if is_likely_game(name_str, &path.to_string_lossy()) {
                                    let executable = find_game_executable(&path.to_string_lossy());
                                    let mod_support = check_mod_support(name_str, &path.to_string_lossy());
                                    
                                    games.push(GameInfo {
                                        name: name_str.to_string(),
                                        path: path.to_string_lossy().to_string(),
                                        icon: None,
                                        executable,
                                        mod_support,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn scan_steam_library(games: &mut Vec<GameInfo>) {
    // Try to find Steam installation and scan library folders
    let steam_paths = vec![
        "C:\\Program Files (x86)\\Steam\\steamapps\\common",
        "C:\\Program Files\\Steam\\steamapps\\common",
    ];
    
    for steam_path in steam_paths {
        let steam_dir = Path::new(steam_path);
        if steam_dir.exists() {
            if let Ok(entries) = fs::read_dir(steam_dir) {
                for entry in entries.filter_map(Result::ok) {
                    let path = entry.path();
                    if path.is_dir() {
                        if let Some(name) = path.file_name() {
                            if let Some(name_str) = name.to_str() {
                                let executable = find_game_executable(&path.to_string_lossy());
                                let mod_support = check_mod_support(name_str, &path.to_string_lossy());
                                
                                games.push(GameInfo {
                                    name: name_str.to_string(),
                                    path: path.to_string_lossy().to_string(),
                                    icon: None,
                                    executable,
                                    mod_support,
                                });
                            }
                        }
                    }
                }
            }
        }
    }
}

fn is_likely_game(name: &str, path: &str) -> bool {
    let name_lower = name.to_lowercase();
    let path_lower = path.to_lowercase();
    
    // Game indicators in name
    let game_keywords = vec![
        "game", "gta", "grand theft auto", "skyrim", "fallout", "minecraft", 
        "call of duty", "battlefield", "assassin", "witcher", "cyberpunk",
        "elder scrolls", "mass effect", "dragon age", "bioshock", "dishonored",
        "deus ex", "tomb raider", "far cry", "watch dogs", "division",
        "rainbow six", "ghost recon", "splinter cell", "prince of persia",
        "anno", "cities skylines", "civilization", "total war", "age of empires",
        "starcraft", "warcraft", "diablo", "overwatch", "hearthstone",
        "counter-strike", "half-life", "portal", "left 4 dead", "team fortress",
        "dota", "steam", "origin", "uplay", "epic", "gog"
    ];
    
    // Path indicators
    let path_keywords = vec![
        "games", "steam", "steamapps", "common", "origin games", "uplay",
        "epic games", "gog galaxy", "battle.net"
    ];
    
    // Check name
    for keyword in &game_keywords {
        if name_lower.contains(keyword) {
            return true;
        }
    }
    
    // Check path
    for keyword in &path_keywords {
        if path_lower.contains(keyword) {
            return true;
        }
    }
    
    false
}

fn find_game_executable(game_path: &str) -> Option<String> {
    let path = Path::new(game_path);
    if !path.exists() {
        return None;
    }
    
    // Common executable extensions
    let exe_extensions = vec!["exe", "bat", "cmd"];
    
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.filter_map(Result::ok) {
            let entry_path = entry.path();
            if entry_path.is_file() {
                if let Some(extension) = entry_path.extension() {
                    if exe_extensions.contains(&extension.to_string_lossy().to_lowercase().as_str()) {
                        return Some(entry_path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    
    None
}

fn check_mod_support(game_name: &str, game_path: &str) -> bool {
    let name_lower = game_name.to_lowercase();
    let path = Path::new(game_path);
    
    // Games known to support mods
    let mod_supported_games = vec![
        "skyrim", "fallout", "minecraft", "gta", "grand theft auto",
        "witcher", "cyberpunk", "elder scrolls", "cities skylines",
        "civilization", "total war", "kerbal space program",
        "rimworld", "factorio", "terraria", "stardew valley"
    ];
    
    // Check if game name indicates mod support
    for supported_game in &mod_supported_games {
        if name_lower.contains(supported_game) {
            return true;
        }
    }
    
    // Check for common mod directories
    let mod_dirs = vec!["mods", "Mods", "Data", "scripts", "plugins"];
    for mod_dir in mod_dirs {
        if path.join(mod_dir).exists() {
            return true;
        }
    }
    
    false
}

#[tauri::command]
fn install_mod(mod_name: String, game_name: String, game_path: String) -> Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or("Failed to get executable directory")?;
    
    // Get mod source path
    let mod_source_path = exe_dir
        .join("games")
        .join(sanitize_folder_name(&game_name))
        .join("patch")
        .join(&mod_name);
    
    if !mod_source_path.exists() {
        return Err(format!("模组文件夹不存在: {}", mod_name));
    }
    
    // Create timestamp for backup
    let timestamp = Local::now().format("%Y年%m月%d日_%H时%M分%S秒").to_string();
    
    // Create backup folder
    let backup_base = exe_dir
        .join("games")
        .join(sanitize_folder_name(&game_name))
        .join("backup")
        .join(&timestamp);
    
    fs::create_dir_all(&backup_base)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    
    // Install log entries
    let mut log_entries = Vec::new();
    let mut backed_up_files = Vec::new();
    
    // Copy mod files to game directory (excluding readme.md)
    copy_mod_files(&mod_source_path, &PathBuf::from(&game_path), &backup_base, &mut log_entries, &mut backed_up_files)?;
    
    // Create install log
    create_install_log(&exe_dir, &game_name, &mod_name, &timestamp, &log_entries)?;
    
    Ok(format!("成功安装模组: {} (备份时间戳: {})", mod_name, timestamp))
}

#[tauri::command]
fn uninstall_mod(mod_name: String, game_name: Option<String>) -> Result<String, String> {
    // TODO: Implement actual mod uninstallation logic
    // This is a placeholder implementation
    println!("Uninstalling mod: {} for game: {:?}", mod_name, game_name);
    
    // Simulate uninstallation process
    std::thread::sleep(std::time::Duration::from_millis(800));
    
    Ok(format!("Successfully uninstalled mod: {}", mod_name))
}

#[tauri::command]
fn get_mod_files(mod_name: String, game_name: Option<String>) -> Result<Vec<String>, String> {
    // TODO: Implement actual file listing logic
    // This is a placeholder implementation
    println!("Getting files for mod: {} in game: {:?}", mod_name, game_name);
    
    // Simulate file listing
    let mock_files = vec![
        format!("{}/main.dll", mod_name),
        format!("{}/config.ini", mod_name),
        format!("{}/readme.txt", mod_name),
        format!("{}/assets/texture1.dds", mod_name),
        format!("{}/assets/texture2.dds", mod_name),
    ];
    
    Ok(mock_files)
}

fn create_game_folder(game_name: &str) -> Result<(), String> {
    // Get current executable directory
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or("Failed to get executable directory")?;
    
    // Create games folder structure: /games/{game_name}/patch and /games/{game_name}/backup
    let games_base = exe_dir.join("games");
    let game_folder = games_base.join(sanitize_folder_name(game_name));
    let patch_folder = game_folder.join("patch");
    let backup_folder = game_folder.join("backup");
    
    // Create directories if they don't exist
    if !games_base.exists() {
        fs::create_dir_all(&games_base)
            .map_err(|e| format!("Failed to create games directory: {}", e))?;
    }
    
    if !game_folder.exists() {
        fs::create_dir_all(&game_folder)
            .map_err(|e| format!("Failed to create game directory: {}", e))?;
    }
    
    if !patch_folder.exists() {
        fs::create_dir_all(&patch_folder)
            .map_err(|e| format!("Failed to create patch directory: {}", e))?;
        
        // Create a readme file in the patch folder
        let readme_path = patch_folder.join("README.txt");
        let readme_content = format!(
            "模组文件夹: {}\n\n这个文件夹用于存放 {} 游戏的模组文件。\n每个子文件夹代表一个模组，将在应用界面中显示为可用模组选项。\n\n创建时间: {}\n",
            game_name,
            game_name,
            Local::now().format("%Y年%m月%d日 %H时%M分%S秒")
        );
        
        fs::write(&readme_path, readme_content)
            .map_err(|e| format!("Failed to create README file: {}", e))?;
    }
    
    if !backup_folder.exists() {
        fs::create_dir_all(&backup_folder)
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;
        
        // Create a readme file in the backup folder
        let backup_readme_path = backup_folder.join("README.txt");
        let backup_readme_content = format!(
            "备份文件夹: {}\n\n这个文件夹用于存放 {} 游戏的文件备份。\n每个子文件夹按安装时间戳命名，包含被替换的原始文件。\n\n创建时间: {}\n",
            game_name,
            game_name,
            Local::now().format("%Y年%m月%d日 %H时%M分%S秒")
        );
        
        fs::write(&backup_readme_path, backup_readme_content)
            .map_err(|e| format!("Failed to create backup README file: {}", e))?;
    }
    
    println!("Created game folder structure for: {}", game_name);
    Ok(())
}

fn sanitize_folder_name(name: &str) -> String {
    // Remove or replace invalid characters for folder names
    name.chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

#[tauri::command]
fn get_patch_folders() -> Result<Vec<PatchFolderInfo>, String> {
    let mut patch_folders = Vec::new();
    
    // Get current executable directory
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or("Failed to get executable directory")?;
    
    let games_base = exe_dir.join("games");
    
    if !games_base.exists() {
        return Ok(patch_folders);
    }
    
    // Scan games directory for game folders
    match fs::read_dir(&games_base) {
        Ok(entries) => {
            for entry in entries.filter_map(Result::ok) {
                let game_path = entry.path();
                if game_path.is_dir() {
                    if let Some(folder_name) = game_path.file_name() {
                        if let Some(folder_name_str) = folder_name.to_str() {
                            let patch_path = game_path.join("patch");
                            
                            if patch_path.exists() {
                                // Count files in the patch folder
                                let file_count = count_files_in_directory(&patch_path);
                                
                                // Get creation time
                                let created_time = get_folder_creation_time(&patch_path);
                                
                                patch_folders.push(PatchFolderInfo {
                                    name: folder_name_str.to_string(),
                                    path: patch_path.to_string_lossy().to_string(),
                                    game_name: folder_name_str.to_string(),
                                    file_count,
                                    created_time,
                                });
                            }
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("Failed to read games directory: {}", e)),
    }
    
    // Sort by name
    patch_folders.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(patch_folders)
}

fn count_files_in_directory(dir: &Path) -> usize {
    let mut count = 0;
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_file() {
                count += 1;
            } else if path.is_dir() {
                count += count_files_in_directory(&path);
            }
        }
    }
    count
}

fn get_folder_creation_time(path: &Path) -> Option<String> {
    if let Ok(metadata) = fs::metadata(path) {
        if let Ok(created) = metadata.created() {
            if let Ok(datetime) = created.duration_since(std::time::UNIX_EPOCH) {
                // Use a simpler approach to avoid deprecated functions
                let timestamp = datetime.as_secs();
                let dt = chrono::DateTime::from_timestamp(timestamp as i64, 0)?;
                return Some(dt.format("%Y-%m-%d %H:%M:%S").to_string());
            }
        }
    }
    None
}

fn copy_mod_files(
    mod_source: &Path,
    game_path: &Path,
    backup_path: &Path,
    log_entries: &mut Vec<InstallLogEntry>,
    backed_up_files: &mut Vec<String>,
) -> Result<(), String> {
    if !mod_source.exists() {
        return Err("模组源文件夹不存在".to_string());
    }
    
    copy_directory_recursive(mod_source, game_path, backup_path, log_entries, backed_up_files, "")?;
    Ok(())
}

fn copy_directory_recursive(
    source: &Path,
    dest_base: &Path,
    backup_base: &Path,
    log_entries: &mut Vec<InstallLogEntry>,
    backed_up_files: &mut Vec<String>,
    relative_path: &str,
) -> Result<(), String> {
    let entries = fs::read_dir(source)
        .map_err(|e| format!("Failed to read directory {}: {}", source.display(), e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let entry_path = entry.path();
        let file_name = entry_path.file_name()
            .ok_or("Failed to get file name")?
            .to_string_lossy();
        
        // Skip readme.md files
        if file_name.to_lowercase() == "readme.md" {
            continue;
        }
        
        let current_relative = if relative_path.is_empty() {
            file_name.to_string()
        } else {
            format!("{}/{}", relative_path, file_name)
        };
        
        let dest_path = dest_base.join(&current_relative);
        
        if entry_path.is_dir() {
            // Create directory if it doesn't exist
            if !dest_path.exists() {
                fs::create_dir_all(&dest_path)
                    .map_err(|e| format!("Failed to create directory {}: {}", dest_path.display(), e))?;
            }
            
            // Recursively copy directory contents
            copy_directory_recursive(&entry_path, dest_base, backup_base, log_entries, backed_up_files, &current_relative)?;
        } else {
            // Handle file copy
            let operation_type = if dest_path.exists() {
                // Backup existing file
                let backup_file_path = backup_base.join(&current_relative);
                if let Some(backup_parent) = backup_file_path.parent() {
                    fs::create_dir_all(backup_parent)
                        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
                }
                
                fs::copy(&dest_path, &backup_file_path)
                    .map_err(|e| format!("Failed to backup file {}: {}", dest_path.display(), e))?;
                
                backed_up_files.push(current_relative.clone());
                "修改"
            } else {
                // Create parent directory if needed
                if let Some(parent) = dest_path.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|e| format!("Failed to create parent directory: {}", e))?;
                }
                "新增"
            };
            
            // Copy mod file to game directory
            fs::copy(&entry_path, &dest_path)
                .map_err(|e| format!("Failed to copy file {} to {}: {}", entry_path.display(), dest_path.display(), e))?;
            
            // Add to log
            log_entries.push(InstallLogEntry {
                timestamp: Local::now().format("%Y年%m月%d日 %H时%M分%S秒").to_string(),
                mod_name: "".to_string(), // Will be filled by caller
                operation_type: operation_type.to_string(),
                file_path: current_relative,
            });
        }
    }
    
    Ok(())
}

fn create_install_log(
    exe_dir: &Path,
    game_name: &str,
    mod_name: &str,
    timestamp: &str,
    log_entries: &[InstallLogEntry],
) -> Result<(), String> {
    let log_path = exe_dir
        .join("games")
        .join(sanitize_folder_name(game_name))
        .join("backup")
        .join(timestamp)
        .join("install.log");
    
    let mut log_content = String::new();
    log_content.push_str(&format!("模组安装日志\n"));
    log_content.push_str(&format!("==================\n"));
    log_content.push_str(&format!("游戏名称: {}\n", game_name));
    log_content.push_str(&format!("模组名称: {}\n", mod_name));
    log_content.push_str(&format!("安装时间: {}\n", timestamp));
    log_content.push_str(&format!("==================\n\n"));
    
    for entry in log_entries {
        log_content.push_str(&format!("操作时间: {}\n", entry.timestamp));
        log_content.push_str(&format!("操作类型: {}\n", entry.operation_type));
        log_content.push_str(&format!("文件路径: {}\n", entry.file_path));
        log_content.push_str("------------------\n");
    }
    
    fs::write(&log_path, log_content)
        .map_err(|e| format!("Failed to create install log: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
fn get_available_mods(game_name: String) -> Result<Vec<ModInfo>, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or("Failed to get executable directory")?;
    
    let patch_path = exe_dir
        .join("games")
        .join(sanitize_folder_name(&game_name))
        .join("patch");
    
    if !patch_path.exists() {
        return Ok(Vec::new());
    }
    
    let mut mods = Vec::new();
    
    match fs::read_dir(&patch_path) {
        Ok(entries) => {
            for entry in entries.filter_map(Result::ok) {
                let mod_path = entry.path();
                if mod_path.is_dir() {
                    if let Some(mod_name) = mod_path.file_name() {
                        if let Some(mod_name_str) = mod_name.to_str() {
                            // Skip README files and system folders
                            if mod_name_str.to_uppercase() == "README.TXT" {
                                continue;
                            }
                            
                            let mod_info = ModInfo {
                                name: mod_name_str.to_string(),
                                path: mod_path.to_string_lossy().to_string(),
                                game: game_name.clone(),
                                version: extract_version_from_path(&mod_path),
                                description: extract_description_from_path(&mod_path),
                            };
                            mods.push(mod_info);
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("Failed to read patch directory: {}", e)),
    }
    
    // Sort by name
    mods.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(mods)
}

#[tauri::command]
fn get_backup_list(game_name: String) -> Result<Vec<BackupInfo>, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or("Failed to get executable directory")?;
    
    let backup_path = exe_dir
        .join("games")
        .join(sanitize_folder_name(&game_name))
        .join("backup");
    
    if !backup_path.exists() {
        return Ok(Vec::new());
    }
    
    let mut backups = Vec::new();
    
    match fs::read_dir(&backup_path) {
        Ok(entries) => {
            for entry in entries.filter_map(Result::ok) {
                let backup_dir = entry.path();
                if backup_dir.is_dir() {
                    if let Some(timestamp) = backup_dir.file_name() {
                        if let Some(timestamp_str) = timestamp.to_str() {
                            // Skip README files
                            if timestamp_str.to_uppercase() == "README.TXT" {
                                continue;
                            }
                            
                            // Read install log to get mod name and files
                            let log_path = backup_dir.join("install.log");
                            let (mod_name, files) = if log_path.exists() {
                                read_install_log(&log_path)?
                            } else {
                                ("未知模组".to_string(), Vec::new())
                            };
                            
                            let backup_info = BackupInfo {
                                timestamp: timestamp_str.to_string(),
                                mod_name,
                                files,
                                backup_path: backup_dir.to_string_lossy().to_string(),
                            };
                            backups.push(backup_info);
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("Failed to read backup directory: {}", e)),
    }
    
    // Sort by timestamp (newest first)
    backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    Ok(backups)
}

#[tauri::command]
fn restore_from_backup(game_name: String, timestamp: String, game_path: String) -> Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or("Failed to get executable directory")?;
    
    let backup_dir = exe_dir
        .join("games")
        .join(sanitize_folder_name(&game_name))
        .join("backup")
        .join(&timestamp);
    
    if !backup_dir.exists() {
        return Err(format!("备份文件夹不存在: {}", timestamp));
    }
    
    // Read install log to get list of files that were modified
    let log_path = backup_dir.join("install.log");
    if !log_path.exists() {
        return Err("安装日志文件不存在".to_string());
    }
    
    let (mod_name, files) = read_install_log(&log_path)?;
    
    // Restore files from backup
    restore_files_from_backup(&backup_dir, &PathBuf::from(&game_path), &files)?;
    
    Ok(format!("成功恢复游戏状态 (模组: {}, 时间戳: {})", mod_name, timestamp))
}

fn read_install_log(log_path: &Path) -> Result<(String, Vec<String>), String> {
    let log_content = fs::read_to_string(log_path)
        .map_err(|e| format!("Failed to read install log: {}", e))?;
    
    let mut mod_name = "未知模组".to_string();
    let mut files = Vec::new();
    
    for line in log_content.lines() {
        if line.starts_with("模组名称: ") {
            mod_name = line.replace("模组名称: ", "");
        } else if line.starts_with("文件路径: ") {
            let file_path = line.replace("文件路径: ", "");
            files.push(file_path);
        }
    }
    
    Ok((mod_name, files))
}

fn restore_files_from_backup(backup_dir: &Path, game_path: &Path, files: &[String]) -> Result<(), String> {
    for file_path in files {
        let backup_file = backup_dir.join(file_path);
        let game_file = game_path.join(file_path);
        
        if backup_file.exists() {
            // Restore backed up file
            if let Some(parent) = game_file.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
            
            fs::copy(&backup_file, &game_file)
                .map_err(|e| format!("Failed to restore file {}: {}", file_path, e))?;
        } else {
            // File was newly added by mod, so delete it
            if game_file.exists() {
                fs::remove_file(&game_file)
                    .map_err(|e| format!("Failed to remove file {}: {}", file_path, e))?;
            }
        }
    }
    
    Ok(())
}

#[tauri::command]
fn update_game_path(game_name: String, new_path: String) -> Result<(), String> {
    // Get current executable directory
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or("Failed to get executable directory")?;
    
    // Create config file path
    let config_path = exe_dir.join("games_config.json");
    
    // Read existing config or create new one
    let mut games_config: HashMap<String, String> = if config_path.exists() {
        let config_content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;
        serde_json::from_str(&config_content)
            .map_err(|e| format!("Failed to parse config file: {}", e))?
    } else {
        HashMap::new()
    };
    
    // Update game path
    games_config.insert(game_name.clone(), new_path.clone());
    
    // Write updated config back to file
    let config_content = serde_json::to_string_pretty(&games_config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    fs::write(&config_path, config_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;
    
    // Also update the game info in memory for immediate use
    println!("Updated path for {}: {}", game_name, new_path);
    
    Ok(())
}

#[tauri::command]
fn get_mod_counts(game_name: String) -> Result<(usize, usize), String> {
    // Get available mods count
    let available_mods = get_available_mods(game_name.clone())?;
    let available_count = available_mods.len();
    
    // Get backup count (installed mods count)
    let backups = get_backup_list(game_name)?;
    let installed_count = backups.len();
    
    Ok((available_count, installed_count))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            scan_mods,
            scan_installed_games,
            install_mod,
            uninstall_mod,
            get_mod_files,
            get_patch_folders,
            get_available_mods,
            get_backup_list,
            restore_from_backup,
            open_folder,
            update_game_path,
            get_mod_counts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
