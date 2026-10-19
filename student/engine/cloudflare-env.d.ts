declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DASHSCOPE_API_KEY?: string;
    DASHSCOPE_BASE_URL?: string;
    DASHSCOPE_CHAT_MODEL?: string;
    DASHSCOPE_REVIEW_MODEL?: string;
    DASHSCOPE_GDD_MODEL?: string;
    DASHSCOPE_BUILD_MODEL?: string;
    APP_COMMIT?: string;
  }
}
