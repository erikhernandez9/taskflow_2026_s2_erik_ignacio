import { NextFunction, Request, Response } from 'express';
import { db } from '../../lib/db';
import { notFound } from '../../lib/http';
import { parsePublicId, toPublicId } from '../../lib/ids';
import * as repo from './tasks.repository';
import * as service from './tasks.service';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseListFilters(req: Request): repo.TaskFilters {
  const assignedTo = req.query.assignedTo
    ? parsePublicId(String(req.query.assignedTo), 'user') ?? undefined
    : undefined;

  return {
    status: req.query.status ? String(req.query.status) : undefined,
    priority: req.query.priority ? String(req.query.priority) : undefined,
    assigneeId: assignedTo,
    search: req.query.search ? String(req.query.search) : undefined,
  };
}

async function loadTaskExtras(rows: service.TaskRow[]) {
  const taskIds = rows.map((row) => row.id);
  const assigneeIds = [...new Set(rows.map((row) => row.assigneeId).filter((id): id is number => id !== null))];

  const [assignees, commentGroups] = await Promise.all([
    assigneeIds.length
      ? db.user.findMany({ where: { id: { in: assigneeIds } } })
      : Promise.resolve([]),
    taskIds.length
      ? db.comment.groupBy({ by: ['taskId'], where: { taskId: { in: taskIds } }, _count: { _all: true } })
      : Promise.resolve([]),
  ]);

  const assigneeById = new Map(assignees.map((a) => [a.id, a]));
  const commentCountByTaskId = new Map(commentGroups.map((g) => [g.taskId, g._count._all]));

  return { assigneeById, commentCountByTaskId };
}

export async function listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = parsePublicId(req.params.projectId, 'proj');
    if (projectId === null) throw notFound('Project not found');

    const filters = parseListFilters(req);
    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Number(req.query.offset) || 0;

    const rows = await repo.findTasks(projectId, filters);
    const { assigneeById, commentCountByTaskId } = await loadTaskExtras(rows as service.TaskRow[]);

    const items = rows.map((row) => {
      const assignee = row.assigneeId ? assigneeById.get(row.assigneeId) : null;
      return service.serializeTask(row as service.TaskRow, {
        assignee: assignee ? { id: toPublicId('user', assignee.id), email: assignee.email } : null,
        commentCount: commentCountByTaskId.get(row.id) ?? 0,
      });
    });

    res.json({ items, total: rows.length, limit, offset });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = parsePublicId(req.params.projectId, 'proj');
    if (projectId === null) throw notFound('Project not found');
    res.status(201).json(await service.createTask(projectId, req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) throw notFound('Task not found');
    res.json(service.serializeTask(task, { tags: await service.listTags(taskId) }));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    res.json(await service.updateTask(taskId, req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    await service.deleteTask(taskId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    res.status(201).json(await service.addTag(taskId, req.body?.name));
  } catch (err) {
    next(err);
  }
}

export async function removeTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    const tagId = parsePublicId(req.params.tagId, 'tag');
    if (taskId === null || tagId === null) throw notFound('Task not found');
    await service.removeTag(taskId, tagId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function history(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    const rows = await db.taskHistory.findMany({
      where: { taskId },
      orderBy: { id: 'asc' },
    });
    res.json(
      rows.map((r) => ({
        id: r.id,
        taskId: toPublicId('task', r.taskId),
        changedBy: toPublicId('user', r.changedById),
        fromStatus: r.fromStatus,
        toStatus: r.toStatus,
        changedAt: r.changedAt.toISOString(),
      })),
    );
  } catch (err) {
    next(err);
  }
}
