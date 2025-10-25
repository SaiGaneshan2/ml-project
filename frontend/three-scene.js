// Three.js 3D Scene for Wind Turbine Damage Detection
class ThreeScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.turbine = null;
        this.particles = [];
        this.animationId = null;
        this.time = 0;
        
        this.init();
    }
    
    init() {
        // Get canvas element
        const canvas = document.getElementById('three-canvas');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0a0a, 50, 200);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 15);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x0a0a0a, 0.8);
        
        // Add controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;
        
        // Create lighting
        this.createLighting();
        
        // Create wind turbine
        this.createWindTurbine();
        
        // Create particle system
        this.createParticles();
        
        // Create environment
        this.createEnvironment();
        
        // Start animation loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0x00d4ff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);
        
        // Point light for glow effect
        const pointLight = new THREE.PointLight(0x00d4ff, 0.5, 30);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);
    }
    
    createWindTurbine() {
        this.turbine = new THREE.Group();
        
        // Tower
        const towerGeometry = new THREE.CylinderGeometry(0.3, 0.5, 12, 8);
        const towerMaterial = new THREE.MeshLambertMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.9
        });
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.y = 6;
        tower.castShadow = true;
        this.turbine.add(tower);
        
        // Nacelle (top housing)
        const nacelleGeometry = new THREE.BoxGeometry(2, 1, 1.5);
        const nacelleMaterial = new THREE.MeshLambertMaterial({
            color: 0x444444
        });
        const nacelle = new THREE.Mesh(nacelleGeometry, nacelleMaterial);
        nacelle.position.set(0, 12.5, 0);
        nacelle.castShadow = true;
        this.turbine.add(nacelle);
        
        // Hub
        const hubGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
        const hubMaterial = new THREE.MeshLambertMaterial({
            color: 0x333333
        });
        const hub = new THREE.Mesh(hubGeometry, hubMaterial);
        hub.position.set(1.2, 12.5, 0);
        hub.castShadow = true;
        this.turbine.add(hub);
        
        // Blades
        this.createBlades();
        
        this.scene.add(this.turbine);
    }
    
    createBlades() {
        const bladeGroup = new THREE.Group();
        bladeGroup.position.set(1.2, 12.5, 0);
        
        for (let i = 0; i < 3; i++) {
            const bladeGeometry = new THREE.BoxGeometry(0.1, 0.3, 4);
            const bladeMaterial = new THREE.MeshLambertMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.8
            });
            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            
            blade.rotation.z = (i * 120) * Math.PI / 180;
            blade.position.x = 2;
            blade.castShadow = true;
            
            bladeGroup.add(blade);
        }
        
        this.turbine.add(bladeGroup);
        this.bladeGroup = bladeGroup;
    }
    
    createParticles() {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions
            positions[i3] = (Math.random() - 0.5) * 100;
            positions[i3 + 1] = Math.random() * 50;
            positions[i3 + 2] = (Math.random() - 0.5) * 100;
            
            // Random colors (blue to cyan)
            const color = new THREE.Color();
            color.setHSL(0.5 + Math.random() * 0.1, 0.8, 0.6);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }
    
    createEnvironment() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({
            color: 0x0a0a0a,
            transparent: true,
            opacity: 0.3
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add some distant wind turbines
        for (let i = 0; i < 3; i++) {
            const distantTurbine = this.turbine.clone();
            distantTurbine.scale.set(0.3, 0.3, 0.3);
            distantTurbine.position.set(
                (Math.random() - 0.5) * 80,
                0,
                (Math.random() - 0.5) * 80
            );
            this.scene.add(distantTurbine);
        }
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.time += 0.01;
        
        // Rotate blades
        if (this.bladeGroup) {
            this.bladeGroup.rotation.y += 0.02;
        }
        
        // Animate particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(this.time + positions[i]) * 0.01;
                if (positions[i + 1] > 50) {
                    positions[i + 1] = 0;
                }
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Update controls
        this.controls.update();
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Method to trigger detection animation
    triggerDetectionAnimation() {
        if (this.turbine) {
            // Add a pulsing effect to the turbine
            const originalScale = this.turbine.scale.x;
            let scale = originalScale;
            let growing = true;
            
            const pulseAnimation = () => {
                if (growing) {
                    scale += 0.01;
                    if (scale > originalScale * 1.2) growing = false;
                } else {
                    scale -= 0.01;
                    if (scale < originalScale) {
                        scale = originalScale;
                        growing = true;
                        return; // Stop animation
                    }
                }
                
                this.turbine.scale.set(scale, scale, scale);
                requestAnimationFrame(pulseAnimation);
            };
            
            pulseAnimation();
        }
    }
    
    // Method to change turbine color based on detection results
    updateTurbineColor(detectionType) {
        if (this.turbine && this.bladeGroup) {
            const color = detectionType === 'damage' ? 0xff6b6b : 0xffa500;
            
            this.bladeGroup.children.forEach(blade => {
                blade.material.color.setHex(color);
            });
            
            // Reset color after 3 seconds
            setTimeout(() => {
                this.bladeGroup.children.forEach(blade => {
                    blade.material.color.setHex(0x00d4ff);
                });
            }, 3000);
        }
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.onWindowResize);
    }
}

// Initialize the 3D scene when the page loads
let threeScene;
window.addEventListener('load', () => {
    threeScene = new ThreeScene();
});
