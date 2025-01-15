export default class RayTracingShader{
    constructor(gl){
        // simple vertex shader for a fullscreen quad
        const vertexShader = `#version 300 es
        in vec2 aPosition;
        out vec2 vPosition;
        void main(){
            vPosition = aPosition;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
        `;

        // ray tracing fragment shader
        const fragmentShader = `#version 300 es
            precision highp float;

            #define MAX_LIGHTS 8
            #define MAX_SPHERES 16
            #define MAX_BOUNCES 4
            #define INFINITY 1e10
            #define EPSILON 1e-3

            struct Light {
                vec3 position;
                vec3 color;
                float intensity;
                bool isEnabled;
            };

            struct Sphere {
                vec3 center;
                float radius;
                vec3 color;
                float reflectivity;
                bool isLight;
            };

            struct Ray {
                vec3 origin;
                vec3 direction;
            };

            struct HitInfo {
                bool hit;
                float t;
                vec3 point;
                vec3 normal;
                Sphere sphere;
            };

            uniform Light uLights[MAX_LIGHTS];
            uniform int uLightCount;
            uniform Sphere uSpheres[MAX_SPHERES];
            uniform int uSphereCount;
            uniform vec3 uCameraPosition;
            uniform vec2 uResolution;
            uniform mat4 uViewMatrix;
            uniform float uSpecularIntensity;
            uniform float uSpecularShininess;

            uniform int uDebugMode;

            out vec4 fragColor;

            // calculations for point light influence
            float calculateLightInfluence(vec3 point, Light light) {
                float distance = length(light.position - point);
                float falloff = 1.0 / (1.0 + 0.09 * distance + 0.032 * distance * distance);
                
                // soft area of influence around lights
                float radiusOfInfluence = light.intensity * 10.0;
                float influence = smoothstep(radiusOfInfluence, 0.0, distance);
                
                return falloff * influence * light.intensity;
            }

            // ray - sphere intersection calculation
            HitInfo intersectSphere(Ray ray, Sphere sphere) {
                HitInfo hit;
                hit.hit = false;
                hit.sphere = sphere;
                
                vec3 oc = ray.origin - sphere.center;
                float a = dot(ray.direction, ray.direction);
                float b = 2.0 * dot(oc, ray.direction);
                float c = dot(oc, oc) - sphere.radius * sphere.radius;
                float discriminant = b * b - 4.0 * a * c;
                
                if (discriminant > 0.0) {
                    float t = (-b - sqrt(discriminant)) / (2.0 * a);
                    if (t > EPSILON) {
                        hit.hit = true;
                        hit.t = t;
                        hit.point = ray.origin + t * ray.direction;
                        hit.normal = normalize(hit.point - sphere.center);
                        return hit;
                    }
                }
                return hit;
            }

            // find closest intersection
            HitInfo findClosestIntersection(Ray ray) {
                HitInfo closestHit;
                closestHit.hit = false;
                closestHit.t = INFINITY;
                
                for (int i = 0; i < uSphereCount; i++) {
                    HitInfo currentHit = intersectSphere(ray, uSpheres[i]);
                    if (currentHit.hit && currentHit.t < closestHit.t) {
                        closestHit = currentHit;
                    }
                }
                
                return closestHit;
            }

            // shadow calculation
            bool isInShadow(vec3 point, vec3 lightDir, float lightDistance) {
                Ray shadowRay;
                shadowRay.origin = point + lightDir * EPSILON;
                shadowRay.direction = lightDir;
                
                HitInfo shadowHit = findClosestIntersection(shadowRay);
                return shadowHit.hit && shadowHit.t < lightDistance;
            }

            // phong lighting calculation (ambient, specular and diffuse lighting)
            vec3 calculatePhongLighting(HitInfo hit, vec3 viewDir) {
                vec3 ambient = vec3(0.2);
                vec3 diffuse = vec3(0.0);
                vec3 specular = vec3(0.0);
                vec3 glow = vec3(0.0);
                float shininess = 32.0;
                
                for (int i = 0; i < uLightCount; i++) {
                    if (!uLights[i].isEnabled) continue;
                    
                    vec3 lightDir = normalize(uLights[i].position - hit.point);
                    float lightDistance = length(uLights[i].position - hit.point);

                    float influence = calculateLightInfluence(hit.point, uLights[i]);

                    // volumetric glow effect
                    float glowStrength = influence * 0.5;
                    glow += uLights[i].color * glowStrength;
                    
                    bool inShadow = isInShadow(hit.point, lightDir, lightDistance);
        
                    if (!inShadow) {
                        float diff = max(dot(hit.normal, lightDir), 0.0);
                        vec3 reflectDir = reflect(-lightDir, hit.normal);
                        float spec = pow(max(dot(viewDir, reflectDir), 0.0), uSpecularShininess);
                        
                        diffuse += diff * uLights[i].color * influence;
                        specular += spec * uLights[i].color * influence * uSpecularIntensity;
                    }
                }
                
                // Combine all lighting components
                vec3 finalColor = (ambient + diffuse) * hit.sphere.color + specular;
                // Add glow as an additive effect
                finalColor += glow * 0.3;
                
                return finalColor;
            }

            // ray tracing with reflections
            vec3 traceRay(Ray initialRay) {
                vec3 finalColor = vec3(0.0);
                vec3 throughput = vec3(1.0);
                Ray currentRay = initialRay;
                
                for (int bounce = 0; bounce < MAX_BOUNCES; bounce++) {
                    HitInfo hit = findClosestIntersection(currentRay);
                    if (!hit.hit){
                        float t = currentRay.direction.y * 0.5 + 0.5;
                        vec3 skyColor = mix(vec3(0.6, 0.8, 1.0), vec3(0.4, 0.6, 1.0), t);
                        finalColor += throughput * skyColor * 0.3;
                        break;
                    }
                    
                    if (hit.sphere.isLight) {
                        finalColor += throughput * hit.sphere.color * hit.sphere.reflectivity;
                        break;
                    }
                    
                    vec3 viewDir = normalize(-currentRay.direction);
                    vec3 directLight = calculatePhongLighting(hit, viewDir);
                    finalColor += throughput * directLight;
                    
                    if (hit.sphere.reflectivity <= 0.0) break;
                    
                    throughput *= hit.sphere.reflectivity;
                    vec3 reflectDir = reflect(currentRay.direction, hit.normal);
                    currentRay.origin = hit.point + hit.normal * EPSILON;
                    currentRay.direction = reflectDir;

                    throughput *= 0.8; // energy loss at each bounce
                }
                
                return finalColor;
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
                uv.x *= uResolution.x / uResolution.y;
                
                Ray ray;
                ray.origin = uCameraPosition;

                // Modified ray direction calculation
                vec3 forward = normalize(vec3(0.0, 0.0, -1.0));  // Default forward direction
                vec3 right = normalize(vec3(1.0, 0.0, 0.0));     // World right vector
                vec3 up = normalize(vec3(0.0, 1.0, 0.0));        // World up vector
                
                // Construct ray direction in camera space
                ray.direction = normalize(forward + right * uv.x + up * uv.y);
                
                // Transform by view matrix
                // Note: we're now logging the direction before and after transformation
                vec3 originalDir = ray.direction;
                ray.direction = (uViewMatrix * vec4(ray.direction, 0.0)).xyz;
                ray.direction = normalize(ray.direction);
                
                // Debug visualization for ray direction
                if(uDebugMode == 1) {
                    // Visualize the final ray direction
                    fragColor = vec4(ray.direction * 0.5 + 0.5, 1.0);
                    return;
                }

                // Get initial intersection for debug purposes
                HitInfo firstHit = findClosestIntersection(ray);
                
                // Debug intersection test
                if(uDebugMode == 3) {
                    // Add some color variation based on ray direction to help visualize
                    vec3 debugColor = firstHit.hit ? 
                        (originalDir * 0.5 + 0.5) : // Use original direction for variation
                        vec3(0.0);                  // Black for no hit
                    fragColor = vec4(debugColor, 1.0);
                    return;
                }
                
                // Normal render mode
                vec3 color = traceRay(ray);
                color = color / (color + vec3(1.0)); // Tone mapping
                fragColor = vec4(color, 1.0);



    
            }

        `;

        this.gl = gl;
        this.program = this.initShader(vertexShader, fragmentShader);

        if(this.program){
            this.initializeUniforms();
            this.initializeQuadBuffer();
        }

        this.debugMode = 0;
    }

    initializeUniforms(){
        this.uniformLocations = {
            cameraPosition: this.gl.getUniformLocation(this.program, 'uCameraPosition'),
            resolution: this.gl.getUniformLocation(this.program, 'uResolution'),
            sphereCount: this.gl.getUniformLocation(this.program, 'uSphereCount'),
            lightCount: this.gl.getUniformLocation(this.program, 'uLightCount'),
            viewMatrix: this.gl.getUniformLocation(this.program, 'uViewMatrix'),
            debugMode: this.gl.getUniformLocation(this.program, 'uDebugMode')
        };

        this.sphereLocations = [];
        for (let i = 0; i < 16; i++) {
            this.sphereLocations.push({
                center: this.gl.getUniformLocation(this.program, `uSpheres[${i}].center`),
                radius: this.gl.getUniformLocation(this.program, `uSpheres[${i}].radius`),
                color: this.gl.getUniformLocation(this.program, `uSpheres[${i}].color`),
                reflectivity: this.gl.getUniformLocation(this.program, `uSpheres[${i}].reflectivity`),
                isLight: this.gl.getUniformLocation(this.program, `uSpheres[${i}].isLight`)
            });
        }

        this.lightLocations = [];
        for (let i = 0; i < 8; i++) {
            this.lightLocations.push({
                position: this.gl.getUniformLocation(this.program, `uLights[${i}].position`),
                color: this.gl.getUniformLocation(this.program, `uLights[${i}].color`),
                intensity: this.gl.getUniformLocation(this.program, `uLights[${i}].intensity`),
                isEnabled: this.gl.getUniformLocation(this.program, `uLights[${i}].isEnabled`)
            });
        }
    }

    setDebugMode(mode) {
        this.debugMode = mode;
        this.gl.uniform1i(this.uniformLocations.debugMode, mode);
    }

    initializeQuadBuffer(){
        const quadVertices = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0,
        ]);
        
        this.quadBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);
    }

    initShader(vertexShader, fragmentShader){
        const vert = this.loadShader(this.gl.VERTEX_SHADER, vertexShader);
        if(!vert){
            console.error("vert err");
            return null;
        }
        const frag = this.loadShader(this.gl.FRAGMENT_SHADER, fragmentShader);
        if(!frag){
            console.error("frag err");
            return null;
        }

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vert);
        this.gl.attachShader(program, frag);
        this.gl.linkProgram(program);

        if(!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)){
            console.error("No se pudo inicializar el programa de shader: ", this.gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    loadShader(type, source){
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)){
            console.error(`Falló la compilación del shader: ${this.gl.getShaderInfoLog(shader)}`);
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    use(){
        this.gl.useProgram(this.program);
    }

    setCameraPosition(position){
        this.gl.uniform3fv(this.uniformLocations.cameraPosition, position);
    }

    setResolution(width, height){
        this.gl.uniform2f(this.uniformLocations.resolution, width, height);
    }

    setSpheres(spheres){
        this.gl.uniform1i(this.uniformLocations.sphereCount, spheres.length);
        
        spheres.forEach((sphere, i) => {
            if(i >= 16) return;

            const locations = this.sphereLocations[i];
            this.gl.uniform3fv(locations.center, sphere.center);
            this.gl.uniform1f(locations.radius, sphere.radius);
            this.gl.uniform3fv(locations.color, sphere.color);
            this.gl.uniform1f(locations.reflectivity, sphere.reflectivity);
            this.gl.uniform1i(locations.isLight, sphere.isLight ? 1 : 0);
        });
    }

    setLights(lights) {
        this.gl.uniform1i(this.uniformLocations.lightCount, lights.length);
        
        lights.forEach((light, i) => {
            if (i >= 8) return; 
            
            const locations = this.lightLocations[i];
            this.gl.uniform3fv(locations.position, light.position);
            this.gl.uniform3fv(locations.color, light.color);
            this.gl.uniform1f(locations.intensity, light.intensity);
            this.gl.uniform1i(locations.isEnabled, light.isEnabled ? 1 : 0);
        });
    }

    renderFullscreenQuad() {
        const positionLoc = this.gl.getAttribLocation(this.program, 'aPosition');
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
        this.gl.enableVertexAttribArray(positionLoc);
        this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

}
