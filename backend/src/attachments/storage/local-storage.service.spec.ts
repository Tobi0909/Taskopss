import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService (real filesystem I/O)', () => {
  let uploadDir: string;
  let service: LocalStorageService;

  beforeEach(async () => {
    uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taskman-uploads-'));
    const config = { getOrThrow: () => uploadDir } as unknown as ConfigService;
    service = new LocalStorageService(config);
  });

  afterEach(async () => {
    await fs.rm(uploadDir, { recursive: true, force: true });
  });

  it('lưu file thật xuống đĩa và giữ nguyên nội dung', async () => {
    const content = Buffer.from('node_exporter log excerpt');
    const { storedFilename, sizeBytes } = await service.save(content, 'node-exporter.log');

    expect(sizeBytes).toBe(content.length);
    expect(storedFilename.endsWith('.log')).toBe(true);

    const savedContent = await fs.readFile(service.getAbsolutePath(storedFilename));
    expect(savedContent.equals(content)).toBe(true);
  });

  it('sinh tên file khác nhau cho 2 lần lưu cùng tên gốc (chống ghi đè)', async () => {
    const content = Buffer.from('x');
    const first = await service.save(content, 'screenshot.png');
    const second = await service.save(content, 'screenshot.png');

    expect(first.storedFilename).not.toBe(second.storedFilename);
  });

  it('xoá file đã lưu, và không throw khi xoá file không tồn tại', async () => {
    const { storedFilename } = await service.save(Buffer.from('bye'), 'a.txt');
    await service.delete(storedFilename);

    await expect(fs.access(service.getAbsolutePath(storedFilename))).rejects.toThrow();
    await expect(service.delete('khong-ton-tai.txt')).resolves.toBeUndefined();
  });
});
