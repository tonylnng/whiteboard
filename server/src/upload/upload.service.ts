import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import * as sharp from 'sharp';

@Injectable()
export class UploadService {
  private s3: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(private config: ConfigService) {
    const endpoint = config.get('MINIO_ENDPOINT');
    const port = config.get('MINIO_PORT');
    this.endpoint = `http://${endpoint}:${port}`;
    this.s3 = new S3Client({
      endpoint: this.endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.get('MINIO_ROOT_USER'),
        secretAccessKey: config.get('MINIO_ROOT_PASSWORD'),
      },
      forcePathStyle: true,
    });
    this.bucket = config.get('MINIO_BUCKET');
  }

  async uploadImage(buffer: Buffer, mimetype: string): Promise<{ url: string; key: string }> {
    let finalBuffer = buffer;
    try {
      finalBuffer = await sharp(buffer)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch (e) {}

    const key = `images/${uuid()}.webp`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: finalBuffer,
      ContentType: 'image/webp',
    }));

    return { url: `${this.endpoint}/${this.bucket}/${key}`, key };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
