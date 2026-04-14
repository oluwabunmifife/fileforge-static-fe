# FileForge Frontend Refactoring Guide

This document explains the refactored architecture of the FileForge static frontend and how it integrates with S3 + Lambda backends using presigned URLs.

## Architecture Overview

The frontend is organized into three main hooks that handle different concerns:

### 1. **useSessionId** (`src/hooks/useSessionId.ts`)
Manages persistent session IDs across the app lifecycle.

- **Responsibility**: Generate and store a UUID in localStorage on first load
- **Returns**: `sessionId: string | null`
- **Usage**: Track all uploads and results for a user session

```typescript
const sessionId = useSessionId();
```

### 2. **useUpload** (`src/hooks/useUpload.ts`)
Handles the complete presigned URL upload flow.

**Upload Flow**:
1. Get presigned upload URL from backend
2. Upload file directly to S3 using presigned URL
3. Track progress and status

**Returns**:
```typescript
{
  uploads: UploadItem[],           // Current uploads with progress
  error: string | null,             // Last upload error
  uploadFiles(files, sessionId),    // Initiate uploads
  clearError(): void,               // Clear error state
  retryFailedUpload(id, file, sessionId),  // Retry failed upload
  clearUpload(id): void             // Remove upload from list
}
```

**UploadItem Structure**:
```typescript
{
  id: string;                       // Unique upload ID
  filename: string;
  size: number;                     // File size in bytes
  progress: number;                 // 0-100 upload percentage
  status: "uploading" | "processing" | "error";
  error?: string;                   // Error message if failed
}
```

### 3. **usePolling** (`src/hooks/usePolling.ts`)
Polls the backend every 3 seconds for processed results.

**Polling Flow**:
1. Calls `GET /api/results?sessionId=<sessionId>`
2. Normalizes response to standard format
3. Automatically retries on errors (with 5 retry limit)
4. Clears uploads once results are available

**Returns**:
```typescript
{
  results: ProcessedFile[],         // Completed/downloaded files
  isPolling: boolean,               // Currently polling state
  error: string | null,             // Polling error message
  clearError(): void,               // Clear error state
  clearResult(fileId): void,        // Remove result from list
  refetch(): Promise<void>          // Manual refetch
}
```

**ProcessedFile Structure**:
```typescript
{
  id: string;                       // Unique file ID
  filename: string;
  size: number;
  downloadUrl: string;              // Presigned download URL
}
```

## Backend API Endpoints

### POST /api/upload-url
Request presigned upload URL from backend.

**Request**:
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**:
```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/uploads/...?X-Amz-Signature=...",
  "key": "uploads/550e8400-e29b-41d4-a716-446655440000/document.pdf"
}
```

### GET /api/results?sessionId=<sessionId>
Poll for processed files.

**Response** (Array format):
```json
[
  {
    "key": "outputs/550e8400-e29b-41d4-a716-446655440000/document.jpg",
    "filename": "document.jpg",
    "downloadUrl": "https://bucket.s3.amazonaws.com/outputs/...?X-Amz-Signature=...",
    "size": 245000
  }
]
```

**Alternative Response** (Object with files array):
```json
{
  "files": [
    {
      "key": "outputs/550e8400-e29b-41d4-a716-446655440000/document.jpg",
      "filename": "document.jpg",
      "downloadUrl": "https://bucket.s3.amazonaws.com/outputs/...?X-Amz-Signature=...",
      "size": 245000
    }
  ]
}
```

## Environment Configuration

### Required Environment Variable

```bash
VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com
```

For local development:
```bash
VITE_API_BASE_URL=http://localhost:3000
```

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
# Edit .env.local with your backend URL
```

## Component Structure

### UploadDropzone (`src/components/UploadDropzone.tsx`)
- Accepts file drops or file picker
- Calls `onDrop` handler with selected files
- Visual feedback for drag state

### ProcessingStatus (`src/components/ProcessingStatus.tsx`)
- Shows active uploads with progress bars
- Displays upload status (uploading/queued)
- Real-time progress updates

### FileCard (`src/components/FileCard.tsx`)
- Displays processed file with download button
- Shows file size
- Optional remove button

### ResultsList (`src/components/ResultsList.tsx`)
- Shows all completed/processed files
- Displays polling status indicator
- Grid layout of FileCards

## Usage in App Component

```typescript
import { useSessionId } from "@/hooks/useSessionId";
import { useUpload } from "@/hooks/useUpload";
import { usePolling } from "@/hooks/usePolling";

export default function App() {
  const sessionId = useSessionId();
  const { uploads, error: uploadError, uploadFiles, clearError: clearUploadError } = useUpload();
  const { results, isPolling, error: pollingError, clearResult } = usePolling(sessionId);

  const handleFiles = async (acceptedFiles: File[]) => {
    if (sessionId) {
      await uploadFiles(acceptedFiles, sessionId);
    }
  };

  return (
    <main>
      <UploadDropzone onDrop={handleFiles} isBusy={uploads.length > 0} />
      <ProcessingStatus uploads={uploads} />
      <ResultsList files={results} isPolling={isPolling} onRemove={clearResult} />
    </main>
  );
}
```

## Error Handling

### Upload Errors
- Failed presigned URL requests
- S3 upload failures
- Network timeouts

**Handled by**: `useUpload` hook
**User sees**: Error message + list of failed uploads
**Recovery**: Retry by dropping files again

### Polling Errors
- Results API connection failures
- Invalid response format

**Handled by**: `usePolling` hook
**User sees**: Error message after 5 retry attempts
**Recovery**: Automatic retry, user can manually refetch

## UI States

### Idle
- No uploads in progress
- No results available

### Uploading
- File being transferred to S3
- Progress bar visible
- Status shows percentage

### Processing
- File uploaded, waiting for Lambda
- Status shows "queued" or "processing"
- Animated progress indicator

### Completed
- File processed by backend
- Appears in results list
- Download button available

### Error
- Upload or polling failed
- Error message displayed
- Failed uploads listed with retry option

## Performance Considerations

1. **Polling Interval**: 3 seconds (configurable in `usePolling.ts`)
2. **Upload Progress**: Real-time via XMLHttpRequest
3. **Error Retry Limit**: 5 attempts before showing error
4. **Session Persistence**: Survives page reloads via localStorage
5. **Memory**: Uploads cleared when results appear

## Backward Compatibility

The original `useFileUpload` hook is maintained as a wrapper for backward compatibility. It combines the three new hooks:

```typescript
// Old way (still works):
const { sessionId, uploads, results, error, isPolling, handleFiles, ... } = useFileUpload();

// New recommended way:
const sessionId = useSessionId();
const { uploads, uploadFiles } = useUpload();
const { results, isPolling } = usePolling(sessionId);
```

## Testing the Integration

1. **Start Frontend**:
   ```bash
   npm run dev
   ```

2. **Set API URL** in `.env.local`:
   ```bash
   VITE_API_BASE_URL=https://your-api.example.com
   ```

3. **Upload file**:
   - Drag and drop a file
   - Monitor progress bar
   - Watch for "Processing..." state

4. **Verify polling**:
   - Check Network tab for `/api/results` requests every 3s
   - Look for processed files appearing in results list

5. **Test error scenarios**:
   - Disconnect network during upload
   - Set invalid `VITE_API_BASE_URL`
   - Backend returns error response

## Build and Deploy

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Deploy dist/ folder to static host (Netlify, Vercel, etc.)
```

The `dist/` folder contains all static files ready for deployment to any static hosting service.
