import type { OperatorSessionState } from './comment-translator-dock-model';

export function shouldShowCommentTranslatorStartReadiness(status: OperatorSessionState['status']): boolean {
  return status !== 'active';
}
