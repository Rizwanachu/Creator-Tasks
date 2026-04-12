import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import multer from "multer";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

// sharp is a native C++ addon — NOT imported at module level so the serverless
// bundle never tries to load the platform binary at startup.
// compressImage() does a lazy require and falls back gracefully when sharp is
// unavailable (e.g. Vercel serverless where the linux binary isn't present).
async function compressImage(buffer: Buffer, maxDimension: number): Promise<Buffer> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require("sharp") as typeof import("sharp").default;
    return await (sharp(buffer) as any)
      .rotate()
      .resize(maxDimension, maxDimension, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer() as Buffer;
  } catch {
    // sharp native binary not available — return the original buffer as-is.
    // Images will still upload correctly, just without server-side resize/compression.
    return buffer;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload. Requires authentication.
 * Accepts an optional `purpose` field ("avatar" | "portfolio") to generate
 * user-scoped, deterministic storage paths.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType, purpose } = parsed.data;
    const clerkId = req.dbUser?.clerkId;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL({
      purpose,
      clerkId,
      filename: name,
      contentType,
    });
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    logger.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * POST /storage/uploads/file
 *
 * Direct server-side file upload (multipart/form-data).
 * Used as fallback when presigned URL signing is unavailable.
 * Accepts: file (required), purpose (optional), filename (optional)
 */
router.post(
  "/storage/uploads/file",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    if (!req.file.mimetype.startsWith("image/")) {
      res.status(400).json({ error: "Only image files are allowed" });
      return;
    }

    try {
      const purpose = (req.body as Record<string, string>)["purpose"] as string | undefined;
      const maxDimension = purpose === "avatar" ? 400 : 1200;

      const compressed = await compressImage(req.file.buffer, maxDimension);
      const dataUrl = `data:image/jpeg;base64,${compressed.toString("base64")}`;
      res.json({ objectPath: dataUrl });
    } catch (error) {
      logger.error({ err: error }, "Error processing image");
      res.status(500).json({ error: "Failed to process image" });
    }
  }
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    logger.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve uploaded object entities (avatars, portfolio images) from PRIVATE_OBJECT_DIR.
 * These are intentionally public — all uploads are user profile content (avatars,
 * portfolio images) which must be visible on public profile pages without auth.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

    if (!wildcardPath.startsWith("avatars/") && !wildcardPath.startsWith("portfolio/")) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      logger.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    logger.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
