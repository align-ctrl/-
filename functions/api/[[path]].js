// Cloudflare Pages Functions: /api/* 모든 요청을 처리 (그 외 경로는 정적 PWA 파일이 응답)
import { handle } from '../../server/handler.mjs';

export const onRequest = (context) => handle(context.request, context.env, context);
