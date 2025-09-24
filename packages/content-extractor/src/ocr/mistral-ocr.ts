import { Mistral } from "@mistralai/mistralai";

const apiKey = Deno.env.get("MISTRAL_API_KEY");

const client = new Mistral({ apiKey: apiKey });

export async function getMistralMarkdowns(file: string): Promise<string[]> {
  console.log(`Uploading ${file}...`);
  const uploadedFile = await Deno.readFile(file);
  const uploadedPdf = await client.files.upload({
    file: {
      fileName: "uploaded_file.pdf",
      content: uploadedFile,
    },
    purpose: "ocr" as unknown as any,
  });
  console.log("Done.");

  console.log("Getting signed URL...");
  const signedUrl = await client.files.getSignedUrl({ fileId: uploadedPdf.id });
  console.log("Done.");

  console.log("OCR'ing...");
  const ocrResponse = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: signedUrl.url,
    },
  });
  console.log("Done.");

  // Clean up the uploaded file.
  const resp = await client.files.delete({ fileId: uploadedPdf.id });

  if (!resp.deleted) {
    console.error("Failed to delete the uploaded file.");
  } else {
    console.log("Uploaded file deleted successfully.");
  }

  return ocrResponse.pages.map((page) => page.markdown);
}

export async function deleteAllUploadedFiles(): Promise<void> {
  console.log("Deleting all uploaded files...");
  const resp = await client.files.list();
  for (const file of resp.data) {
    await client.files.delete({ fileId: file.id });
    console.log(`Deleted file: ${file.id}`);
  }
  console.log("All uploaded files deleted.");
}
