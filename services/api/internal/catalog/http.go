package catalog

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func atoiOr(s string, d int) int {
	if s == "" {
		return d
	}
	if v, err := strconv.Atoi(s); err == nil {
		return v
	}
	return d
}

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
