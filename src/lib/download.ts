/**
 * 서명 URL 은 교차 출처라 <a download> 가 먹지 않는다.
 * blob 으로 받아서 내려줘야 파일로 저장된다.
 */
export async function downloadUrl(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
