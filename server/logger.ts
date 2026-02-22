import fs from 'fs';
import path from 'path';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'http_request' | 'http_response' | 'error' | 'action';
  message: string;
  method?: string;
  url?: string;
  status?: number;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;
  private readonly LOG_FILE_PATH = path.join(process.env.USER_DATA_PATH || process.cwd(), 'app.log');

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(this.LOG_FILE_PATH)) {
        const fileContent = fs.readFileSync(this.LOG_FILE_PATH, 'utf8');
        if (fileContent) {
          this.logs = JSON.parse(fileContent);
        }
      }
    } catch (e) {
      console.error('Failed to load logs from file', e);
    }
  }

  private saveToFile() {
    try {
      fs.writeFileSync(this.LOG_FILE_PATH, JSON.stringify(this.logs, null, 2));
    } catch (e) {
      console.error('Failed to save logs to file', e);
    }
  }

  private generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  add(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const log: LogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString()
    };
    
    this.logs.unshift(log);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }
    
    // Save to file on every new log asynchronously
    setImmediate(() => this.saveToFile());
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.saveToFile();
  }
}

export const appLogger = new Logger();
