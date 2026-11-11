const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function csrfToken() {
  const response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Could not prepare a secure sign-in request.");
  const data = await response.json();
  return data.csrfToken;
}

export async function authRequest(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { "X-CSRFToken": token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.detail || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return result;
}
