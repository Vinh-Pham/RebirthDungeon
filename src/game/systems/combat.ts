import { effectiveProtection } from "../content/protection";

export type CombatAction = "attack" | "defend" | "smash" | "counterattack" | "windmill";
export type LoadableSkill = Exclude<CombatAction, "attack">;
export type SkillCooldowns = Partial<Record<CombatAction, number>>;
export interface Combatant {
  name: string;
  race?: number;
  health: number;
  damage_min?: number;
  damage_max?: number;
  bonus_damage?: number;
  defense?: number;
  protection?: number;
  effective_protection?: number;
  critical_cap?: number;
  critical_enabled?: boolean;
  deadly_enabled?: boolean;
  unarmed_min?: number;
  unarmed_max?: number;
  injury_min?: number;
  injury_max?: number;
  balance?: number;
  critical?: number;
  critical_multiplier?: number;
  armor_pierce?: number;
  weapon_type?: string;
  weapon_hands?: number;
  light_armor_equipped?: boolean;
  heavy_armor_equipped?: boolean;
  shield_equipped?: boolean;
  dual_wielding?: boolean;
  learned_skills?: string[];
  skill_effects?: Record<string, Record<string, number | string>>;
}
export interface EnemyState {
  stats: Combatant;
  health: number;
  gauge: number;
  intent: CombatAction;
  actions: number;
  wounds?: number;
}
export interface CombatEvent {
  message: string;
  damage: number;
  actor: "player" | "enemy";
  action: CombatAction;
  training: string[];
  weaponWear: number;
  armorHit: boolean;
}
export interface CombatActionDetails {
  action: CombatAction;
  stamina: number;
  cooldown: number;
  damage?: { min: number; max: number };
  counter?: { enemy: number; self: number };
  staminaRecovered?: number;
}

export const tonicHealing = 30;
const defendRecovery = 4;
const defaultCooldowns: Record<CombatAction, number> = {
  attack: 0,
  defend: 7,
  smash: 3,
  counterattack: 7,
  windmill: 4,
};
const costs: Record<CombatAction, number> = {
  attack: 2,
  defend: 0,
  smash: 6,
  counterattack: 4,
  windmill: 8,
};
const positiveCooldown = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
export function skillCooldownSeconds(
  action: CombatAction,
  effects: Record<string, Record<string, number | string>> = {},
  weaponType?: string,
  race = 0,
) {
  if (action === "attack") return 0;
  if (action === "defend") return positiveCooldown(effects.defense?.cooldown_time_sec, defaultCooldowns.defend);
  if (action === "smash") return positiveCooldown(effects.smash?.cooldown_time_sec, defaultCooldowns.smash);
  if (action === "counterattack") {
    return weaponType === "knuckle"
      ? positiveCooldown(effects.counterattack?.cooldown_time_knuckle_sec, 4)
      : positiveCooldown(effects.counterattack?.cooldown_time_sec, defaultCooldowns.counterattack);
  }
  const windmill = effects.windmill;
  if (race === 1) return positiveCooldown(windmill?.elf, 4.5);
  if (race === 2) return positiveCooldown(windmill?.giant, 3.5);
  return positiveCooldown(windmill?.cooldown_time_sec_human, defaultCooldowns.windmill);
}
export function skillStaminaCost(
  action: CombatAction,
  effects: Record<string, Record<string, number | string>> = {},
  unarmedReady = false,
) {
  if (action === "attack" && unarmedReady) return 0;
  const key = action === "defend" ? "defense" : action;
  return Number(effects[key]?.stamina_use ?? costs[action]);
}
const protectionOf = (actor: Combatant) => actor.effective_protection ?? actor.protection ?? 0;
const mitigate = (damage: number, defense = 0, protection = 0) =>
  Math.ceil(Math.max(0, damage * (1 - Math.min(90, Math.max(0, protection)) / 100) - Math.max(0, defense)));
export class Combat {
  health: number;
  stamina: number;
  playerWounds = 0;
  playerDeadly = false;
  guarded = false;
  countering = false;
  loadedSkill: LoadableSkill | null = null;
  cooldowns: SkillCooldowns = {};
  target = 0;
  enemies: EnemyState[];
  events: CombatEvent[] = [];
  constructor(
    public player: Combatant & { stamina?: number },
    enemies: Combatant[],
    public seed = 1,
  ) {
    this.health = player.health;
    this.stamina = player.stamina ?? 50;
    this.enemies = enemies.map((stats) => ({
      stats: { ...stats },
      health: stats.health,
      gauge: 0,
      intent: "defend",
      actions: 0,
    }));
  }
  private effect(action: string) {
    return this.player.skill_effects?.[action] ?? {};
  }
  private cost(action: CombatAction) {
    return skillStaminaCost(
      action,
      this.player.skill_effects,
      this.stamina <= 0 && this.player.unarmed_min !== undefined,
    );
  }
  cooldownDuration(action: CombatAction) {
    return skillCooldownSeconds(action, this.player.skill_effects, this.player.weapon_type, this.player.race);
  }
  cooldownRemaining(action: CombatAction) {
    return Math.max(0, this.cooldowns[action] ?? 0);
  }
  isOnCooldown(action: CombatAction) {
    return this.cooldownRemaining(action) > 1e-10;
  }
  private hasLearned(action: CombatAction) {
    const required = (
      {
        defend: "defense",
        smash: "smash",
        counterattack: "counterattack",
        windmill: "windmill",
      } as Partial<Record<CombatAction, string>>
    )[action];
    return !required || !this.player.learned_skills || this.player.learned_skills.includes(required);
  }
  get actionDetails(): CombatActionDetails[] {
    const [min, max] = this.meleeRange();
    return (Object.keys(costs) as CombatAction[]).map((action) => {
      const stamina = this.cost(action);
      const cooldown = this.cooldownDuration(action);
      if (action === "defend") return { action, stamina, cooldown, staminaRecovered: defendRecovery };
      if (action === "counterattack") return { action, stamina, cooldown, counter: this.counterRatios() };
      return {
        action,
        stamina,
        cooldown,
        damage: {
          min: this.attackPower(action, min),
          max: this.attackPower(action, max),
        },
      };
    });
  }
  get active() {
    return (this.health > 0 || this.playerDeadly) && this.enemies.some((e) => e.health > 0);
  }
  get won() {
    return (
      (this.health > 0 || this.playerDeadly) && this.enemies.length > 0 && this.enemies.every((e) => e.health <= 0)
    );
  }
  canQueue(action: CombatAction, target = this.target) {
    if (
      !this.active ||
      costs[action] === undefined ||
      this.isOnCooldown(action) ||
      this.stamina < this.cost(action) ||
      !this.enemies[target] ||
      this.enemies[target].health <= 0
    )
      return false;
    return this.hasLearned(action);
  }
  canLoad(action: LoadableSkill) {
    if (!this.active || this.isOnCooldown(action) || this.stamina < this.cost(action)) return false;
    return this.hasLearned(action);
  }
  unloadSkill() {
    this.loadedSkill = null;
    this.guarded = false;
    this.countering = false;
  }
  loadSkill(action: LoadableSkill) {
    if (this.isOnCooldown(action)) return false;
    if (this.loadedSkill === action) {
      this.unloadSkill();
      return true;
    }
    if (!this.canLoad(action)) return false;
    this.loadedSkill = action;
    this.guarded = action === "defend";
    this.countering = action === "counterattack";
    this.events = [];
    if (action === "defend") this.emit("You prepare Defense.", 0, "player", "defend", ["use_defense"]);
    else if (action === "counterattack")
      this.emit("You prepare Counterattack.", 0, "player", "counterattack", ["use_a_counterattack"]);
    return true;
  }
  executeAttack(target = this.target, explicitAction?: CombatAction): CombatEvent[] {
    this.events = [];
    if (!this.active) return this.events;
    if (!this.enemies[target] || this.enemies[target].health <= 0) {
      target = this.enemies.findIndex((enemy) => enemy.health > 0);
    }
    if (target < 0) return this.events;
    this.target = target;
    if (this.loadedSkill && this.isOnCooldown(this.loadedSkill)) this.unloadSkill();
    const action: CombatAction =
      explicitAction ?? (this.loadedSkill === "smash" || this.loadedSkill === "windmill" ? this.loadedSkill : "attack");
    if (!this.canQueue(action, target)) return this.events;
    this.playerAct(action);
    return this.events;
  }
  queue(action: CombatAction, target = this.target) {
    if (action === "defend" || action === "counterattack") return this.loadSkill(action);
    if (!this.canQueue(action, target)) return false;
    this.executeAttack(target, action);
    return true;
  }
  useTonic() {
    this.health = Math.min(this.player.health - this.playerWounds, this.health + tonicHealing);
    if (this.health > 0) this.playerDeadly = false;
    return this.health;
  }
  private random() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }
  private meleeRange() {
    const unarmed = this.stamina <= 0 && this.player.unarmed_min !== undefined;
    const low = unarmed ? this.player.unarmed_min! : (this.player.damage_min ?? 4);
    return [low, Math.max(low, (unarmed ? this.player.unarmed_max : this.player.damage_max) ?? low)] as const;
  }
  private melee() {
    const [low, high] = this.meleeRange();
    if (high <= low) return low;
    const median = low + ((high - low) * (this.player.balance ?? 50)) / 100;
    const standard = Math.sqrt(-2 * Math.log(Math.max(1e-10, this.random()))) * Math.cos(6.283185307 * this.random());
    return Math.min(high, Math.max(low, Math.round(median + (standard * Math.max(median - low, high - median)) / 2)));
  }
  private attackPower(action: CombatAction, base: number) {
    const bonus = 1 + (this.player.bonus_damage ?? 0) / 100;
    if (action === "smash") {
      const effects = this.effect(action);
      const scaled = Math.ceil((base * Number(effects.damage_human_elf ?? 100)) / 100);
      const damage = scaled + (Object.keys(effects).length ? 0 : 3);
      if (this.player.weapon_hands !== 2) return damage * bonus;
      const multiplier = Number(String(effects.additional_multiplier_two_handed_weapons ?? "1.2").replace(/^x/, ""));
      return Math.ceil(damage * multiplier) * bonus;
    }
    if (action === "windmill")
      return Math.ceil((base * Number(this.effect(action).human_giant_damage ?? 100)) / 100) * bonus;
    return base * bonus;
  }
  private counterRatios() {
    const effects = this.effect("counterattack");
    return {
      enemy: Number(effects.damage_from_opponent_human_giant ?? 50),
      self: Number(effects.damage_from_self_human_elf ?? 50),
    };
  }
  private woundAmount(damage: number, attacker: Combatant, target: Combatant) {
    if (!attacker.injury_min && !attacker.injury_max) return 0;
    const min = Math.max(0, (attacker.injury_min ?? 0) - protectionOf(target));
    const max = Math.max(min, (attacker.injury_max ?? attacker.injury_min ?? 0) - protectionOf(target));
    return Math.floor((damage * Math.min(100, min + this.random() * (max - min))) / 100);
  }
  private enemyRoll(enemy: Combatant) {
    const low = enemy.damage_min ?? 4;
    return low + Math.floor(this.random() * ((enemy.damage_max ?? low) - low + 1));
  }
  private emit(
    message: string,
    damage: number,
    actor: CombatEvent["actor"],
    action: CombatAction = "attack",
    training: string[] = [],
    weaponWear = 0,
    armorHit = false,
  ) {
    this.events.push({
      message,
      damage,
      actor,
      action,
      training,
      weaponWear,
      armorHit,
    });
  }
  private playerAct(action: CombatAction) {
    if (this.stamina < this.cost(action) || this.isOnCooldown(action)) return;
    if (this.enemies[this.target].health <= 0) this.target = this.enemies.findIndex((enemy) => enemy.health > 0);
    const enemy = this.enemies[this.target];
    if (!enemy) return;
    const exhausted = this.stamina <= 0 && this.player.unarmed_min !== undefined;
    const rolledDamage = action === "attack" || action === "smash" || action === "windmill" ? this.melee() : 0;
    const maximumDamage = this.meleeRange()[1];
    this.stamina -= this.cost(action);
    this.loadedSkill = null;
    this.guarded = false;
    this.countering = false;
    const cooldown = this.cooldownDuration(action);
    if (cooldown > 0) {
      this.cooldowns[action] = cooldown;
    }
    if (action === "smash" && enemy.intent === "attack") {
      this.emit("Normal Attack interrupts your Smash.", 0, "player", action);
      return;
    }
    const training = ["attack"];
    if (this.player.weapon_type === "sword") training.push("attack_an_enemy_with_sword");
    if (this.player.dual_wielding) training.push("attack_an_enemy_while_dual_wielding");
    if (action === "smash") training.push("use_the_skill_successfully", "knock_down_an_enemy");
    if (action === "windmill") training.push("windmill_attack", "knock_down_an_enemy");
    let base = rolledDamage;
    const critical = Math.max(
      0,
      Math.min(
        this.player.critical_cap ?? 30,
        (this.player.critical ?? 0) -
          (action === "windmill" ? 0 : protectionOf(enemy.stats) * 2) +
          (action === "smash" && this.player.weapon_hands === 2
            ? Number(this.effect("smash").additional_critical_two_handed_weapons ?? 5)
            : 0),
      ),
    );
    if (critical > 0 && this.player.critical_enabled !== false) {
      if (this.random() * 100 < critical) {
        base += maximumDamage * ((this.player.critical_multiplier ?? 1.5) - 1);
        training.push("score_a_critical_hit");
        if (action === "smash") training.push("get_a_critical_hit_with_smash");
      }
    }
    base = this.attackPower(action, base);
    let damage = mitigate(
      base,
      Math.max(0, (enemy.stats.defense ?? 0) - (this.player.armor_pierce ?? 0)),
      protectionOf(enemy.stats),
    );
    if (enemy.intent === "defend" && action !== "smash") {
      damage = Math.ceil(damage / 2);
      training.push("observe_an_enemy_using_the_defense_skill", "watch_an_enemy_defend_itself");
    } else if (enemy.intent === "defend" && action === "smash")
      training.push(
        "land_a_special_skill_on_a_defending_enemy",
        "successful_in_using_a_special_skill_to_attack_a_defending_enemy",
      );
    if (action === "attack" && enemy.intent === "smash") {
      enemy.gauge = 0;
      enemy.intent = "defend";
      this.emit("Normal Attack interrupts the enemy Smash.", 0, "player");
    }
    const targets = action === "windmill" ? this.enemies.filter((e) => e.health > 0) : [enemy];
    let totalDamage = 0;
    for (const target of targets) {
      let hit =
        target === enemy
          ? damage
          : mitigate(
              base,
              Math.max(0, (target.stats.defense ?? 0) - (this.player.armor_pierce ?? 0)),
              protectionOf(target.stats),
            );
      if (target !== enemy && target.intent === "defend") hit = Math.ceil(hit / 2);
      if (action === "attack" || action === "smash")
        target.wounds = Math.min(
          target.stats.health,
          (target.wounds ?? 0) + this.woundAmount(hit, this.player, target.stats),
        );
      target.health = Math.max(0, target.health - hit);
      totalDamage += hit;
      if (target.health === 0) {
        training.push("defeat_enemy");
        if (this.player.weapon_type === "sword") training.push("defeat_an_enemy_with_sword");
        if (this.player.dual_wielding) training.push("defeat_an_enemy_while_dual_wielding");
        if (action === "windmill") training.push("windmill_defeat_enemy");
        if (action === "smash") training.push("use_smash_as_the_final_blow", "perform_a_finishing_blow_with_smash");
        if (training.includes("score_a_critical_hit")) {
          training.push("finish_off_an_enemy_with_a_critical_hit");
          if (action === "smash") training.push("get_a_critical_hit_as_the_final_blow");
        }
      }
    }
    if (action === "windmill" && targets.length >= 4) training.push("attack_4_or_more_enemies");
    if (action === "windmill" && targets.filter((target) => target.health === 0).length >= 4)
      training.push("defeat_4_or_more_enemies");
    this.emit(
      action === "windmill"
        ? `Windmill hits ${targets.length} ${targets.length === 1 ? "enemy" : "enemies"} for ${totalDamage} damage.`
        : action === "smash" && enemy.intent === "defend"
          ? `Smash breaks Defend for ${damage} damage.`
          : `Your ${action} deals ${damage} damage.`,
      totalDamage,
      "player",
      action,
      training,
      exhausted ? 0 : action === "smash" ? 30 : 25,
    );
    if (enemy.health <= 0)
      this.target = Math.max(
        0,
        this.enemies.findIndex((e) => e.health > 0),
      );
  }
  advance(dt: number) {
    this.events = [];
    if (!Number.isFinite(dt) || dt <= 0) return this.events;
    let remaining = dt;
    while (remaining > 1e-10 && this.active) {
      let boundary = remaining;
      for (const enemy of this.enemies)
        if (enemy.health > 0)
          boundary = Math.min(boundary, Math.max(0, (1 - enemy.gauge) * (3.5 + this.enemies.indexOf(enemy) * 0.5)));
      for (const cd of Object.values(this.cooldowns)) {
        if (cd !== undefined && cd > 1e-10) boundary = Math.min(boundary, cd);
      }
      for (const [action, cd] of Object.entries(this.cooldowns) as [CombatAction, number | undefined][]) {
        if (cd === undefined) continue;
        const next = Math.max(0, cd - boundary);
        if (next <= 1e-10) delete this.cooldowns[action];
        else this.cooldowns[action] = next;
      }
      for (const [index, enemy] of this.enemies.entries())
        if (enemy.health > 0) enemy.gauge = Math.min(1, enemy.gauge + boundary / (3.5 + index * 0.5));
      remaining = Math.max(0, remaining - boundary);
      let resolved = false;
      for (const enemy of this.enemies) {
        if (!this.active || enemy.health <= 0 || enemy.gauge < 1 - 1e-10) continue;
        resolved = true;
        enemy.gauge = 0;
        if (enemy.intent === "defend")
          this.emit(`${enemy.stats.name} defends.`, 0, "enemy", enemy.intent, [
            "observe_an_enemy_using_the_defense_skill",
            "watch_an_enemy_defend_itself",
          ]);
        else {
          const normal = this.enemyRoll(enemy.stats);
          let damage = mitigate(
            normal + (enemy.intent === "smash" ? 3 : 0),
            this.player.defense,
            protectionOf(this.player),
          );
          if (this.countering) {
            const effects = this.effect("counterattack");
            const chance = (enemy.stats.critical ?? 0) + Number(effects.additional_critical_upon_activation ?? 0);
            const critical = chance > 0 && this.random() * 100 < Math.min(chance, 30);
            const ratios = this.counterRatios();
            const opponent = (normal * ratios.enemy) / 100;
            const self = (this.melee() * ratios.self) / 100;
            const reflected = mitigate(
              this.attackPower("counterattack", Math.ceil(opponent * (critical ? 1.5 : 1) + self)),
              Math.max(0, (enemy.stats.defense ?? 0) - (this.player.armor_pierce ?? 0)),
              protectionOf(enemy.stats),
            );
            enemy.health = Math.max(0, enemy.health - reflected);
            this.countering = false;
            if (this.loadedSkill === "counterattack") this.loadedSkill = null;
            this.cooldowns.counterattack = this.cooldownDuration("counterattack");
            this.emit(`Counterattack returns ${reflected} damage.`, reflected, "player", "counterattack", [
              "attack",
              "knock_down_an_enemy",
              enemy.intent === "smash" ? "counter_an_enemy_s_special_attack" : "counter_an_enemy_s_attack",
              ...(enemy.health === 0 ? ["defeat_enemy"] : []),
              ...(critical ? ["score_a_critical_hit", "counterattack_with_a_critical_hit"] : []),
            ]);
            if (enemy.health === 0) {
              this.target = Math.max(
                0,
                this.enemies.findIndex((other) => other.health > 0),
              );
            }
          } else {
            const blocked = this.guarded && enemy.intent === "attack";
            if (blocked) {
              const defense = this.effect("defense");
              const race = this.player.race === 2 ? "giant" : "human_elf";
              const flat = Number(defense[`defense_bonus_${race}`] ?? 0);
              const rating = Number(defense[`protection_bonus_${race}`] ?? 0);
              damage = flat || rating ? mitigate(damage, flat, effectiveProtection(rating)) : Math.ceil(damage / 2);
              this.stamina = Math.min(this.player.stamina ?? 50, this.stamina + defendRecovery);
              this.cooldowns.defend = this.cooldownDuration("defend");
            }
            this.playerWounds = Math.min(
              this.player.health,
              this.playerWounds + this.woundAmount(damage, enemy.stats, this.player),
            );
            const wasHealthy = this.health >= this.player.health / 2;
            const nextHealth = this.health - damage;
            this.playerDeadly =
              (this.playerDeadly && damage === 0) ||
              Boolean(this.player.deadly_enabled && wasHealthy && nextHealth <= 0);
            this.health = this.playerDeadly ? Math.max(-this.player.health, nextHealth) : Math.max(0, nextHealth);
            const guardBroken = this.guarded && enemy.intent === "smash";
            this.guarded = false;
            if (this.loadedSkill === "defend") this.loadedSkill = null;
            this.emit(
              blocked
                ? `You guard against ${enemy.stats.name} and take ${damage} damage.`
                : guardBroken
                  ? `${enemy.stats.name} breaks your guard for ${damage} damage.`
                  : `${enemy.stats.name} uses ${enemy.intent} for ${damage} damage.`,
              damage,
              "enemy",
              enemy.intent,
              [
                ...(blocked ? ["block_attack"] : []),
                ...(blocked && this.player.shield_equipped ? ["block_attacks_with_the_defense_skill_and_a_shield"] : []),
                ...(this.player.light_armor_equipped ? ["take_melee_attacks_while_wearing_light_armor"] : []),
                ...(this.player.heavy_armor_equipped ? ["take_melee_attacks_while_wearing_heavy_armor"] : []),
                ...(this.player.shield_equipped ? ["take_melee_attacks_while_equipped_with_a_shield"] : []),
              ],
              0,
              true,
            );
          }
        }
        enemy.actions++;
        enemy.intent = (["defend", "attack", "smash"] as const)[enemy.actions % 3];
      }
      if (boundary === 0 && !resolved) break;
    }
    return this.events;
  }
  snapshot() {
    return structuredClone({
      player: this.player,
      health: this.health,
      playerWounds: this.playerWounds,
      playerDeadly: this.playerDeadly,
      stamina: this.stamina,
      guarded: this.guarded,
      countering: this.countering,
      loadedSkill: this.loadedSkill,
      cooldowns: this.cooldowns,
      target: this.target,
      enemies: this.enemies,
      seed: this.seed,
    });
  }
}
