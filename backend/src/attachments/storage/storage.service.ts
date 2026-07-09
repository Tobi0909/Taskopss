export abstract class StorageService {
  abstract save(
    buffer: Buffer,
    originalFilename: string,
  ): Promise<{ storedFilename: string; sizeBytes: number }>;
  abstract getAbsolutePath(storedFilename: string): string;
  abstract delete(storedFilename: string): Promise<void>;
}
