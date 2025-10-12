import React, {
  Suspense,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useContext,
  createContext,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { CameraControls, useGLTF, Stage, Html } from "@react-three/drei";
import * as THREE from "three";

const MeshContext = createContext([]);

function Annotation({ label, position, meshesToExclude = [], disableOcclusion = false  }) {
  const [isOccluded, setIsOccluded] = useState(false);
  const [occlusionEnabled] = useState(!disableOcclusion);
  const annotationGroupRef = useRef();
  const { camera } = useThree();
  const allSceneMeshes = useContext(MeshContext);

  const meshesToExcludeSet = useMemo(
    () => new Set(meshesToExclude),
    [meshesToExclude]
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const worldTargetPosition = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!annotationGroupRef.current || allSceneMeshes.length === 0) {
      setIsOccluded(false);
      return;
    }
    const intersectionTargets = allSceneMeshes.filter(
      (mesh) => !meshesToExcludeSet.has(mesh)
    );
    if (intersectionTargets.length === 0) return;

    annotationGroupRef.current.getWorldPosition(worldTargetPosition);
    const distanceToAnnotation =
      camera.position.distanceTo(worldTargetPosition);
    direction.subVectors(worldTargetPosition, camera.position).normalize();
    raycaster.set(camera.position, direction);
    const intersects = raycaster.intersectObjects(intersectionTargets, true);

    let occluded = false;
    if (intersects.length > 0) {
      if (intersects[0].distance < distanceToAnnotation - 0.01) {
        occluded = true;
      }
    }
    setIsOccluded(occluded);
  });

  console.log(occlusionEnabled)
  return (
    <group ref={annotationGroupRef} position={position}>
      <Html center zIndexRange={[100, 0]}>
        <div className={`annotation-container ${(isOccluded && occlusionEnabled) ? "occluded" : ""}`}>
          <div className="dot" />
          <div className="label-wrapper">
            <div className="line" />
            <div className="model-label annotation-label">{label}</div>
          </div>
        </div>
      </Html>
    </group>
  );
}

function Assembly({
  modelUrl,
  labelOffset,
  mainLabel,
  modelScale,
  controlsRef,
}) {
  const gltf = useGLTF(modelUrl);
  const [labels, setLabels] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [allMeshes, setAllMeshes] = useState([]);
  const [assemblyBounds, setAssemblyBounds] = useState(null);
  const isFitted = useRef(false);
  const { camera } = useThree();

  const findChildMeshes = useMemo(
    () => (object) => {
      const meshes = [];
      object.traverse((child) => {
        if (child.isMesh) meshes.push(child);
      });
      return meshes;
    },
    []
  );

  useLayoutEffect(() => {
    if (!gltf.scene || !controlsRef.current || !camera) return;

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    gltf.scene.scale.set(modelScale, modelScale, modelScale);
    gltf.scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(gltf.scene);
    setAssemblyBounds(box);

    if (!isFitted.current) {
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
      cameraDistance *= 1;

      const cameraY = center.y + size.y * 0.1;

      controlsRef.current.setLookAt(
        0,
        cameraY,
        center.z + cameraDistance,
        0,
        center.y - size.y * 0.5,
        center.z,
        true
      );

      controlsRef.current.saveState();
      isFitted.current = true;
    }

    const cleanName = (name, tag) => {
      return (
        name
          .replace(tag, "")
          .replace("--no-occlude", "")
          // ADDED FIX: Replace ae, oe, ue with ä, ö, ü
          .replace(/AE/g, "Ä").replace(/ae/g, "ä")
          .replace(/UE/g, "Ü").replace(/ue/g, "ü")
          .replace(/OE/g, "Ö").replace(/oe/g, "ö")
          .replace(/_/g, " ")
          .replace(/\s*<.*?>\s*/g, "")
          .trim()
      );
    };

    const extractedLabels = [],
      extractedAnnotations = [],
      allFoundMeshes = [];

    gltf.scene.traverse((node) => {
      if (node.isMesh && node.visible) allFoundMeshes.push(node);

      if (node.name.startsWith("_label_")) {
        const labelText = cleanName(node.name, "_label_");
        node.updateWorldMatrix(true, false);
        const nodeBox = new THREE.Box3().setFromObject(node);
        const center = new THREE.Vector3();
        nodeBox.getCenter(center);
        const position = [center.x, nodeBox.max.y + labelOffset, center.z];
        extractedLabels.push({ text: labelText, position });
      }

      if (node.name.startsWith("_ann_")) {
        const shouldDisableOcclusion = node.name.includes("--no-occlude");
        const labelText = cleanName(node.name, "_ann_");
        const position = new THREE.Vector3();
        node.getWorldPosition(position);
        const meshesToExclude = findChildMeshes(node);
        extractedAnnotations.push({
          label: labelText,
          position: position.toArray(),
          meshesToExclude,
          disableOcclusion: shouldDisableOcclusion,
        });
      }
    });
    setLabels(extractedLabels);
    setAnnotations(extractedAnnotations);
    setAllMeshes(allFoundMeshes);
  }, [gltf, labelOffset, findChildMeshes, modelScale, controlsRef, camera]);
  const mainLabelPosition = useMemo(() => {
    if (!assemblyBounds) return [0, 0, 0];
    const center = new THREE.Vector3();
    assemblyBounds.getCenter(center);
    return [center.x, assemblyBounds.max.y + labelOffset * 2, center.z];
  }, [assemblyBounds, labelOffset]);

  return (
    <MeshContext.Provider value={allMeshes}>
      <primitive object={gltf.scene} />
      {mainLabel && assemblyBounds && (
        <Html position={mainLabelPosition} zIndexRange={[100, 0]}>
          <div className="model-label main-label bottom-center">
            {mainLabel}
          </div>
        </Html>
      )}
      {labels.map((label, i) => (
        <Html
          key={`label-${i}`}
          position={label.position}
          zIndexRange={[100, 0]}
        >
          <div className="model-label main-label bottom-center">
            {label.text}
          </div>
        </Html>
      ))}
      {annotations.map((ann, i) => (
        <Annotation
          key={`ann-${i}`}
          label={ann.label}
          position={ann.position}
          meshesToExclude={ann.meshesToExclude}
          disableOcclusion={ann.disableOcclusion}
        />
      ))}
    </MeshContext.Provider>
  );
}

export default function AssemblyViewer({
  modelUrl,
  mainLabel,
  allowFloorClip = false,
  modelScale = 100,
  labelOffset = 0.4,
}) {
  const controlsRef = useRef();
  const [isViewChanged, setIsViewChanged] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(false);

  useEffect(() => {
    if (isViewChanged) {
      const timer = setTimeout(() => setIsButtonVisible(true), 10);
      return () => clearTimeout(timer);
    }
  }, [isViewChanged]);

  const handleControlStart = () => {
    if (!isViewChanged) {
      setIsViewChanged(true);
    }
  };

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset(true);
      setIsButtonVisible(false);
      setTimeout(() => {
        setIsViewChanged(false);
      }, 300);
    }
  };

  return (
    <div
      className="assembly-viewer-container"
      style={{ width: "100%", height: "500px", position: "relative" }}
    >
      {isViewChanged && (
        <button
          onClick={handleResetView}
          className={`reset-button ${isButtonVisible ? "visible" : ""}`}
          title="Reset View"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 0 24 24"
            width="24px"
            fill="white"
          >
            <path d="M0 0h24v24H0z" fill="none" />
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
        </button>
      )}
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputEncoding: THREE.sRGBEncoding,
        }}
        camera={{ position: [0, 2, 12], fov: 50 }}
      >
        <Suspense fallback={<Html center>Loading Model...</Html>}>
          <Stage
            environment="city"
            intensity={0.6}
            adjustCamera={false}
            shadows={{ type: "contact", opacity: 0.7, blur: 2 }}
          >
            <Assembly
              modelUrl={modelUrl}
              labelOffset={labelOffset}
              mainLabel={mainLabel}
              modelScale={modelScale}
              controlsRef={controlsRef}
            />
          </Stage>
        </Suspense>

        <CameraControls
          ref={controlsRef}
          makeDefault
          minPolarAngle={0}
          maxPolarAngle={allowFloorClip ? undefined : Math.PI / 2}
          mouseButtons-wheel={0}
          onControlStart={handleControlStart}
        />
      </Canvas>
      <style>{`
          .assembly-viewer-container .reset-button {
            position: absolute;
            top: 15px;
            right: 15px;
            z-index: 1000;
            width: 36px;
            height: 36px;
            background-color: rgba(30,30,30,0.85);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            
            /* --- Animation Properties --- */
            opacity: 0;
            transform: scale(0.9);
            transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
          }
          .assembly-viewer-container .reset-button.visible {
            opacity: 1;
            transform: scale(1);
          }
          .assembly-viewer-container .reset-button:hover {
            background-color: rgba(50,50,50,0.95);
          }
          .assembly-viewer-container .reset-button svg {
            width: 20px;
            height: 20px;
          }
          .assembly-viewer-container div { 
            margin-top: 0 !important; 
          }
          .model-label { color: #fff; background-color: rgba(30,30,30,0.9); padding:4px 10px; border-radius:4px; font-family:sans-serif; font-size:13px; font-weight:500; white-space:nowrap; pointer-events:none; box-shadow:0 2px 4px rgba(0,0,0,0.2); }
          .main-label { font-size:14px; background-color: rgba(20,20,20,0.95); }
          .bottom-center { transform: translate(-50%, -100%); }
          .annotation-container { pointer-events:none; }
          .dot { position:absolute; top:50%; left:50%; width:6px; height:6px; border:1px solid rgba(255,255,255,0.5); background-color:rgba(30,30,30,1); border-radius:50%; transform:translate(-50%,-50%); }
          .label-wrapper { position:absolute; top:50%; left:50%; transform:translate(3px, -50%); display:flex; flex-direction:row; align-items:center; }
          .line { width:40px; height:2px; background-color:rgba(30,30,30,0.9); margin-left: 0px; margin-right: 0px}
          .annotation-label { margin-top:0; }
          .occluded .model-label, .occluded .dot, .occluded .line { opacity: 0.2; transition: opacity 0.2s ease-in-out; }
        `}</style>
    </div>
  );
}
