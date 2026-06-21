import { Request, Response } from 'express';
import { getHealthChecker } from '../../infrastructure/health/HealthChecker';

export async function getSystemStatus(_req: Request, res: Response): Promise<void> {
  const healthChecker = getHealthChecker();
  const lastStatus = healthChecker.getLastStatus();

  // If no status yet, run a check now
  if (!lastStatus) {
    const status = await healthChecker.check();
    res.json(status);
    return;
  }

  // Return cached status (updated every 60s)
  res.json(lastStatus);
}

export async function forceHealthCheck(_req: Request, res: Response): Promise<void> {
  const healthChecker = getHealthChecker();
  const status = await healthChecker.check();
  res.json(status);
}
