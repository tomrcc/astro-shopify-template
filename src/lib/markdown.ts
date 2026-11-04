import { marked } from 'marked';

export const markdown = (text: string | null | undefined) => (text ? (marked.parse(text, { async: false }) as string) : '');
