import pingSimpleHandler from '../../functions/ping-simple';
import { HttpRequest } from '@azure/functions';
import { mock } from 'jest-mock-extended';

describe('pingSimpleHandler', () => {
  it('should set a 200 status and a valid body on context.res', async () => {
    const request = mock<HttpRequest>({
      method: 'GET',
      query: new URLSearchParams() as any,
    });

    const context = {
      log: jest.fn(),
      res: {},
    } as any;

    await pingSimpleHandler(context, request);

    expect(context.res.status).toBe(200);
    const body = JSON.parse(context.res.body);
    expect(body).toEqual({
      message: 'Hello from Azure Functions!',
      timestamp: expect.any(String),
      method: 'GET',
    });
  });
});
