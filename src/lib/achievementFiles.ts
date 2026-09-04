export function isPdfUrl(url: string): boolean {
  return /\.pdf(?:$|[?#])/i.test(url.trim());
}

export function fileNameFromUrl(url: string, fallbackTitle: string): string {
  try {
    const pathName = new URL(url, window.location.origin).pathname;
    const encodedName = pathName.split('/').filter(Boolean).at(-1);
    const decodedName = encodedName ? decodeURIComponent(encodedName) : '';
    const cleanedName = decodedName.replace(/^\d+[-_]?/, '');
    const timestampWasRemoved = cleanedName !== decodedName;
    const unreadable = !cleanedName || cleanedName.length > 64 || (timestampWasRemoved && /^[a-z0-9]{6,16}\.pdf$/i.test(cleanedName));
    return unreadable ? `${fallbackTitle}.pdf` : cleanedName;
  } catch {
    return `${fallbackTitle}.pdf`;
  }
}
