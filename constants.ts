import { DatasetId, DatasetConfig } from './types';

export const DATASETS: Record<DatasetId, DatasetConfig> = {
  [DatasetId.Temperature]: {
    id: DatasetId.Temperature,
    name: 'Temperature Anomaly',
    description: 'Deviations from established patterns showing heatwaves and cold snaps.',
    unit: 'Δ°C',
    min: -5,
    max: 5,
    gradient: 'linear-gradient(to right, #3b82f6, #f3f4f6, #ef4444)',
  },
  [DatasetId.Vegetation]: {
    id: DatasetId.Vegetation,
    name: 'Vegetation Health',
    description: 'Vegetation density and health index.',
    unit: 'NDVI',
    min: 0,
    max: 1,
    gradient: 'linear-gradient(to right, transparent, #bef264, #15803d)',
  },
  [DatasetId.Precipitation]: {
    id: DatasetId.Precipitation,
    name: 'Heavy Precipitation',
    description: 'Rainfall accumulation volume.',
    unit: 'mm',
    min: 0,
    max: 50,
    gradient: 'linear-gradient(to right, transparent, #7dd3fc, #1e40af)',
  },
  [DatasetId.Clouds]: {
    id: DatasetId.Clouds,
    name: 'Cloud Volume',
    description: '3D Cloud cover simulation.',
    unit: '%',
    min: 0,
    max: 100,
    gradient: 'linear-gradient(to right, transparent, #ffffff)',
  }
};

// GLSL Noise functions and Main Shader Logic
export const VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  
  // Pass world position to fragment shader for consistent 3D noise sampling
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vPosition = worldPosition.xyz;
  
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const FRAGMENT_SHADER = `
uniform float uTime;
uniform float uDay;
uniform int uMode; // 0=Temp, 1=Veg, 2=Precip, 3=Cloud
uniform float uOpacity;
uniform float uThreshold;
uniform bool uIsCube;
uniform float uTimeLength;
uniform bool uIsSlice; // New uniform to toggle between 3D volume and 2D time slice

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// --- SIMPLEX NOISE 3D ---
// Standard efficient simplex noise implementation
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ ); 

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

// --- COLOR FUNCTIONS ---

vec4 getTemperatureColor(float val, float threshold) {
  // Normalize val (approx -1 to 1) to 0..1 for easier mapping
  float t = val * 0.5 + 0.5;
  
  // Diverging color map: Blue (Cold) -> White (Neutral) -> Red (Hot)
  vec3 cold = vec3(0.2, 0.4, 0.9);
  vec3 neutral = vec3(0.95, 0.95, 0.95);
  vec3 hot = vec3(0.9, 0.2, 0.2);
  
  // Filter out values close to neutral (0.5) based on threshold
  // Threshold 0.0 = show all
  // Threshold 0.9 = show only extreme
  float dist = abs(t - 0.5) * 2.0; // 0 at center, 1 at edges
  if (dist < threshold) discard;
  
  vec3 col = mix(cold, hot, t);
  
  // Make center more transparent
  float alpha = smoothstep(threshold, threshold + 0.2, dist);
  
  // Boost transparency near neutral slightly more for cleaner look
  if (dist < 0.2) alpha *= 0.5;
  
  return vec4(col, alpha);
}

vec4 getVegetationColor(float val, float threshold) {
  // Map -1..1 to 0..1
  float t = val * 0.5 + 0.5;
  if (t < threshold) discard;
  
  vec3 brown = vec3(0.8, 0.7, 0.4);
  vec3 green = vec3(0.1, 0.6, 0.2);
  
  vec3 col = mix(brown, green, t);
  float alpha = smoothstep(threshold, threshold + 0.2, t);
  return vec4(col, alpha);
}

vec4 getPrecipitationColor(float val, float threshold) {
  float t = val * 0.5 + 0.5;
  if (t < threshold) discard;
  
  vec3 light = vec3(0.7, 0.8, 0.9);
  vec3 heavy = vec3(0.1, 0.2, 0.8);
  
  vec3 col = mix(light, heavy, t);
  float alpha = smoothstep(threshold, threshold + 0.3, t);
  return vec4(col, alpha);
}

void main() {
  float scale = 2.0;
  float zCoord;
  
  // Calculate Z coordinate based on Mode (Slice vs Cube/Globe)
  if (uIsSlice) {
      // In Slice Mode, we ignore the mesh's Z position (it's a flat plane).
      // Instead, we sample the noise volume at the Z depth corresponding to uDay.
      
      // Calculate total Z size of the theoretical cube
      float boxSize = 2.5;
      float zSize = boxSize * uTimeLength;
      
      // Map uDay (0..365) to Z (-zSize/2 .. zSize/2)
      float normTime = uDay / 365.0;
      zCoord = -zSize/2.0 + normTime * zSize;
      
      // Apply the same Z scaling as the cube to match
      zCoord *= 0.8; 
  } else {
      zCoord = vPosition.z;
      
      if (!uIsCube) {
         // Globe Mode: Animate flow over the surface
         zCoord += uDay * 0.05; 
      } else {
         // Cube Mode: Static structure, but we scale Z to elongate time features
         zCoord *= 0.8; 
      }
  }

  // --- ADVECTION / WEATHER DRIFT ---
  // To make data look realistic (like weather fronts moving), 
  // we shift the X/Y coordinates based on Z (Time).
  // This creates "diagonal" tubes in the spacetime cube, representing movement.
  
  // Westerlies simulation: drift East (X+) as Time (Z+) increases
  float driftX = zCoord * 0.4; 
  // Meandering Jet Stream: slight Wave in Y based on Z
  float driftY = sin(zCoord * 1.5) * 0.1;
  
  vec3 noisePos = vec3(vPosition.x * scale - driftX, vPosition.y * scale + driftY, zCoord * scale);

  // --- FRACTAL NOISE ---
  float n1 = snoise(noisePos);
  float n2 = snoise(noisePos * 2.0 + vec3(5.2, 1.3, 0.8)) * 0.5;
  float n3 = snoise(noisePos * 4.0 + vec3(1.2, 5.2, 2.1)) * 0.25;
  
  // Combine octaves
  float val = (n1 + n2 + n3) / 1.75; // Normalize roughly back to -1..1 range

  // Apply user threshold
  // Threshold uniform is 0.0 to 1.0. 
  // We need to pass it to color functions which expect normalized input 0..1
  
  vec4 result = vec4(1.0);

  if (uMode == 0) {
      result = getTemperatureColor(val, uThreshold);
  } else if (uMode == 1) {
      result = getVegetationColor(val, uThreshold);
  } else if (uMode == 2) {
      result = getPrecipitationColor(val, uThreshold);
  } else if (uMode == 3) {
      // Cloud specific logic
      float t = val * 0.5 + 0.5;
      if (t < uThreshold) discard;
      float alpha = smoothstep(uThreshold, 1.0, t);
      result = vec4(1.0, 1.0, 1.0, alpha);
  }

  result.a *= uOpacity;
  
  // Simple fake lighting
  if (!uIsSlice) {
      // Make it look volumetric
      float light = 0.8 + 0.2 * (val * 0.5 + 0.5);
      result.rgb *= light;
  } else {
      // Brighter for the slice view
      result.rgb *= 1.1; 
  }

  gl_FragColor = result;
  
  #ifdef TRANSPARENT
    if (result.a < 0.01) discard;
  #endif
}
`;