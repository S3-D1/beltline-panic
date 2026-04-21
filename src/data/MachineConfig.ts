import { ItemState } from './ConveyorConfig';
import { PlayerPosition } from '../systems/InputSystem';
import { ConveyorItem } from '../systems/ConveyorSystem';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type SequenceStrategy = 'fixed' | 'per-run' | 'per-item';

export interface MachineDefinition {
  id: string;
  acceptedInputStatuses: ItemState[];
  outputStatus: ItemState;
  playerPosition: PlayerPosition;
  zoneProgressStart: number;
  zoneProgressEnd: number;
  sequenceStrategy: SequenceStrategy;
  fixedSequence?: Direction[];  // only for 'fixed' strategy
}

export interface MachineState {
  definition: MachineDefinition;
  capacity: number;
  automationLevel: number;
  workQuality: number;
  workSpeed: number;
  requiredSequenceLength: number;
  heldItems: ConveyorItem[];       // items currently inside the machine
  activeInteraction: ActiveInteraction | null;
  runSequence: Direction[] | null;  // for 'per-run' strategy, generated once per run
  autoProcessing: boolean;          // true when auto-processing fires, reset each frame
}

export interface ActiveInteraction {
  machineId: string;
  item: ConveyorItem;
  originalState: ItemState;
  sequence: Direction[];            // the active sequence (trimmed/extended to requiredSequenceLength)
  currentStep: number;
}

export const BASE_SEQUENCE: Direction[] = ['left', 'up', 'up', 'right', 'left', 'down'];

export const MACHINE_DEFAULTS = {
  capacity: 1,
  automationLevel: 0,
  workQuality: 0.1,
  workSpeed: 5,
  requiredSequenceLength: 3,
} as const;

export const MACHINE_DEFINITIONS: MachineDefinition[] = [
  {
    id: 'machine1',
    acceptedInputStatuses: ['new'],
    outputStatus: 'processed',
    playerPosition: 'up',
    zoneProgressStart: 0.10,
    zoneProgressEnd: 0.18,
    sequenceStrategy: 'fixed',
    fixedSequence: ['left', 'up', 'up', 'right', 'left', 'down'],
  },
  {
    id: 'machine2',
    acceptedInputStatuses: ['processed'],
    outputStatus: 'upgraded',
    playerPosition: 'right',
    zoneProgressStart: 0.35,
    zoneProgressEnd: 0.43,
    sequenceStrategy: 'per-run',
  },
  {
    id: 'machine3',
    acceptedInputStatuses: ['processed', 'upgraded'],
    outputStatus: 'packaged',
    playerPosition: 'down',
    zoneProgressStart: 0.60,
    zoneProgressEnd: 0.68,
    sequenceStrategy: 'per-item',
  },
];
