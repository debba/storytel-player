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
      let errorData: any = {};
      try { errorData = response.json(); } catch {}
      // Return a plain object instead of throwing so that the statusCode
      // survives the Electron IPC structured-clone boundary (custom Error
      // properties are stripped when crossing main→renderer).
      return {
        __isError: true,
        statusCode: response.statusCode,
        error: errorData?.error || `Request failed with status code ${response.statusCode}`,
        data: errorData,
      };
    }

    return {
      data: response.json(),
    };
  }

  getServer(): any | null {
    return this.server;
  }
}
