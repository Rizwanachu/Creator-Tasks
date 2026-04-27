type RequestInitWithBody = RequestInit & { data?: any };

export async function apiFetch<T = any>(
  url: string,
  options: RequestInitWithBody = {},
  getToken?: () => Promise<string | null>
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  if (getToken) {
    const token = await getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const { data, ...initOptions } = options;

  const res = await fetch(url, {
    ...initOptions,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    let errorMessage = res.statusText;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error) errorMessage = parsed.error;
      else if (parsed.message) errorMessage = parsed.message;
    } catch (e) {
      // Ignored
    }
    throw new Error(errorMessage || `API request failed with status ${res.status}`);
  }

  // Handle empty responses
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T;
  }

  return res.json();
}
