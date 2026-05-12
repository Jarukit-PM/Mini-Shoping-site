package httpx

import (
	"encoding/json"
	"net/http"
)

// ErrorBody matches the API error envelope (Section 5 of implementation-plan.md).
type ErrorBody struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// ErrorEnvelope is the top-level JSON shape for errors.
type ErrorEnvelope struct {
	Error ErrorBody `json:"error"`
}

// WriteError writes a JSON error response with the given HTTP status.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteErrorFields(w, status, code, message, nil)
}

// WriteErrorFields includes optional field-level validation messages.
func WriteErrorFields(w http.ResponseWriter, status int, code, message string, fields map[string]string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorEnvelope{
		Error: ErrorBody{Code: code, Message: message, Fields: fields},
	})
}

// WriteJSON writes a JSON body with the given HTTP status.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
