import Phaser from 'phaser';
import Button from 'phaser4-rex-plugins/plugins/button.js';
import { send, busy } from '../runtime/game';
export interface ControlBounds {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    icon?: string;
}
export function treasureView(scene: Phaser.Scene): ControlBounds[] {
    const w = scene.scale.width,
        h = scene.scale.height;
    return Array.from({ length: 5 }, (_, i) => {
        const x = (w * (i + 1)) / 6,
            y = h * 0.56;
        const text = scene.add
            .text(x, y, `OPEN CHEST ${i + 1}`, {
                fontFamily: 'Arial',
                fontSize: '13px',
                color: '#e8eecf',
                backgroundColor: '#28453e',
                padding: { x: 12, y: 14 },
            })
            .setOrigin(0.5);
        new Button(text, { mode: 'release', threshold: 8 }).on('click', () => {
            if (!busy()) send({ type: 'CHEST', index: i });
        });
        return { name: `chest-${i}`, x, y, width: text.width, height: text.height };
    });
}