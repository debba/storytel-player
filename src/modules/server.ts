import * as path from 'path';

export class ServerManager {
  private server: any | null = null;

  async initialize(): Promise<void> {
    const serverPath = path.join(__dirname, '../../../server/dist/server.js');
    const { default: server } = await import(serverPath);
    this.server = server;
  }

  async injectRequest(
    method: string,
    url: string,
    payload?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const response = await this.server.inject({
      method,
      url,
      payload,
      headers: headers || {},
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error('Request failed with status code ' + response.status);
    }

    return {
      data: response.json(),
    };
  }

  getServer(): any | null {
    return this.server;
  }
}
