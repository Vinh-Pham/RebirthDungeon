import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { Text, View } from 'react-native';
import type { GameCanvasProps } from './GameCanvasImpl';

const getComponent = () => import('./GameCanvasImpl');
const opts = { locateFile: (file: string) => `/${file}` };

export default function GameCanvas(props: GameCanvasProps) {
  return <WithSkiaWeb getComponent={getComponent} componentProps={props} opts={opts}
    fallback={<View style={{ height: props.width * 0.7, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#a9b2b1' }}>Opening the chamber…</Text></View>} />;
}
