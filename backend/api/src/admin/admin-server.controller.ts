import {
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { Roles } from './roles.decorator';
import { CronRegistryService } from './cron-registry.service';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

@Controller('v1/admin/server')
@UseGuards(AdminGuard)
@Roles('superadmin', 'admin')
export class AdminServerController {
  constructor(private cronRegistry: CronRegistryService) {}

  @Get('info')
  async getServerInfo(@Req() req: any) {

    const disk = this.getDiskUsage();
    const uploadsStats = this.getUploadsStats();
    const cronJobs = this.cronRegistry.getAll();
    const uptime = process.uptime();

    return {
      disk,
      uploads: uploadsStats,
      cronJobs,
      process: {
        uptime: Math.floor(uptime),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      },
    };
  }

  private getDiskUsage() {
    try {
      const output = execSync("df -B1 / | tail -1", {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();

      const parts = output.split(/\s+/);
      // df -B1 output: Filesystem 1B-blocks Used Available Use% Mounted
      const total = parseInt(parts[1]) || 0;
      const used = parseInt(parts[2]) || 0;
      const available = parseInt(parts[3]) || 0;
      const usagePercent = parts[4] ? parseInt(parts[4]) : 0;

      return { total, used, available, usagePercent };
    } catch {
      return null;
    }
  }

  private getUploadsStats() {
    const uploadsDir = join(process.cwd(), 'uploads');
    const dirs = ['categories', 'products', 'promotions', 'chat'];
    const stats: { name: string; files: number; sizeBytes: number }[] = [];

    for (const dir of dirs) {
      const dirPath = join(uploadsDir, dir);
      try {
        const files = readdirSync(dirPath);
        let totalSize = 0;
        for (const file of files) {
          try {
            const fileStat = statSync(join(dirPath, file));
            if (fileStat.isFile()) totalSize += fileStat.size;
          } catch { /* skip */ }
        }
        stats.push({ name: dir, files: files.length, sizeBytes: totalSize });
      } catch {
        stats.push({ name: dir, files: 0, sizeBytes: 0 });
      }
    }

    return stats;
  }
}
