import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Controls } from '../types';
import { Sound } from './Sound';

export class Game {
    private renderer: any;
    private scene: any;
    private camera: any;
    private world: any;
    private car: { body: any; vehicle: any; mesh: any; wheelMeshes: any[]; };
    private controls: Controls = { forward: false, backward: false, left: false, right: false, handbrake: false };
    private animationFrameId: number = 0;
    private sound: Sound;

    private setScore: React.Dispatch<React.SetStateAction<number>>;
    private setDriftScore: React.Dispatch<React.SetStateAction<number>>;
    private driftState = { active: false, score: 0, angle: 0 };
    
    // Camera control state
    private mouse = { x: 0, y: 0, isDown: false };
    private cameraOffset = new THREE.Vector3(0, 5, -10);

    // Skid marks
    private skidmarksCanvas: HTMLCanvasElement;
    private skidmarksTexture: any;
    private skidmarksContext: CanvasRenderingContext2D | null;

    // Particles
    private particleSystems: any[] = [];

    constructor(
        private canvas: HTMLCanvasElement, 
        setScore: React.Dispatch<React.SetStateAction<number>>,
        setDriftScore: React.Dispatch<React.SetStateAction<number>>,
        sound: Sound
    ) {
        this.setScore = setScore;
        this.setDriftScore = setDriftScore;
        this.sound = sound;
        
        this.skidmarksCanvas = document.createElement('canvas');
        this.skidmarksCanvas.width = 2048;
        this.skidmarksCanvas.height = 2048;
        this.skidmarksContext = this.skidmarksCanvas.getContext('2d');
    }

    public init() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x34495e);
        this.scene.fog = new THREE.Fog(0x34495e, 50, 200);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.scene.add(this.camera);

        // Physics World
        this.world = new CANNON.World();
        this.world.gravity.set(0, -20, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.solver.iterations = 10;
        
        // Materials
        const groundMaterial = new CANNON.Material('ground');
        const wheelMaterial = new CANNON.Material('wheel');
        const carBodyMaterial = new CANNON.Material('carBody');
        const wallMaterial = new CANNON.Material('wall');

        this.world.addContactMaterial(new CANNON.ContactMaterial(wheelMaterial, groundMaterial, { friction: 0.6, restitution: 0, contactEquationStiffness: 1e8, contactEquationRelaxation: 3 }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(carBodyMaterial, groundMaterial, { friction: 0.1, restitution: 0.2 }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(carBodyMaterial, wallMaterial, { friction: 0.1, restitution: 0.5 }));


        // Environment
        this.createEnvironment(groundMaterial, wallMaterial);

        // Car
        this.createCar(carBodyMaterial, wheelMaterial);

        // Lights
        this.createLights();

        // Event Listeners
        window.addEventListener('resize', this.onWindowResize);
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);

        // Start animation loop
        this.animate();
    }
    
    private createEnvironment = (groundMaterial: any, wallMaterial: any) => {
        // Ground
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.receiveShadow = true;
        this.scene.add(groundMesh);

        const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
        groundBody.addShape(new CANNON.Plane());
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);

        // Skidmarks Plane
        this.skidmarksTexture = new THREE.CanvasTexture(this.skidmarksCanvas);
        const skidmarksGeo = new THREE.PlaneGeometry(200, 200);
        const skidmarksMat = new THREE.MeshBasicMaterial({ map: this.skidmarksTexture, transparent: true, blending: THREE.AdditiveBlending });
        const skidmarksMesh = new THREE.Mesh(skidmarksGeo, skidmarksMat);
        skidmarksMesh.rotation.x = -Math.PI / 2;
        skidmarksMesh.position.y = 0.01;
        this.scene.add(skidmarksMesh);

        // Obstacles
        const boxGeo = new THREE.BoxGeometry(5, 5, 5);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x1abc9c, roughness: 0.5 });
        const positions = [[-20, 2.5, -20], [30, 2.5, 40], [-40, 2.5, 30]];
        positions.forEach(pos => {
            const boxMesh = new THREE.Mesh(boxGeo, boxMat);
            boxMesh.position.set(pos[0], pos[1], pos[2]);
            boxMesh.castShadow = true;
            this.scene.add(boxMesh);

            const boxShape = new CANNON.Box(new CANNON.Vec3(2.5, 2.5, 2.5));
            const boxBody = new CANNON.Body({ mass: 0, material: wallMaterial, position: new CANNON.Vec3(pos[0], pos[1], pos[2])});
            boxBody.addShape(boxShape);
            this.world.addBody(boxBody);
        });
    };
    
    private createCar = (bodyMaterial: any, wheelMaterial: any) => {
        const chassisShape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 1));
        const chassisBody = new CANNON.Body({ mass: 150, material: bodyMaterial });
        chassisBody.addShape(chassisShape);
        chassisBody.position.set(0, 4, 0);
        
        const vehicle = new CANNON.RaycastVehicle({
            chassisBody: chassisBody,
            indexRightAxis: 0, // x
            indexUpAxis: 1, // y
            indexForwardAxis: 2 // z
        });

        const wheelOptions = {
            radius: 0.5,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30,
            suspensionRestLength: 0.3,
            frictionSlip: 5,
            dampingRelaxation: 2.3,
            dampingCompression: 4.4,
            maxSuspensionForce: 100000,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: -30,
            useCustomSlidingRotationalSpeed: true
        };

        // Front left
        wheelOptions.chassisConnectionPointLocal.set(1.5, 0, 1);
        vehicle.addWheel(wheelOptions);
        // Front right
        wheelOptions.chassisConnectionPointLocal.set(-1.5, 0, 1);
        vehicle.addWheel(wheelOptions);
        // Rear left
        wheelOptions.chassisConnectionPointLocal.set(1.5, 0, -1);
        vehicle.addWheel(wheelOptions);
        // Rear right
        wheelOptions.chassisConnectionPointLocal.set(-1.5, 0, -1);
        vehicle.addWheel(wheelOptions);

        vehicle.addToWorld(this.world);

        // Car 3D model
        const carMesh = new THREE.Group();
        const chassisGeo = new THREE.BoxGeometry(4, 1, 2);
        const chassisMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3, metalness: 0.2 });
        const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
        chassisMesh.castShadow = true;
        carMesh.add(chassisMesh);
        
        const cabinGeo = new THREE.BoxGeometry(2.5, 0.8, 1.8);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.1 });
        const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
        cabinMesh.position.set(0, 0.9, 0);
        cabinMesh.castShadow = true;
        carMesh.add(cabinMesh);

        const wheelMeshes: any[] = [];
        const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        
        vehicle.wheelInfos.forEach(() => {
            const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
            wheelMesh.rotation.x = Math.PI / 2;
            wheelMesh.castShadow = true;
            wheelMeshes.push(wheelMesh);
            this.scene.add(wheelMesh);
        });
        
        this.scene.add(carMesh);
        this.car = { body: chassisBody, vehicle, mesh: carMesh, wheelMeshes };

        // Create particle systems for rear wheels
        this.particleSystems.push(this.createParticleSystem(), this.createParticleSystem());
        this.scene.add(this.particleSystems[0]);
        this.scene.add(this.particleSystems[1]);
    };

    private createParticleSystem = () => {
        const particleCount = 100;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for(let i=0; i<particleCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 0.1;
            colors[i] = 1.0;
        }

        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const particleSystem = new THREE.Points(particles, particleMaterial);
        particleSystem.visible = false;
        (particleSystem as any).userData.velocities = new Float32Array(particleCount * 3);
        return particleSystem;
    }

    private updateParticles = (system: any, wheelWorldPos: any, isDrifting: boolean) => {
        system.visible = isDrifting;
        if (!isDrifting) return;

        const positions = system.geometry.attributes.position.array;
        const velocities = system.userData.velocities;
        
        for (let i = 0; i < positions.length; i+=3) {
            positions[i] += velocities[i];
            positions[i+1] += velocities[i+1];
            positions[i+2] += velocities[i+2];

            // Reset particle
            if (Math.abs(positions[i]) > 2 || Math.abs(positions[i+1]) > 2 || Math.abs(positions[i+2]) > 2) {
                positions[i] = 0;
                positions[i+1] = 0;
                positions[i+2] = 0;
                velocities[i] = (Math.random() - 0.5) * 0.05;
                velocities[i+1] = (Math.random()) * 0.05;
                velocities[i+2] = (Math.random() - 0.5) * 0.05;
            }
        }
        system.position.copy(wheelWorldPos);
        system.geometry.attributes.position.needsUpdate = true;
    }

    private drawSkidmark = (wheelWorldPos: any, intensity: number) => {
        if (!this.skidmarksContext) return;
        const x = (wheelWorldPos.x / 100 + 0.5) * this.skidmarksCanvas.width;
        const y = (-wheelWorldPos.z / 100 + 0.5) * this.skidmarksCanvas.height;

        this.skidmarksContext.fillStyle = `rgba(0, 0, 0, ${Math.min(0.2, intensity * 0.5)})`;
        this.skidmarksContext.beginPath();
        this.skidmarksContext.arc(x, y, 4 * intensity, 0, Math.PI * 2);
        this.skidmarksContext.fill();
        this.skidmarksTexture.needsUpdate = true;
    }
    
    private createLights = () => {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 30, -25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
    };

    private updateCar = () => {
        const { vehicle, body } = this.car;
        const maxSteerVal = 0.5;
        const maxForce = 1000;
        const brakeForce = 100;
        
        let engineForce = 0;
        let steeringValue = 0;
        
        if (this.controls.forward) engineForce = -maxForce;
        if (this.controls.backward) engineForce = maxForce / 2;
        
        if (this.controls.left) steeringValue = maxSteerVal;
        if (this.controls.right) steeringValue = -maxSteerVal;

        vehicle.setSteeringValue(steeringValue, 0);
        vehicle.setSteeringValue(steeringValue, 1);
        
        // Front wheel drive
        vehicle.applyEngineForce(engineForce, 0);
        vehicle.applyEngineForce(engineForce, 1);

        // Handbrake
        if (this.controls.handbrake) {
            vehicle.setBrake(brakeForce, 2);
            vehicle.setBrake(brakeForce, 3);
            vehicle.wheelInfos[2].frictionSlip = 0.5;
            vehicle.wheelInfos[3].frictionSlip = 0.5;
        } else {
            vehicle.setBrake(0, 2);
            vehicle.setBrake(0, 3);
            vehicle.wheelInfos[2].frictionSlip = 5;
            vehicle.wheelInfos[3].frictionSlip = 5;
        }

        // Drifting logic
        const carVelocity = body.velocity;
        const carSpeed = carVelocity.length();
        this.sound.updateEngineSound(carSpeed);

        let isDrifting = false;
        if (carSpeed > 5) {
            const forwardVector = new CANNON.Vec3(0, 0, -1);
            body.quaternion.vmult(forwardVector, forwardVector);
            const dot = forwardVector.dot(carVelocity.unit());
            const angle = Math.acos(Math.min(Math.max(dot, -1), 1));
            
            this.driftState.angle = angle;
            
            if (angle > 0.4 || (this.controls.handbrake && carSpeed > 8)) {
                isDrifting = true;
                this.driftState.score += (1 + angle * 5) * (carSpeed / 10);
            }
        }
        
        if (isDrifting) {
            if (!this.driftState.active) {
                this.driftState.active = true;
                this.sound.playSkidSound();
            }
            this.setDriftScore(this.driftState.score);
        } else {
            if (this.driftState.active) {
                this.driftState.active = false;
                this.sound.stopSkidSound();
                if (this.driftState.score > 50) {
                    this.setScore(prev => prev + this.driftState.score);
                }
                this.driftState.score = 0;
                this.setDriftScore(0);
            }
        }
        
        // Update wheel meshes and effects
        for (let i = 0; i < vehicle.wheelInfos.length; i++) {
            vehicle.updateWheelTransform(i);
            const t = vehicle.wheelInfos[i].worldTransform;
            this.car.wheelMeshes[i].position.copy(t.position);
            this.car.wheelMeshes[i].quaternion.copy(t.quaternion);

            // Update rear wheel effects
            if(i >= 2) {
                const wheelWorldPos = t.position;
                const particleSystem = this.particleSystems[i-2];
                this.updateParticles(particleSystem, wheelWorldPos, isDrifting && carSpeed > 8);

                if (isDrifting && carSpeed > 8) {
                    this.drawSkidmark(wheelWorldPos, this.driftState.angle);
                }
            }
        }
    }

    private updateCamera = () => {
        const carPosition = this.car.mesh.position;
        
        const rotatedOffset = this.cameraOffset.clone();
        rotatedOffset.applyAxisAngle(new THREE.Vector3(0,1,0), this.mouse.x * Math.PI * 2);
        
        const desiredPosition = carPosition.clone().add(rotatedOffset);
        this.camera.position.lerp(desiredPosition, 0.1);
        
        this.camera.lookAt(carPosition);
    }

    private animate = () => {
        this.animationFrameId = requestAnimationFrame(this.animate);
        
        const dt = 1 / 60;
        this.world.step(dt);

        this.updateCar();
        
        // Sync 3D model with physics body
        this.car.mesh.position.copy(this.car.body.position);
        this.car.mesh.quaternion.copy(this.car.body.quaternion);

        this.updateCamera();

        this.renderer.render(this.scene, this.camera);
    };

    public updateControl(control: keyof Controls, value: boolean) {
        this.controls[control] = value;
    }

    public resetCar = () => {
        this.car.body.position.set(0, 4, 0);
        this.car.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), 0);
        this.car.body.velocity.set(0, 0, 0);
        this.car.body.angularVelocity.set(0, 0, 0);
        if(this.skidmarksContext) {
            this.skidmarksContext.clearRect(0, 0, this.skidmarksCanvas.width, this.skidmarksCanvas.height);
            this.skidmarksTexture.needsUpdate = true;
        }
    };
    
    private onWindowResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    private onMouseDown = (event: MouseEvent) => {
        this.mouse.isDown = true;
    };
    private onMouseMove = (event: MouseEvent) => {
        if(this.mouse.isDown) {
            this.mouse.x += event.movementX * 0.002;
        }
    };
    private onMouseUp = (event: MouseEvent) => {
        this.mouse.isDown = false;
    };

    public destroy = () => {
        cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('resize', this.onWindowResize);
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);

        // Dispose Three.js objects
        this.scene.traverse((object: any) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if(Array.isArray(object.material)) {
                    object.material.forEach((material: any) => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        this.renderer.dispose();
    };
}