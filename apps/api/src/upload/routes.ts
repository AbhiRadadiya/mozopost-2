import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { ah, requireAuth, AuthedRequest } from '../middleware';

export const uploadRouter = Router();
uploadRouter.use(requireAuth);

uploadRouter.post(
  '/',
  ah(async (req: AuthedRequest, res) => {
    const { name, data } = req.body; // data is base64 string
    if (!name || !data) {
      return res.status(400).json({ error: 'name and data (base64) are required' });
    }

    // data is like "data:image/png;base64,iVBORw0KG..."
    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    let base64Data = data;
    let extension = path.extname(name);

    if (match) {
      base64Data = match[2];
      const mime = match[1];
      if (!extension) {
        if (mime === 'image/png') extension = '.png';
        else if (mime === 'image/jpeg' || mime === 'image/jpg') extension = '.jpg';
        else if (mime === 'application/pdf') extension = '.pdf';
        else extension = '.bin';
      }
    }

    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueName = `${uuidv4()}${extension}`;
    const filePath = path.join(uploadsDir, uniqueName);
    fs.writeFileSync(filePath, buffer);

    res.status(201).json({ url: `/uploads/${uniqueName}` });
  })
);
