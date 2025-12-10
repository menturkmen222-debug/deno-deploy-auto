// services/platforms/youtube.ts
import type { Env } from "../../index.ts";
import { VideoRequest, YouTubeError, UploadStatus } from "../../types.ts";

export class YouTubeService {
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds
  
  async uploadToYouTube(env: Env, video: VideoRequest): Promise<UploadStatus> {
    try {
      // 1. Token olish
      const accessToken = await this.getAccessToken(env, video.channelName);
      
      // 2. Video yuklash
      const videoId = await this.uploadVideoWithRetry(accessToken, video);
      
      return {
        success: true,
        videoId: videoId,
        channel: video.channelName,
        message: "Video muvaffaqiyatli yuklandi",
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return this.handleYouTubeError(error, video);
    }
  }
  
  private async getAccessToken(env: Env, channelName: string): Promise<string> {
    const clientId = env.YOUTUBE_CLIENT_ID;
    const clientSecret = env.YOUTUBE_CLIENT_SECRET;
    const refreshToken = env[`${channelName.toUpperCase()}_YT_TOKEN`];
    
    // Xato boshqaruvi
    if (!refreshToken) {
      throw new YouTubeError(
        'AUTH_TOKEN_MISSING',
        `YouTube token not found for channel: ${channelName}`,
        { channel: channelName }
      );
    }
    
    if (!clientId || !clientSecret) {
      throw new YouTubeError(
        'CLIENT_CREDENTIALS_MISSING',
        'YouTube client credentials not configured',
        { channel: channelName }
      );
    }
    
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      
      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new YouTubeError(
          'TOKEN_FETCH_FAILED',
          `Failed to get access token: ${tokenRes.status}`,
          {
            status: tokenRes.status,
            error: errorData.error,
            channel: channelName
          }
        );
      }
      
      const tokenData = await tokenRes.json();
      return tokenData.access_token;
      
    } catch (error) {
      if (error instanceof YouTubeError) throw error;
      
      throw new YouTubeError(
        'NETWORK_ERROR',
        'Network error while fetching token',
        {
          channel: channelName,
          originalError: error.message
        }
      );
    }
  }
  
  private async uploadVideoWithRetry(
    accessToken: string, 
    video: VideoRequest, 
    attempt = 1
  ): Promise<string> {
    try {
      return await this.uploadVideo(accessToken, video);
      
    } catch (error) {
      // Retry logic
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying upload (attempt ${attempt + 1}/${this.maxRetries})...`);
        await this.delay(this.retryDelay * attempt);
        return this.uploadVideoWithRetry(accessToken, video, attempt + 1);
      }
      
      throw error;
    }
  }
  
  private async uploadVideo(accessToken: string, video: VideoRequest): Promise<string> {
    // 1. Video'ni olish (stream qilish)
    const videoStream = await this.getVideoStream(video.videoUrl);
    
    // 2. Metadata tayyorlash
    const metadata = this.prepareMetadata(video);
    
    // 3. Multipart payload tayyorlash
    const { boundary, body } = await this.createMultipartPayload(metadata, videoStream);
    
    // 4. YouTube'ga yuklash
    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
    
    // 5. Response'ni tekshirish
    if (!uploadRes.ok) {
      const errorData = await uploadRes.json().catch(() => ({}));
      
      throw new YouTubeError(
        'UPLOAD_FAILED',
        `Video upload failed with status ${uploadRes.status}`,
        {
          status: uploadRes.status,
          youtubeError: errorData.error || {},
          videoTitle: video.title,
          channel: video.channelName,
          videoUrl: video.videoUrl
        }
      );
    }
    
    const result = await uploadRes.json();
    
    // 6. Video ID qaytarish
    if (!result.id) {
      throw new YouTubeError(
        'NO_VIDEO_ID',
        'YouTube did not return video ID',
        { response: result }
      );
    }
    
    console.log(`✅ YouTube: ${video.channelName} - Video ID: ${result.id}`);
    return result.id;
  }
  
  private async getVideoStream(videoUrl: string): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      throw new YouTubeError(
        'VIDEO_FETCH_FAILED',
        `Failed to fetch video from URL: ${response.status}`,
        { videoUrl, status: response.status }
      );
    }
    
    if (!response.body) {
      throw new YouTubeError(
        'NO_VIDEO_STREAM',
        'Video URL returned empty body',
        { videoUrl }
      );
    }
    
    // Kontent turini tekshirish
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('video/')) {
      console.warn(`⚠️ Content-Type may not be video: ${contentType}`);
    }
    
    return response.body;
  }
  
  private prepareMetadata(video: VideoRequest): any {
    return {
      snippet: {
        title: video.title || "Auto Short",
        description: video.description || video.prompt || "",
        tags: video.tags || ["AI", "Shorts"],
        categoryId: "22", // People & Blogs
      },
      status: { 
        privacyStatus: video.privacyStatus || "private",
        publishAt: video.scheduleTime || undefined,
        selfDeclaredMadeForKids: false
      },
    };
  }
  
  private async createMultipartPayload(
    metadata: any, 
    videoStream: ReadableStream<Uint8Array>
  ): Promise<{ boundary: string; body: ReadableStream }> {
    const boundary = "YouTubeBoundary" + crypto.randomUUID().replace(/-/g, '');
    
    const encoder = new TextEncoder();
    const metadataPart = encoder.encode(
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: video/mp4\r\n\r\n`
    );
    
    const endBoundary = encoder.encode(`\r\n--${boundary}--\r\n`);
    
    // Stream'lar birlashtirish
    let firstChunk = true;
    
    const combinedStream = new ReadableStream({
      async start(controller) {
        // Metadata yuborish
        controller.enqueue(metadataPart);
        
        // Video stream'ini yuborish
        const reader = videoStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            if (firstChunk) {
              firstChunk = false;
            }
            
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }
        
        // End boundary yuborish
        controller.enqueue(endBoundary);
        controller.close();
      }
    });
    
    return { boundary, body: combinedStream };
  }
  
  private handleYouTubeError(error: any, video: VideoRequest): UploadStatus {
    let errorType = 'UNKNOWN_ERROR';
    let errorMessage = 'Unknown error occurred';
    let errorDetails = {};
    
    if (error instanceof YouTubeError) {
      errorType = error.code;
      errorMessage = error.message;
      errorDetails = error.details;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Log error with details
    console.error('❌ YouTube Upload Error:', {
      errorType,
      errorMessage,
      videoTitle: video.title,
      channel: video.channelName,
      timestamp: new Date().toISOString(),
      details: errorDetails
    });
    
    return {
      success: false,
      videoId: null,
      channel: video.channelName,
      error: {
        code: errorType,
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      // Suggested actions
      suggestedAction: this.getSuggestedAction(errorType)
    };
  }
  
  private isRetryableError(error: any): boolean {
    if (!(error instanceof YouTubeError)) return false;
    
    const retryableCodes = [
      'NETWORK_ERROR',
      'RATE_LIMIT_EXCEEDED',
      'SERVER_ERROR'
    ];
    
    return retryableCodes.includes(error.code);
  }
  
  private getSuggestedAction(errorCode: string): string {
    const actions: Record<string, string> = {
      'AUTH_TOKEN_MISSING': 'Check environment variables and token configuration',
      'TOKEN_FETCH_FAILED': 'Refresh the YouTube token in Google Cloud Console',
      'VIDEO_FETCH_FAILED': 'Check video URL and accessibility',
      'RATE_LIMIT_EXCEEDED': 'Wait before retrying, check YouTube API quotas',
      'UPLOAD_FAILED': 'Check video format and size limits',
      'NETWORK_ERROR': 'Check internet connection and retry'
    };
    
    return actions[errorCode] || 'Review error details and try again';
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Error class
export class YouTubeError extends Error {
  constructor(
    public code: string,
    message: string,
    public details: any = {}
  ) {
    super(message);
    this.name = 'YouTubeError';
  }
}

// Types
export interface UploadStatus {
  success: boolean;
  videoId: string | null;
  channel: string;
  error?: {
    code: string;
    message: string;
    details: any;
    timestamp: string;
  };
  message?: string;
  timestamp?: string;
  suggestedAction?: string;
  }
