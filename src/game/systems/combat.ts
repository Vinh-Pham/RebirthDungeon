export type CombatAction =
  | "attack"
  | "defend"
  | "smash"
  | "counterattack"
  | "windmill";
export interface Combatant {
  name: string;
  health: number;
  damage_min?: number;
  damage_max?: number;
  defense?: number;
  protection?: number;
  balance?: number;
  critical?: number;
  critical_multiplier?: number;
  armor_pierce?: number;
  weapon_type?: string;
  weapon_hands?: number;
  light_armor_equipped?: boolean;
  learned_skills?: string[];
  skill_effects?: Record<string, Record<string, number | string>>;
}
export interface EnemyState {
  stats: Combatant;
  health: number;
  gauge: number;
  intent: CombatAction;
  actions: number;
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
  damage?: { min: number; max: number };
  counter?: { enemy: number; self: number };
  staminaRecovered?: number;
}

export const tonicHealing = 30;
const defendRecovery = 4;
const costs: Record<CombatAction, number> = {
  attack: 2,
  defend: 0,
  smash: 6,
  counterattack: 4,
  windmill: 8,
};
const mitigate = (damage: number, defense = 0, protection = 0) =>
  Math.ceil(
    Math.max(0, damage - defense) *
      (1 - Math.min(100, Math.max(0, protection)) / 100),
  );
export class Combat {
  health: number;
  stamina: number;
  playerGauge = 0;
  guarded = false;
  countering = false;
  target = 0;
  queuedAction: CombatAction | null = null;
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
    return Number(this.effect(action).stamina_use ?? costs[action]);
  }
  get actionDetails(): CombatActionDetails[] {
    const [min, max] = this.meleeRange();
    return (Object.keys(costs) as CombatAction[]).map((action) => {
      const stamina = this.cost(action);
      if (action === "defend")
        return { action, stamina, staminaRecovered: defendRecovery };
      if (action === "counterattack")
        return { action, stamina, counter: this.counterRatios() };
      return {
        action,
        stamina,
        damage: {
          min: this.attackPower(action, min),
          max: this.attackPower(action, max),
        },
      };
    });
  }
  get active() {
    return this.health > 0 && this.enemies.some((e) => e.health > 0);
  }
  get won() {
    return (
      this.health > 0 &&
      this.enemies.length > 0 &&
      this.enemies.every((e) => e.health <= 0)
    );
  }
  canQueue(action: CombatAction, target = this.target) {
    if (
      !this.active ||
      costs[action] === undefined ||
      this.stamina < this.cost(action) ||
      !this.enemies[target] ||
      this.enemies[target].health <= 0
    )
      return false;
    const required = (
      {
        defend: "defense",
        smash: "smash",
        counterattack: "counterattack",
        windmill: "windmill",
      } as Partial<Record<CombatAction, string>>
    )[action];
    if (
      required &&
      this.player.learned_skills &&
      !this.player.learned_skills.includes(required)
    )
      return false;
    return true;
  }
  queue(action: CombatAction, target = this.target) {
    if (!this.canQueue(action, target)) return false;
    this.target = target;
    this.queuedAction = action;
    return true;
  }
  useTonic() {
    this.health = Math.min(this.player.health, this.health + tonicHealing);
    return this.health;
  }
  private random() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }
  private meleeRange() {
    const low = this.player.damage_min ?? 4;
    return [low, Math.max(low, this.player.damage_max ?? low)] as const;
  }
  private melee() {
    const [low, high] = this.meleeRange();
    if (high <= low) return low;
    const median = low + ((high - low) * (this.player.balance ?? 50)) / 100;
    const standard =
      Math.sqrt(-2 * Math.log(Math.max(1e-10, this.random()))) *
      Math.cos(6.283185307 * this.random());
    return Math.min(
      high,
      Math.max(
        low,
        Math.round(
          median + (standard * Math.max(median - low, high - median)) / 2,
        ),
      ),
    );
  }
  private attackPower(action: CombatAction, base: number) {
    if (action === "smash") {
      const effects = this.effect(action);
      const scaled = Math.ceil((base * Number(effects.damage_human_elf ?? 100)) / 100);
      const damage = scaled + (Object.keys(effects).length ? 0 : 3);
      if (this.player.weapon_hands !== 2) return damage;
      const multiplier = Number(
        String(effects.additional_multiplier_two_handed_weapons ?? "1.2").replace(/^x/, ""),
      );
      return Math.ceil(damage * multiplier);
    }
    if (action === "windmill")
      return Math.ceil((base * Number(this.effect(action).human_giant_damage ?? 100)) / 100);
    return base;
  }
  private counterRatios() {
    const effects = this.effect("counterattack");
    return {
      enemy: Number(effects.damage_from_opponent_human_giant ?? 50),
      self: Number(effects.damage_from_self_human_elf ?? 50),
    };
  }
  private enemyRoll(enemy: Combatant) {
    const low = enemy.damage_min ?? 4;
    return (
      low + Math.floor(this.random() * ((enemy.damage_max ?? low) - low + 1))
    );
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
  private playerAct() {
    const action = this.queuedAction;
    if (!action || this.stamina < this.cost(action)) return;
    if (this.enemies[this.target].health <= 0)
      this.target = this.enemies.findIndex((enemy) => enemy.health > 0);
    const enemy = this.enemies[this.target];
    if (!enemy) return;
    this.stamina -= this.cost(action);
    this.queuedAction = null;
    this.playerGauge = 0;
    this.guarded = action === "defend";
    this.countering = action === "counterattack";
    if (this.guarded) {
      this.stamina = Math.min(this.player.stamina ?? 50, this.stamina + defendRecovery);
      this.emit("You defend and recover stamina.", 0, "player", action, [
        "use_defense",
      ]);
      return;
    }
    if (this.countering) {
      this.emit("You prepare Counterattack.", 0, "player", action, [
        "use_a_counterattack",
      ]);
      return;
    }
    if (action === "smash" && enemy.intent === "attack") {
      this.emit("Normal Attack interrupts your Smash.", 0, "player", action);
      return;
    }
    const training = ["attack"];
    if (this.player.weapon_type === "sword")
      training.push("attack_an_enemy_with_sword");
    if (action === "smash")
      training.push("use_the_skill_successfully", "knock_down_an_enemy");
    if (action === "windmill")
      training.push("windmill_attack", "knock_down_an_enemy");
    let base = this.attackPower(action, this.melee());
    const critical = Math.max(
      0,
      Math.min(
        30,
        (this.player.critical ?? 0) -
          (enemy.stats.protection ?? 0) * 2 +
          (action === "smash" && this.player.weapon_hands === 2
            ? Number(
                this.effect("smash").additional_critical_two_handed_weapons ??
                  5,
              )
            : 0),
      ),
    );
    if (critical > 0) {
      if (this.random() * 100 < critical) {
        base = Math.ceil(base * (this.player.critical_multiplier ?? 1.5));
        training.push("score_a_critical_hit");
        if (action === "smash") training.push("get_a_critical_hit_with_smash");
      }
    }
    let damage = mitigate(
      base,
      Math.max(0, (enemy.stats.defense ?? 0) - (this.player.armor_pierce ?? 0)),
      enemy.stats.protection,
    );
    if (enemy.intent === "defend" && action !== "smash") {
      damage = Math.ceil(damage / 2);
      training.push(
        "observe_an_enemy_using_the_defense_skill",
        "watch_an_enemy_defend_itself",
      );
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
    const targets =
      action === "windmill"
        ? this.enemies.filter((e) => e.health > 0)
        : [enemy];
    let totalDamage = 0;
    for (const target of targets) {
      let hit =
        target === enemy
          ? damage
          : mitigate(
              base,
              Math.max(
                0,
                (target.stats.defense ?? 0) - (this.player.armor_pierce ?? 0),
              ),
              target.stats.protection,
            );
      if (target !== enemy && target.intent === "defend")
        hit = Math.ceil(hit / 2);
      target.health = Math.max(0, target.health - hit);
      totalDamage += hit;
      if (target.health === 0) {
        training.push("defeat_enemy");
        if (this.player.weapon_type === "sword")
          training.push("defeat_an_enemy_with_sword");
        if (action === "windmill") training.push("windmill_defeat_enemy");
        if (action === "smash")
          training.push(
            "use_smash_as_the_final_blow",
            "perform_a_finishing_blow_with_smash",
          );
        if (training.includes("score_a_critical_hit")) {
          training.push("finish_off_an_enemy_with_a_critical_hit");
          if (action === "smash")
            training.push("get_a_critical_hit_as_the_final_blow");
        }
      }
    }
    if (action === "windmill" && targets.length >= 4)
      training.push("attack_4_or_more_enemies");
    if (
      action === "windmill" &&
      targets.filter((target) => target.health === 0).length >= 4
    )
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
      action === "smash" ? 30 : 25,
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
          boundary = Math.min(
            boundary,
            Math.max(
              0,
              (1 - enemy.gauge) * (4.5 + this.enemies.indexOf(enemy) * 0.65),
            ),
          );
      if (this.queuedAction && this.stamina >= this.cost(this.queuedAction))
        boundary = Math.min(
          boundary,
          Math.max(0, (1 - this.playerGauge) * 2.5),
        );
      this.playerGauge = Math.min(1, this.playerGauge + boundary / 2.5);
      for (const [index, enemy] of this.enemies.entries())
        if (enemy.health > 0)
          enemy.gauge = Math.min(
            1,
            enemy.gauge + boundary / (4.5 + index * 0.65),
          );
      remaining = Math.max(0, remaining - boundary);
      let resolved = false;
      for (const enemy of this.enemies) {
        if (!this.active || enemy.health <= 0 || enemy.gauge < 1 - 1e-10)
          continue;
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
            this.player.protection,
          );
          if (this.countering) {
            const effects = this.effect("counterattack");
            const chance =
              (enemy.stats.critical ?? 0) +
              Number(effects.additional_critical_upon_activation ?? 0);
            const critical =
              chance > 0 && this.random() * 100 < Math.min(chance, 30);
            const ratios = this.counterRatios();
            const opponent = (normal * ratios.enemy) / 100;
            const self = (this.melee() * ratios.self) / 100;
            const reflected = mitigate(
              Math.ceil(opponent * (critical ? 1.5 : 1) + self),
              Math.max(
                0,
                (enemy.stats.defense ?? 0) - (this.player.armor_pierce ?? 0),
              ),
              enemy.stats.protection,
            );
            enemy.health = Math.max(0, enemy.health - reflected);
            this.countering = false;
            this.emit(
              `Counterattack returns ${reflected} damage.`,
              reflected,
              "player",
              "counterattack",
              [
                "attack",
                "knock_down_an_enemy",
                enemy.intent === "smash"
                  ? "counter_an_enemy_s_special_attack"
                  : "counter_an_enemy_s_attack",
                ...(enemy.health === 0 ? ["defeat_enemy"] : []),
                ...(critical
                  ? [
                      "score_a_critical_hit",
                      "counterattack_with_a_critical_hit",
                    ]
                  : []),
              ],
            );
          } else {
            const blocked = this.guarded && enemy.intent === "attack";
            if (blocked)
              damage = Math.ceil(
                mitigate(
                  normal,
                  (this.player.defense ?? 0) +
                    Number(this.effect("defense").defense_bonus_human_elf ?? 0),
                  (this.player.protection ?? 0) +
                    Number(
                      this.effect("defense").protection_bonus_human_elf ?? 0,
                    ),
                ) / 2,
              );
            this.health = Math.max(0, this.health - damage);
            const guardBroken = this.guarded && enemy.intent === "smash";
            this.guarded = false;
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
                ...(this.player.light_armor_equipped
                  ? ["take_melee_attacks_while_wearing_light_armor"]
                  : []),
              ],
              0,
              true,
            );
          }
        }
        enemy.actions++;
        enemy.intent = (["defend", "attack", "smash"] as const)[
          enemy.actions % 3
        ];
      }
      if (this.active && this.playerGauge >= 1 - 1e-10 && this.queuedAction) {
        this.playerGauge = 1;
        this.playerAct();
        resolved = true;
      }
      if (boundary === 0 && !resolved) break;
    }
    return this.events;
  }
  snapshot() {
    return structuredClone({
      player: this.player,
      health: this.health,
      stamina: this.stamina,
      playerGauge: this.playerGauge,
      guarded: this.guarded,
      countering: this.countering,
      target: this.target,
      queuedAction: this.queuedAction,
      enemies: this.enemies,
      seed: this.seed,
    });
  }
}
