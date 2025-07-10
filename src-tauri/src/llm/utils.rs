use serde_json;

pub fn repair_json(json_str: &str) -> Option<serde_json::Value> {
    // First try parsing as-is
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str) {
        return Some(parsed);
    }
    
    // If that fails, try to repair common streaming issues
    let mut repaired = json_str.to_string();
    
    if repaired.starts_with('{') && repaired.ends_with('}') {
        // Remove outer braces temporarily
        let inner = &repaired[1..repaired.len()-1];
        
        // Split by commas to get key-value pairs
        let pairs: Vec<&str> = inner.split(',').collect();
        let mut fixed_pairs = Vec::new();
        
        for pair in pairs {
            if let Some(colon_pos) = pair.find(':') {
                let key = pair[..colon_pos].trim();
                let value = pair[colon_pos+1..].trim();
                
                // Ensure key is quoted
                let quoted_key = if key.starts_with('"') && key.ends_with('"') {
                    key.to_string()
                } else {
                    format!("\"{}\"", key.trim_matches('"'))
                };
                
                // Ensure value is quoted
                let quoted_value = if value.starts_with('"') && value.ends_with('"') {
                    value.to_string()
                } else {
                    format!("\"{}\"", value.trim_matches('"'))
                };
                
                fixed_pairs.push(format!("{}:{}", quoted_key, quoted_value));
            }
        }
        
        // Reconstruct the JSON
        repaired = format!("{{{}}}", fixed_pairs.join(","));
    }
    
    // Try parsing the repaired JSON
    serde_json::from_str::<serde_json::Value>(&repaired).ok()
}