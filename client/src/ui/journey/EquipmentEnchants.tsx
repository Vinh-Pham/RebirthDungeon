import { Text, View } from 'react-native';
import type { ContentRegistry } from '../../engine/data/ContentRegistry';
import { equipmentEnchantEffects, type EnchantFacts } from '../../engine/rpg/EnchantEffects';
import type { EnchantedEquipment } from '../../engine/rpg/EnchantState';
import { menu } from '../menu/MenuUI';
export const enchantStatLabel = {
  strength: 'Strength',
  intelligence: 'Intelligence',
  dexterity: 'Dexterity',
  will: 'Will',
  luck: 'Luck',
  maxHealth: 'Max HP',
  maxMana: 'Max MP',
  maxStamina: 'Max SP',
  physicalAttack: 'Physical Attack',
  magicAttack: 'Magic Attack',
  defense: 'Defense',
  protection: 'Protection rating',
  magicDefense: 'Magic Defense',
  magicProtection: 'Magic Protection rating',
};
export default function EquipmentEnchants({
  equipment,
  facts,
  content,
}: {
  equipment: EnchantedEquipment;
  facts: EnchantFacts;
  content: ContentRegistry;
}) {
  const effects = equipmentEnchantEffects('preview', equipment, facts, content);
  return (
    <View className="gap-2">
      {(['prefix', 'suffix'] as const).map((slot) => (
        <View key={slot} className="gap-1">
          <Text className="text-foreground" style={menu.body}>
            {slot === 'prefix' ? 'Prefix' : 'Suffix'}:{' '}
            {equipment[slot]
              ? content.data.enchants.find((e) => e.id === equipment[slot]!.enchantId)?.name
              : 'Empty'}
          </Text>
          {effects
            .filter((effect) => effect.sourceId.startsWith(`preview/${slot}/`))
            .map((effect) => (
              <Text key={effect.sourceId} className="text-muted" style={menu.body}>
                {effect.value >= 0 ? '+' : ''}
                {effect.value} {enchantStatLabel[effect.stat]}
                {effect.condition
                  ? ` · ${effect.active ? 'Active' : 'Inactive'}: requires ${effect.condition}`
                  : ''}
              </Text>
            ))}
        </View>
      ))}
    </View>
  );
}
