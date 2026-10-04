import { Share } from 'react-native';
export async function exportHistory(jsonl: string) {
  await Share.share({ message: jsonl, title: 'Gameplay audit export' });
}
