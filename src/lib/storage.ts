import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

/**
 * Foundation for object storage.
 * Currently uses local disk for development, but interface is ready for S3/Supabase.
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Clean file extension
  const originalName = file.name || 'upload.jpg';
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  
  const fileName = `${nanoid()}.${ext}`;
  const dirPath = path.join(process.cwd(), 'public', 'uploads', folder);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const filePath = path.join(dirPath, fileName);
  fs.writeFileSync(filePath, buffer);
  
  return `/uploads/${folder}/${fileName}`;
}
