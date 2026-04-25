import { describe, it, expect } from 'vitest';
import { MachineSystem } from '../systems/MachineSystem';
import { AutomationSystem } from '../systems/AutomationSystem';
import { GameManager } from '../systems/GameManager';
import { ConveyorItem } from '../systems/ConveyorSystem';
import { MachineState, MACHINE_DEFAULTS } from '../data/MachineConfig';
import { ItemState } from '../data/ConveyorConfig';

// Helper: create a ConveyorItem at a specific machine's intake zone
function makeItem(state: ItemState, loopProgress: number): ConveyorItem {
  return {
    x: 0,
    y: 0,
    state,
    loopProgress,
    onInlet: false,
    onOutlet: false,
  };
}

// Helper: place an item directly into a machine's heldItems
function placeItemInMachine(machine: MachineState, state: ItemState): ConveyorItem {
  const item = makeItem(state, 0);
  machine.heldItems.push(item);
  return item;
}

// Machine 1 has a fixed sequence: ['left', 'up', 'up', 'right', 'left', 'down']
// With default requiredSequenceLength = 3, the active sequence is ['left', 'up', 'up']

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL INTERACTION (no automation)
// ─────────────────────────────────────────────────────────────────────────────

describe('Manual interaction — no automation', () => {
  it('player starts interaction by pressing interact at machine position', () => {
    const ms = new MachineSystem();
    const machine = ms.getMachines()[0]; // machine1, playerPosition = 'up'
    placeItemInMachine(machine, 'new');

    const result = ms.update([], 'up', true, null);
    expect(result.interactionState).toBe('active');
    expect(ms.getActiveInteraction()).not.toBeNull();
    expect(ms.getActiveInteraction()!.machineId).toBe('machine1');
    expect(ms.getActiveInteraction()!.currentStep).toBe(0);
  });

  it('correct sequence inputs complete the interaction successfully', () => {
    const ms = new MachineSystem();
    const machine = ms.getMachines()[0];
    placeItemInMachine(machine, 'new');

    // Start interaction
    ms.update([], 'up', true, null);
    const seq = ms.getActiveInteraction()!.sequence;

    // Input each step correctly
    for (let i = 0; i < seq.length - 1; i++) {
      const r = ms.update([], 'up', false, seq[i]);
      expect(r.interactionState).toBe('active');
    }

    // Final step
    const finalResult = ms.update([], 'up', false, seq[seq.length - 1]);
    expect(finalResult.interactionState).toBe('success');
    expect(finalResult.itemsToReturn).toHaveLength(1);
    expect(finalResult.itemsToReturn[0].state).toBe('processed');
    expect(ms.getActiveInteraction()).toBeNull();
  });

  it('wrong input fails the interaction and returns item in original state', () => {
    const ms = new MachineSystem();
    const machine = ms.getMachines()[0];
    placeItemInMachine(machine, 'new');

    ms.update([], 'up', true, null);
    const seq = ms.getActiveInteraction()!.sequence;

    // Input a wrong direction
    const wrongDir = seq[0] === 'up' ? 'down' : 'up';
    const result = ms.update([], 'up', false, wrongDir);
    expect(result.interactionState).toBe('failed');
    expect(result.itemsToReturn).toHaveLength(1);
    expect(result.itemsToReturn[0].state).toBe('new');
    expect(ms.getActiveInteraction()).toBeNull();
  });

  it('pressing interact during active interaction cancels it', () => {
    const ms = new MachineSystem();
    const machine = ms.getMachines()[0];
    placeItemInMachine(machine, 'new');

    ms.update([], 'up', true, null);
    expect(ms.getActiveInteraction()).not.toBeNull();

    const result = ms.update([], 'up', true, null);
    expect(result.interactionState).toBe('cancelled');
    expect(result.itemsToReturn).toHaveLength(1);
    expect(result.itemsToReturn[0].state).toBe('new');
    expect(ms.getActiveInteraction()).toBeNull();
  });

  it('no interaction starts if machine has no items', () => {
    const ms = new MachineSystem();
    const result = ms.update([], 'up', true, null);
    expect(result.interactionState).toBe('idle');
    expect(ms.getActiveInteraction()).toBeNull();
  });

  it('no interaction starts if player is at wrong position', () => {
    const ms = new MachineSystem();
    const machine = ms.getMachines()[0];
    placeItemInMachine(machine, 'new');

    const result = ms.update([], 'center', true, null);
    expect(result.interactionState).toBe('idle');
    expect(ms.getActiveInteraction()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATION — basic step-by-step behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('Automation — step-by-step sequence solving', () => {
  function setupAutomation(automationLevel: number, speedLevel: number = 0) {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0]; // machine1
    machine.automationLevel = automationLevel;

    // Apply speed upgrades by directly setting via GameManager internals
    // We use addPayout + attemptPurchase to set speed level properly
    if (speedLevel > 0) {
      // Need enough budget for speed purchases
      let totalCost = 0;
      for (let i = 0; i < speedLevel; i++) {
        totalCost += 50 * Math.pow(2, i); // machine1 base = 50
      }
      gm.addPayout(totalCost);
      for (let i = 0; i < speedLevel; i++) {
        gm.attemptPurchase('machine1', 'speed');
      }
    }

    return { ms, as, gm, machine };
  }

  it('automation level 0 does nothing even with items', () => {
    const { ms, as, gm, machine } = setupAutomation(0);
    placeItemInMachine(machine, 'new');

    const returned = as.update(1200, ms.getMachines(), gm, ms);
    expect(returned).toHaveLength(0);
    expect(machine.activeInteraction).toBeNull();
  });

  it('automation level 1 solves first step immediately after timing', () => {
    const { ms, as, gm, machine } = setupAutomation(1);
    placeItemInMachine(machine, 'new');

    // Not enough time yet
    let returned = as.update(500, ms.getMachines(), gm, ms);
    expect(returned).toHaveLength(0);
    expect(machine.activeInteraction).toBeNull();

    // Enough time (1100ms default timing)
    returned = as.update(600, ms.getMachines(), gm, ms);
    expect(returned).toHaveLength(0); // sequence length 3, only 1 step solved
    expect(machine.activeInteraction).not.toBeNull();
    expect(machine.activeInteraction!.currentStep).toBe(1);
  });

  it('automation level 1 with sequence length 3 leaves interaction open after 1 step', () => {
    const { ms, as, gm, machine } = setupAutomation(1);
    placeItemInMachine(machine, 'new');

    // Trigger first step
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction).not.toBeNull();
    expect(machine.activeInteraction!.currentStep).toBe(1);

    // Further updates should not advance (automation exhausted)
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction!.currentStep).toBe(1); // still 1
  });

  it('automation level 2 solves 2 steps with timing between them', () => {
    const { ms, as, gm, machine } = setupAutomation(2);
    placeItemInMachine(machine, 'new');

    // First step after timing
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction).not.toBeNull();
    expect(machine.activeInteraction!.currentStep).toBe(1);

    // Second step after another timing interval
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction!.currentStep).toBe(2);

    // Should not advance further (automation level 2, only 2 steps)
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction!.currentStep).toBe(2);
  });

  it('automation level 3 with sequence length 3 completes the item', () => {
    const { ms, as, gm, machine } = setupAutomation(3);
    placeItemInMachine(machine, 'new');

    // Step 1
    let returned = as.update(1100, ms.getMachines(), gm, ms);
    expect(returned).toHaveLength(0);
    expect(machine.activeInteraction!.currentStep).toBe(1);

    // Step 2
    returned = as.update(1100, ms.getMachines(), gm, ms);
    expect(returned).toHaveLength(0);
    expect(machine.activeInteraction!.currentStep).toBe(2);

    // Step 3 — completes the sequence
    returned = as.update(1100, ms.getMachines(), gm, ms);
    expect(returned).toHaveLength(1);
    expect(returned[0].state).toBe('processed');
    expect(machine.activeInteraction).toBeNull();
  });

  it('automation level >= sequence length completes item fully', () => {
    const { ms, as, gm, machine } = setupAutomation(5); // level 5, sequence 3
    placeItemInMachine(machine, 'new');

    // Step 1 (immediate on first timing)
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction!.currentStep).toBe(1);

    // Step 2
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction!.currentStep).toBe(2);

    // Step 3 — completes
    const returned = as.update(1100, ms.getMachines(), gm, ms);
    expect(returned).toHaveLength(1);
    expect(returned[0].state).toBe('processed');
  });

  it('after completing one item, automation starts the next', () => {
    const { ms, as, gm, machine } = setupAutomation(3);
    machine.capacity = 2;
    placeItemInMachine(machine, 'new');
    placeItemInMachine(machine, 'new');

    // Complete first item (3 steps)
    as.update(1100, ms.getMachines(), gm, ms);
    as.update(1100, ms.getMachines(), gm, ms);
    let returned = as.update(1100, ms.getMachines(), gm, ms);
    expect(returned).toHaveLength(1);
    expect(machine.heldItems).toHaveLength(1);

    // Next item starts after timing
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction).not.toBeNull();
    expect(machine.activeInteraction!.currentStep).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATION — speed upgrade effect
// ─────────────────────────────────────────────────────────────────────────────

describe('Automation — speed upgrade reduces timing', () => {
  it('speed level 1 reduces timing to 1000ms', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 1;

    // Purchase 1 speed upgrade
    gm.addPayout(50);
    gm.attemptPurchase('machine1', 'speed');

    placeItemInMachine(machine, 'new');

    // 999ms — not enough
    as.update(999, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction).toBeNull();

    // 1ms more — now 1000ms total, should trigger
    as.update(1, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction).not.toBeNull();
    expect(machine.activeInteraction!.currentStep).toBe(1);
  });

  it('speed level 5 reduces timing to 600ms', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 1;

    // Purchase 5 speed upgrades (costs: 50, 100, 200, 400, 800 = 1550)
    gm.addPayout(1550);
    for (let i = 0; i < 5; i++) {
      gm.attemptPurchase('machine1', 'speed');
    }
    expect(gm.getAutomationTiming('machine1')).toBe(600);

    placeItemInMachine(machine, 'new');

    // 599ms — not enough
    as.update(599, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction).toBeNull();

    // 1ms more — triggers at 600ms
    as.update(1, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER TAKEOVER of automation interaction
// ─────────────────────────────────────────────────────────────────────────────

describe('Player takeover of automation interaction', () => {
  it('player takes over partially solved auto-interaction', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 1;
    placeItemInMachine(machine, 'new');

    // Automation solves step 1
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction).not.toBeNull();
    expect(machine.activeInteraction!.currentStep).toBe(1);

    // Player presses interact at machine position — takes over
    const result = ms.update([], 'up', true, null);
    expect(result.interactionState).toBe('active');
    expect(ms.getActiveInteraction()).not.toBeNull();
    expect(ms.getActiveInteraction()!.currentStep).toBe(1); // preserves progress
    expect(ms.getActiveInteraction()!.machineId).toBe('machine1');
  });

  it('player can complete remaining steps after takeover', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 1;
    placeItemInMachine(machine, 'new');

    // Automation solves step 1
    as.update(1100, ms.getMachines(), gm, ms);
    const seq = machine.activeInteraction!.sequence;

    // Player takes over
    ms.update([], 'up', true, null);

    // Player inputs remaining steps
    ms.update([], 'up', false, seq[1]);
    const result = ms.update([], 'up', false, seq[2]);
    expect(result.interactionState).toBe('success');
    expect(result.itemsToReturn).toHaveLength(1);
    expect(result.itemsToReturn[0].state).toBe('processed');
  });

  it('automation stops when player is interacting', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 3;
    machine.capacity = 2;
    placeItemInMachine(machine, 'new');
    placeItemInMachine(machine, 'new');

    // Automation starts on first item
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction!.currentStep).toBe(1);

    // Player takes over
    ms.update([], 'up', true, null);
    expect(ms.isPlayerInteracting('machine1')).toBe(true);

    // Automation update should do nothing while player is interacting
    as.update(1100, ms.getMachines(), gm, ms);
    // currentStep should still be 1 (player hasn't advanced it)
    expect(machine.activeInteraction!.currentStep).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY INDICATOR (isActive)
// ─────────────────────────────────────────────────────────────────────────────

describe('Activity indicator — isActive', () => {
  it('inactive when no automation and no interaction', () => {
    const ms = new MachineSystem();
    expect(ms.isActive('machine1')).toBe(false);
  });

  it('active during manual player interaction', () => {
    const ms = new MachineSystem();
    const machine = ms.getMachines()[0];
    placeItemInMachine(machine, 'new');

    ms.update([], 'up', true, null);
    expect(ms.isActive('machine1')).toBe(true);
  });

  it('active while automation is still solving steps', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 2;
    placeItemInMachine(machine, 'new');

    // Automation solves step 1 (of 2 allowed)
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction!.currentStep).toBe(1);
    expect(ms.isActive('machine1')).toBe(true); // still has steps to solve
  });

  it('inactive when automation has exhausted its steps', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 1; // can only solve 1 step
    placeItemInMachine(machine, 'new');

    // Automation solves step 1 (its max)
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction!.currentStep).toBe(1);

    // Automation level exhausted — machine should be inactive
    expect(ms.isActive('machine1')).toBe(false);
  });

  it('inactive after automation completes the full sequence', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 3;
    placeItemInMachine(machine, 'new');

    // Complete all 3 steps
    as.update(1100, ms.getMachines(), gm, ms);
    as.update(1100, ms.getMachines(), gm, ms);
    as.update(1100, ms.getMachines(), gm, ms);

    // Interaction cleared, no more items
    expect(machine.activeInteraction).toBeNull();
    expect(ms.isActive('machine1')).toBe(false);
  });

  it('active when player takes over from automation', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 1;
    placeItemInMachine(machine, 'new');

    // Automation solves 1 step
    as.update(1100, ms.getMachines(), gm, ms);
    expect(ms.isActive('machine1')).toBe(false); // automation exhausted

    // Player takes over
    ms.update([], 'up', true, null);
    expect(ms.isActive('machine1')).toBe(true); // player is interacting
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPGRADE EFFECTS on machine behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('Upgrade effects on machine behavior', () => {
  it('capacity upgrade allows machine to hold more items', () => {
    const ms = new MachineSystem();
    const gm = new GameManager();
    const machine = ms.getMachines()[0];

    expect(machine.capacity).toBe(MACHINE_DEFAULTS.capacity); // 1

    gm.addPayout(50);
    gm.attemptPurchase('machine1', 'capacity');
    gm.applyUpgrades('machine1', machine);

    expect(machine.capacity).toBe(2);
  });

  it('quality upgrade increases workQuality and requiredSequenceLength', () => {
    const ms = new MachineSystem();
    const gm = new GameManager();
    const machine = ms.getMachines()[0];

    gm.addPayout(50);
    gm.attemptPurchase('machine1', 'quality');
    gm.applyUpgrades('machine1', machine);

    // machine1 uses qualityScalingMode: 'baseValue' with baseValue: 10
    // At quality level 1: workQuality = 10 * QUALITY_MODIFIER_TABLE[1] = 10 * 1.15 = 11.5
    expect(machine.workQuality).toBeCloseTo(11.5);
    // At quality level 1: requiredSequenceLength = SEQUENCE_LENGTH_TABLE[1] = 4
    expect(machine.requiredSequenceLength).toBe(4);
  });

  it('automation upgrade sets automationLevel', () => {
    const ms = new MachineSystem();
    const gm = new GameManager();
    const machine = ms.getMachines()[0];

    expect(machine.automationLevel).toBe(0);

    gm.addPayout(50);
    gm.attemptPurchase('machine1', 'automation');
    gm.applyUpgrades('machine1', machine);

    expect(machine.automationLevel).toBe(1);
  });

  it('quality upgrade makes sequences longer for automation', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();
    const machine = ms.getMachines()[0];

    // Buy 1 quality + 3 automation
    gm.addPayout(50 + 50 + 100 + 200); // quality=50, auto=50+100+200
    gm.attemptPurchase('machine1', 'quality');
    gm.attemptPurchase('machine1', 'automation');
    gm.attemptPurchase('machine1', 'automation');
    gm.attemptPurchase('machine1', 'automation');
    gm.applyUpgrades('machine1', machine);

    expect(machine.automationLevel).toBe(3);
    expect(machine.requiredSequenceLength).toBe(4); // 3 + 1

    placeItemInMachine(machine, 'new');

    // Automation can solve 3 steps, but sequence is 4 long
    as.update(1100, ms.getMachines(), gm, ms); // step 1
    as.update(1100, ms.getMachines(), gm, ms); // step 2
    as.update(1100, ms.getMachines(), gm, ms); // step 3

    // Should NOT be complete — 1 step remaining
    expect(machine.activeInteraction).not.toBeNull();
    expect(machine.activeInteraction!.currentStep).toBe(3);

    // Automation exhausted
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machine.activeInteraction!.currentStep).toBe(3); // no change
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('automation does nothing when machine has no items', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 3;

    const returned = as.update(5000, ms.getMachines(), gm, ms);
    expect(returned).toHaveLength(0);
    expect(machine.activeInteraction).toBeNull();
  });

  it('sequence length 1 with automation level 1 completes immediately', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machine = ms.getMachines()[0];
    machine.automationLevel = 1;
    machine.requiredSequenceLength = 1;
    placeItemInMachine(machine, 'new');

    const returned = as.update(1100, ms.getMachines(), gm, ms);
    expect(returned).toHaveLength(1);
    expect(returned[0].state).toBe('processed');
    expect(machine.activeInteraction).toBeNull();
  });

  it('multiple machines can automate independently', () => {
    const ms = new MachineSystem();
    const as = new AutomationSystem();
    const gm = new GameManager();

    const machines = ms.getMachines();
    machines[0].automationLevel = 3; // machine1
    machines[1].automationLevel = 3; // machine2

    placeItemInMachine(machines[0], 'new');
    placeItemInMachine(machines[1], 'processed');

    // Both should start after timing
    as.update(1100, ms.getMachines(), gm, ms);
    expect(machines[0].activeInteraction).not.toBeNull();
    expect(machines[1].activeInteraction).not.toBeNull();
    expect(machines[0].activeInteraction!.currentStep).toBe(1);
    expect(machines[1].activeInteraction!.currentStep).toBe(1);
  });

  it('isPlayerInteracting returns false when no player interaction', () => {
    const ms = new MachineSystem();
    expect(ms.isPlayerInteracting('machine1')).toBe(false);
  });

  it('isPlayerInteracting returns true only for the machine the player is at', () => {
    const ms = new MachineSystem();
    const machine = ms.getMachines()[0];
    placeItemInMachine(machine, 'new');

    ms.update([], 'up', true, null);
    expect(ms.isPlayerInteracting('machine1')).toBe(true);
    expect(ms.isPlayerInteracting('machine2')).toBe(false);
    expect(ms.isPlayerInteracting('machine3')).toBe(false);
  });
});
