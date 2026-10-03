import { Redirect } from 'expo-router';

/** Device character IDs cannot identify server-owned characters. */
export default function LegacyGameRedirect() {
  return <Redirect href="/online/characters" />;
}
