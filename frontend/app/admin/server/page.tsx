'use client';

import { useEffect, useState } from 'react';
import { adminServerApi, ServerInfo } from '@/features/admin/api';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}д`);
  if (h > 0) parts.push(`${h}ч`);
  parts.push(`${m}м`);
  return parts.join(' ');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function ServerPage() {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminServerApi.getInfo();
      setInfo(data);
    } catch {
      setError('Не удалось загрузить информацию о сервере');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="admin-spinner" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="text-red-500 mb-4">{error || 'Нет данных'}</p>
        <button onClick={load} className="admin-btn-primary px-4 py-2 rounded-lg">
          Повторить
        </button>
      </div>
    );
  }

  const diskPercent = info.disk?.usagePercent ?? 0;
  const diskColor = diskPercent > 90 ? 'bg-red-500' : diskPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500';
  const totalUploadsSize = info.uploads.reduce((sum, u) => sum + u.sizeBytes, 0);
  const totalUploadsFiles = info.uploads.reduce((sum, u) => sum + u.files, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Сервер</h1>
          <p className="text-sm text-slate-500 mt-1">Мониторинг, задачи и диск</p>
        </div>
        <button onClick={load} className="admin-btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Обновить
        </button>
      </div>

      {/* Process info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="admin-kpi-card" style={{ borderTopColor: 'var(--admin-primary)' }}>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Аптайм</div>
          <div className="text-2xl font-bold text-slate-800">{formatUptime(info.process.uptime)}</div>
        </div>
        <div className="admin-kpi-card" style={{ borderTopColor: 'var(--admin-accent)' }}>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Память (heap)</div>
          <div className="text-2xl font-bold text-slate-800">{formatBytes(info.process.memoryUsage.heapUsed)}</div>
          <div className="text-xs text-slate-400">из {formatBytes(info.process.memoryUsage.heapTotal)}</div>
        </div>
        <div className="admin-kpi-card" style={{ borderTopColor: 'var(--admin-success)' }}>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Node.js</div>
          <div className="text-2xl font-bold text-slate-800">{info.process.nodeVersion}</div>
        </div>
        <div className="admin-kpi-card" style={{ borderTopColor: 'var(--admin-warning)' }}>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Файлы в uploads</div>
          <div className="text-2xl font-bold text-slate-800">{totalUploadsFiles}</div>
          <div className="text-xs text-slate-400">{formatBytes(totalUploadsSize)}</div>
        </div>
      </div>

      {/* Disk usage */}
      {info.disk && (
        <div className="admin-card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Диск</h2>
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">Использовано: {formatBytes(info.disk.used)} из {formatBytes(info.disk.total)}</span>
              <span className="font-semibold text-slate-800">{info.disk.usagePercent}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${diskColor}`} style={{ width: `${diskPercent}%` }} />
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Свободно: {formatBytes(info.disk.available)}
            </div>
          </div>

          {/* Uploads breakdown */}
          <h3 className="text-sm font-semibold text-slate-700 mt-5 mb-3">Папки uploads</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {info.uploads.map((dir) => (
              <div key={dir.name} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="font-medium text-slate-700 text-sm">{dir.name}</span>
                </div>
                <div className="text-lg font-bold text-slate-800">{dir.files} <span className="text-xs font-normal text-slate-400">файлов</span></div>
                <div className="text-xs text-slate-500">{formatBytes(dir.sizeBytes)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cron jobs */}
      <div className="admin-card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Фоновые задачи (Cron)</h2>
        {info.cronJobs.length === 0 ? (
          <p className="text-slate-500 text-sm">Нет зарегистрированных задач</p>
        ) : (
          <div className="space-y-4">
            {info.cronJobs.map((job) => (
              <div key={job.name} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">{job.name}</span>
                      {job.lastStatus === 'success' && (
                        <span className="admin-badge admin-badge-success text-xs">Успешно</span>
                      )}
                      {job.lastStatus === 'error' && (
                        <span className="admin-badge admin-badge-danger text-xs">Ошибка</span>
                      )}
                      {job.lastStatus === 'never' && (
                        <span className="admin-badge text-xs bg-slate-100 text-slate-500">Не запускалась</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{job.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>📅 {job.schedule}</span>
                      {job.lastRun && <span>🕐 {formatDate(job.lastRun)}</span>}
                      {job.lastDuration !== null && <span>⏱ {job.lastDuration}мс</span>}
                    </div>
                  </div>
                </div>
                {job.lastMessage && (
                  <div className={`mt-3 text-sm px-3 py-2 rounded-md ${
                    job.lastStatus === 'error' 
                      ? 'bg-red-50 text-red-700 border border-red-100' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    {job.lastMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
