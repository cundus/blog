import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

marked.setOptions({ gfm: true, breaks: false });

export async function markdownToSafeHtml(md: string): Promise<string> {
  const rawHtml = await marked.parse(md);
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}
