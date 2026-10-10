import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../api/types';
import { completeTodo, createTodo, deleteTodo, listTodos } from '../api/client';

const fetchMock = vi.fn();

function response(
  status: number,
  body: unknown,
  opts: { jsonThrows?: boolean } = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (opts.jsonThrows) throw new Error('not json');
      return body;
    },
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api/client 错误归一化（FR-012 路由接缝）', () => {
  it('listTodos 200 返回解析后的数组', async () => {
    fetchMock.mockResolvedValue(response(200, [{ id: 1 }]));
    await expect(listTodos()).resolves.toEqual([{ id: 1 }]);
  });

  it('5xx 非 JSON 响应 → ApiClientError(status>=500, code=VALIDATION_ERROR)', async () => {
    fetchMock.mockResolvedValue(response(502, null, { jsonThrows: true }));
    const err = await listTodos().catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.status).toBe(502);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('请求失败（HTTP 502）');
  });

  it('400 JSON 错误 → ApiClientError(status=400, 保留原 code)', async () => {
    fetchMock.mockResolvedValue(
      response(400, { code: 'TITLE_REQUIRED', message: '标题不能为空' }),
    );
    const err = await createTodo({ title: '   ' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('TITLE_REQUIRED');
    expect(err.message).toBe('标题不能为空');
  });

  it('404 → ApiClientError(status=404, NOT_FOUND)', async () => {
    fetchMock.mockResolvedValue(
      response(404, { code: 'NOT_FOUND', message: '事项不存在' }),
    );
    const err = await completeTodo(99).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('网络异常（fetch reject）→ 抛出非 ApiClientError（store 归为全局错误态）', async () => {
    fetchMock.mockRejectedValue(new Error('Failed to fetch'));
    const err = await listTodos().catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(ApiClientError);
  });

  it('deleteTodo 204 无响应体 → resolve undefined 且不抛', async () => {
    fetchMock.mockResolvedValue(response(204, null));
    await expect(deleteTodo(1)).resolves.toBeUndefined();
  });
});
