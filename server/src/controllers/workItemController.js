import { workItemService } from '../services/workItemService.js';

export async function listWorkItems(req, res, next) {
  try {
    const result = await workItemService.listWorkItems(req.query, req.user);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getWorkItem(req, res, next) {
  try {
    const item = await workItemService.getWorkItemById(req.params.id, req.user);
    return res.json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function createWorkItem(req, res, next) {
  try {
    const item = await workItemService.createWorkItem(req.body, req.user);
    return res.status(201).json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkItem(req, res, next) {
  try {
    const simulateFailure = req.headers['x-simulate-tx-failure'] === 'true';
    const item = await workItemService.updateWorkItem(req.params.id, req.body, req.user, { simulateFailure });
    return res.json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function claimWorkItem(req, res, next) {
  try {
    const item = await workItemService.claimWorkItem(req.params.id, req.user);
    return res.json({ data: item, message: 'Work item successfully claimed' });
  } catch (err) {
    next(err);
  }
}

export async function assignWorkItem(req, res, next) {
  try {
    const item = await workItemService.assignWorkItem(req.params.id, req.body, req.user);
    return res.json({ data: item, message: 'Work item successfully assigned' });
  } catch (err) {
    next(err);
  }
}

export async function transitionWorkItem(req, res, next) {
  try {
    const item = await workItemService.transitionWorkItem(req.params.id, req.body, req.user);
    return res.json({ data: item, message: 'Status successfully updated' });
  } catch (err) {
    next(err);
  }
}

export async function decideApproval(req, res, next) {
  try {
    const item = await workItemService.decideApproval(req.params.id, req.body, req.user);
    return res.json({ data: item, message: 'Approval decision recorded' });
  } catch (err) {
    next(err);
  }
}

export async function getActivityTimeline(req, res, next) {
  try {
    const result = await workItemService.getActivityTimeline(req.params.id, req.query, req.user);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    const activity = await workItemService.addComment(req.params.id, req.body.comment, req.user);
    return res.status(201).json({ data: activity, message: 'Note added to activity timeline' });
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkItem(req, res, next) {
  try {
    const result = await workItemService.deleteWorkItem(req.params.id, req.user);
    return res.json({ message: `Work item ${result.reference} deleted successfully` });
  } catch (err) {
    next(err);
  }
}

