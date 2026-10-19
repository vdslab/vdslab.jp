import { getImageBinary } from "../../../../api";

export const dynamic = "force-dynamic";

/**
 * Serves an image stored in PostgreSQL.
 */
export async function GET(request, { params }) {
  const { imageId } = params;
  if (!imageId) {
    return new Response("Image ID is required", { status: 400 });
  }

  try {
    const image = await getImageBinary(imageId);
    if (!image || !image.data) {
      return new Response("Image not found", { status: 404 });
    }

    return new Response(image.data, {
      status: 200,
      headers: {
        "Content-Type": image.mimeType || "application/octet-stream",
        "Content-Length": String(image.data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(`Failed to serve image ${imageId}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
