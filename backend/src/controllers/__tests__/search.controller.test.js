const { globalSearch } = require('../search.controller');
const searchService = require('../../services/search.service');

jest.mock('../../services/search.service');

describe('Search Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      query: {},
      user: { tenantId: 'tenant-1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  it('should return 400 if query is missing', async () => {
    await globalSearch(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid input: expected string, received undefined' });
  });

  it('should return 400 if query is too long', async () => {
    req.query.q = 'a'.repeat(101);
    await globalSearch(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Search query is too long' });
  });

  it('should sanitize special characters from query', async () => {
    req.query.q = 'hello | & world (test)';
    searchService.performSearch.mockResolvedValue({ data: [], meta: {} });
    
    await globalSearch(req, res);
    
    expect(searchService.performSearch).toHaveBeenCalledWith(expect.objectContaining({
      query: 'hello world test'
    }));
    expect(res.json).toHaveBeenCalled();
  });

  it('should pass pagination and filters to service correctly', async () => {
    req.query = {
      q: 'valid search',
      type: 'chats',
      page: '2',
      limit: '10'
    };
    
    searchService.performSearch.mockResolvedValue({ data: [], meta: {} });
    await globalSearch(req, res);
    
    expect(searchService.performSearch).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      query: 'valid search',
      type: 'chats',
      filters: { dateFrom: undefined, dateTo: undefined, vendorId: undefined },
      page: 2,
      limit: 10,
      offset: 10
    });
  });
});
