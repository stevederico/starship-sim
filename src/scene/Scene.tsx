import { OrbitControls } from '@react-three/drei';
import { SHIP_CENTER_Z } from '../constants.ts';
import Earth from './Earth.tsx';
import SpaceRig from './SpaceRig.tsx';
import Starship from './Starship.tsx';
import { useShipTextures } from './useShipTextures.ts';

interface SceneProps {
  isBurning: boolean;
}

/** Orbital rig: space env, Earth, ship, sun. */
export default function Scene({ isBurning }: SceneProps) {
  const maps = useShipTextures();

  return (
    <>
      <SpaceRig map={maps.space} />
      <hemisphereLight args={['#c5d8ff', '#1a1208', 0.55]} />
      <ambientLight intensity={0.16} />
      <directionalLight position={[80, 55, 40]} intensity={4.4} color="#fff4e5" />
      <directionalLight position={[-40, 20, -20]} intensity={0.7} color="#8fb4ff" />
      <Earth map={maps.earth} />
      <group rotation={[Math.PI / 2, 0, 0.22]}>
        <Starship
          steelMap={maps.steel}
          tilesMap={maps.tiles}
          plumeMap={maps.plume}
          isBurning={isBurning}
        />
      </group>
      <OrbitControls
        makeDefault
        enablePan
        autoRotate={false}
        autoRotateSpeed={0.12}
        target={[0, 1, SHIP_CENTER_Z - 6]}
        minDistance={18}
        maxDistance={220}
        enableDamping
      />
    </>
  );
}
