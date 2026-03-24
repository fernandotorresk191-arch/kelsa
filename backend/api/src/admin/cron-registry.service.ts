import { Injectable } from '@nestjs/common';

export interface CronJobLog {
  name: string;
  description: string;
  schedule: string;
  lastRun: Date | null;
  lastStatus: 'success' | 'error' | 'never';
  lastMessage: string | null;
  lastDuration: number | null; // ms
}

@Injectable()
export class CronRegistryService {
  private jobs = new Map<string, CronJobLog>();

  register(name: string, description: string, schedule: string) {
    this.jobs.set(name, {
      name,
      description,
      schedule,
      lastRun: null,
      lastStatus: 'never',
      lastMessage: null,
      lastDuration: null,
    });
  }

  logSuccess(name: string, message: string, durationMs: number) {
    const job = this.jobs.get(name);
    if (job) {
      job.lastRun = new Date();
      job.lastStatus = 'success';
      job.lastMessage = message;
      job.lastDuration = durationMs;
    }
  }

  logError(name: string, message: string, durationMs: number) {
    const job = this.jobs.get(name);
    if (job) {
      job.lastRun = new Date();
      job.lastStatus = 'error';
      job.lastMessage = message;
      job.lastDuration = durationMs;
    }
  }

  getAll(): CronJobLog[] {
    return Array.from(this.jobs.values());
  }
}
