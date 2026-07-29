/* eslint-disable @typescript-eslint/no-require-imports -- Metro needs literal asset require paths. */
/**
 * Static asset catalogue.
 *
 * Metro requires literal require() paths, so gameplay code imports assets from
 * this registry instead of constructing paths dynamically.
 */
export const gameAssets = {
  scenes: {
    secureServerRoom: require('../../assets/game/secure-server-room-2_5d.png'),
  },
  devicePuzzles: {
    mainFuseBox: require('../../assets/game/puzzles/puzzle-main-fuse-box.png'),
    securityTerminal: require('../../assets/game/puzzles/puzzle-security-terminal.png'),
    accessLog: require('../../assets/game/puzzles/puzzle-access-log-reader.png'),
    exitDoor: require('../../assets/game/puzzles/puzzle-exit-door.png'),
  },
  ui: {
    panelGreen: require('../../assets/game/kenney-ui/panel-green.png'),
    panelBrown: require('../../assets/game/kenney-ui/panel-brown.png'),
    buttonBrown: require('../../assets/game/kenney-ui/button-brown.png'),
    jewel: require('../../assets/game/kenney-ui/jewel.png'),
    alert: require('../../assets/game/kenney-ui/alert.png'),
    gridPaper: require('../../assets/game/kenney-ui/grid-paper.png'),
  },
  puzzle: {
    pipeCorner: require('../../assets/game/kenney-puzzle/pipe-corner.png'),
    pipeStraight: require('../../assets/game/kenney-puzzle/pipe-straight.png'),
    sparkYellow: require('../../assets/game/kenney-puzzle/spark-yellow.png'),
    sparkBlue: require('../../assets/game/kenney-puzzle/spark-blue.png'),
  },
  dungeon: {
    character: require('../../assets/game/kenney-dungeon/character-human.png'),
    gate: require('../../assets/game/kenney-dungeon/gate.png'),
    chest: require('../../assets/game/kenney-dungeon/chest.png'),
    barrel: require('../../assets/game/kenney-dungeon/barrel.png'),
    wall: require('../../assets/game/kenney-dungeon/wall.png'),
    floor: require('../../assets/game/kenney-dungeon/floor.png'),
    stones: require('../../assets/game/kenney-dungeon/stones.png'),
    coin: require('../../assets/game/kenney-dungeon/coin.png'),
    column: require('../../assets/game/kenney-dungeon/column.png'),
  },
  audio: {
    uiTap: require('../../assets/audio/kenney-ui/ui-tap.ogg'),
    uiConfirm: require('../../assets/audio/kenney-ui/ui-confirm.ogg'),
  },
} as const;
