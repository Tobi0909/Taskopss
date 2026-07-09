import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

@Injectable()
export class LocalStorageService extends StorageService {
  constructor(private readonly config: ConfigService) {
    super();
  }

  private get uploadDir(): string {
    return this.config.getOrThrow<string>('UPLOAD_DIR');
  }

  async save(buffer: Buffer, originalFilename: string) {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const ext = path.extname(originalFilename);
    const storedFilename = `${randomUUID()}${ext}`;
    await fs.writeFile(this.getAbsolutePath(storedFilename), buffer);
    return { storedFilename, sizeBytes: buffer.length };
  }

  getAbsolutePath(storedFilename: string): string {
    return path.join(this.uploadDir, storedFilename);
  }

  async delete(storedFilename: string): Promise<void> {
    try {
      await fs.unlink(this.getAbsolutePath(storedFilename));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
