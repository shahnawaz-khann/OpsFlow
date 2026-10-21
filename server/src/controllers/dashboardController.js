import { dashboardService } from '../services/dashboardService.js';

export async function getDashboardSummary(req, res, next) {
  try {
    const summary = await dashboardService.getSummary(req.user);
    return res.json(summary);
  } catch (err) {
    next(err);
  }
}
