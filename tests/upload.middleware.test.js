const path = require('path');

var capturedDestination, capturedFilename;

jest.mock('multer', () => {
  const mockDiskStorage = jest.fn((opts) => {
    capturedDestination = opts.destination;
    capturedFilename = opts.filename;
    return {};
  });
  const fn = jest.fn(() => jest.fn());
  fn.diskStorage = mockDiskStorage;
  return fn;
});

var fileFilter;
beforeAll(() => {
  const mod = require('../middleware/upload');
  fileFilter = mod.fileFilter;
});

describe('upload middleware — fileFilter', () => {
  let req;

  beforeEach(() => {
    req = {};
  });

  it('acepta archivo .jpg', (done) => {
    fileFilter(req, { originalname: 'portada.jpg' }, (err, result) => {
      expect(err).toBeNull();
      expect(result).toBe(true);
      done();
    });
  });

  it('acepta archivo .jpeg', (done) => {
    fileFilter(req, { originalname: 'portada.jpeg' }, (err, result) => {
      expect(err).toBeNull();
      expect(result).toBe(true);
      done();
    });
  });

  it('acepta archivo .png', (done) => {
    fileFilter(req, { originalname: 'portada.png' }, (err, result) => {
      expect(err).toBeNull();
      expect(result).toBe(true);
      done();
    });
  });

  it('acepta archivo .webp', (done) => {
    fileFilter(req, { originalname: 'portada.webp' }, (err, result) => {
      expect(err).toBeNull();
      expect(result).toBe(true);
      done();
    });
  });

  it('rechaza archivo .pdf', (done) => {
    fileFilter(req, { originalname: 'documento.pdf' }, (err, result) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toMatch(/JPG|PNG|WebP/i);
      expect(result).toBeUndefined();
      done();
    });
  });

  it('es case-insensitive (.JPG)', (done) => {
    fileFilter(req, { originalname: 'portada.JPG' }, (err, result) => {
      expect(err).toBeNull();
      expect(result).toBe(true);
      done();
    });
  });
});

describe('upload middleware — storage', () => {
  it('destination apunta al directorio covers', (done) => {
    capturedDestination({}, { originalname: 'test.jpg' }, (err, dir) => {
      expect(err).toBeNull();
      expect(dir).toMatch(/covers$/);
      done();
    });
  });

  it('filename conserva la extensión del archivo', (done) => {
    capturedFilename({}, { originalname: 'foto.png' }, (err, name) => {
      expect(err).toBeNull();
      expect(name).toMatch(/\.png$/);
      expect(name).not.toBe('foto.png');
      done();
    });
  });
});
