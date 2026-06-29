export default function getMeta(key: string): string | undefined {
  return document.querySelector<HTMLMetaElement>(`meta[name="${key}"]`)?.content
}
