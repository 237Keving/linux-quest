export class ApiService {
  async request(path, payload) {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 10000);
    try {
      const response = await fetch(`/api/${path}`, {
        method: payload === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin', signal: abort.signal,
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.error || 'Não foi possível concluir a solicitação.');
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.status) throw error;
      throw new Error('Não foi possível conectar ao servidor. Verifique se o Flask está aberto e tente novamente.');
    } finally { clearTimeout(timeout); }
  }
}
