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
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_FILES = 5;
  private readonly LOG_DIR = process.env.USER_DATA_PATH || process.cwd();
  private readonly LOG_FILE_PATH = path.join(process.env.USER_DATA_PATH || process.cwd(), 'app.log');

  constructor() {
    this.loadFromFile();
  }

  private getArchivedFilePath(index: number): string {
    return path.join(this.LOG_DIR, `app.${index}.log`);
  }

  private rotate() {
    // Delete the oldest file (index MAX_FILES - 1) if it exists
    const oldest = this.getArchivedFilePath(this.MAX_FILES - 1);
    if (fs.existsSync(oldest)) {
      fs.unlinkSync(oldest);
    }

    // Shift existing archived files: app.3.log → app.4.log, ..., app.1.log → app.2.log
    for (let i = this.MAX_FILES - 2; i >= 1; i--) {
      const src = this.getArchivedFilePath(i);
      const dest = this.getArchivedFilePath(i + 1);
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
      }
    }

    // Rename current app.log → app.1.log
    if (fs.existsSync(this.LOG_FILE_PATH)) {
      fs.renameSync(this.LOG_FILE_PATH, this.getArchivedFilePath(1));
    }

    // Clear in-memory logs so the new file starts fresh
    this.logs = [];
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

      // Rotate if file exceeds max size
      const stat = fs.statSync(this.LOG_FILE_PATH);
      if (stat.size > this.MAX_FILE_SIZE) {
        this.rotate();
        fs.writeFileSync(this.LOG_FILE_PATH, JSON.stringify(this.logs, null, 2));
      }
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
