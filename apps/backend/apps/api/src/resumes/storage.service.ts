import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Local-disk storage driver for dev; swap for an S3 driver behind this
 * same interface for production (architecture doc's storage abstraction).
 * Storage keys are always a fresh UUID — the original filename is never
 * used as a path component, which is the concrete defense against path
 * traversal called out in architecture §6.
 */
@Injectable()
export class StorageService {
  private readonly basePath: string;

  constructor(private readonly config: ConfigService) {
    this.basePath = path.resolve(this.config.get<string>('STORAGE_LOCAL_PATH', './storage'));
  }

  async save(buffer: Buffer, extension: string): Promise<string> {
    await fs.mkdir(this.basePath, { recursive: true });
    const key = `${uuid()}${extension}`;
    await fs.writeFile(path.join(this.basePath, key), buffer);
    return key;
  }

  async read(storageKey: string): Promise<Buffer> {
    const safeKey = path.basename(storageKey); // defense in depth, ignores any path segments
    return fs.readFile(path.join(this.basePath, safeKey));
  }
}
