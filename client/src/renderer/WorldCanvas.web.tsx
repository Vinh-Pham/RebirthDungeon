import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { Text, View } from 'react-native';
import type { WorldCanvasProps } from './WorldCanvasImpl';
export default function WorldCanvas(props: WorldCanvasProps) {
  return (
    <WithSkiaWeb
      opts={{ locateFile: (file) => `/${file}` }}
      getComponent={() => import('./WorldCanvasImpl')}
      componentProps={props}
      fallback={
        <View style={{ height: props.width * 0.7 }}>
          <Text style={{ color: '#a79474' }}>Opening the map…</Text>
        </View>
      }
    />
  );
}
