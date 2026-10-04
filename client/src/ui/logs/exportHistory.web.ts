export async function exportHistory(jsonl: string) {
  const url = URL.createObjectURL(new Blob([jsonl], { type: 'application/x-ndjson' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `game-audit-${Date.now()}.jsonl`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
