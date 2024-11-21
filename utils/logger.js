import fs from 'fs';
import path from 'path';

class Logger {
    constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    async log(level, message, error = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...(error && {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                }
            })
        };

        const logFile = path.join(this.logDir, `${level}-${new Date().toISOString().split('T')[0]}.log`);
        await fs.promises.appendFile(logFile, JSON.stringify(logEntry) + '\n');
        
        if (level === 'error') {
            console.error(`[${timestamp}] ${message}`, error);
        } else {
            console.log(`[${timestamp}] ${message}`);
        }
    }
}

export const logger = new Logger();