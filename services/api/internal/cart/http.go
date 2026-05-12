package cart

import (
	"encoding/json"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string, details any) {
	env := map[string]any{"error": map[string]any{"code": code, "message": message}}
	if details != nil {
		env["error"].(map[string]any)["details"] = details
	}
	writeJSON(w, status, env)
}
